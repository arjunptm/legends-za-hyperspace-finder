// Matching is local to the browser. Preserve form identities from source sprite keys.
export function normName(name) {
  return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

// Serebii's sprite suffix is not always a regional form: e.g. Rotom-h is
// Heat Rotom, and Vivillon-g is a pattern. Whitelist actual regional species.
const REGIONAL={
  a:{label:'Alolan',species:new Set(['Raichu','Meowth','Persian','Marowak'])},
  g:{label:'Galarian',species:new Set(["Farfetch'd",'Meowth','Mr. Mime','Slowbro','Slowking','Slowpoke','Stunfisk','Yamask'])},
  h:{label:'Hisuian',species:new Set(['Avalugg','Goodra','Qwilfish','Sliggoo'])}
};
function region(member){
  const suffix=String(member?.form||'').split('-').at(-1);
  const r=REGIONAL[suffix];
  return r?.species.has(member?.name)?r.label:'';
}
export function displayName(member) {
  if(!member)return '';
  const prefix=region(member);
  return prefix?`${prefix} ${member.name}`:String(member.name||'');
}
export function matchesMember(member,requested){
  const query=normName(requested);
  if(!query)return false;
  // A bare species name intentionally includes all forms. Explicit regional
  // names match only their own suffix, not standard or other regional forms.
  return query===normName(member.name)||query===normName(displayName(member))||
    Boolean(region(member)&&query===normName(`${member.name} (${region(member)})`));
}

// Strong match: each preview belongs to a different independently defined group.
export function assignPreviews(groups, previews) {
  const names=previews.map(normName).filter(Boolean);
  const used=new Set();const slots=[];
  function solve(i) {
    if(i===names.length)return [...slots];
    for(let j=0;j<groups.length;j++){
      if(used.has(j) || !(groups[j].members||[]).some(m=>matchesMember(m,names[i])))continue;
      used.add(j);slots[i]=Number(groups[j].slot)||j+1;
      const result=solve(i+1);if(result)return result;
      used.delete(j);
    }
    return null;
  }
  return solve(0);
}

// More tentative: distinct preview species/forms can be selected from the complete
// recorded spawn pool even if two share a cluster. Never mark as a confirmed match.
export function assignFromPool(groups, previews) {
  const names=previews.map(normName).filter(Boolean);
  const pool=groups.flatMap((g,i)=>(g.members||[]).map((m,j)=>({member:m,slot:Number(g.slot)||i+1,key:`${i}:${j}`})));
  const used=new Set();const slots=[];
  function solve(i) {
    if(i===names.length)return [...slots];
    for(const item of pool){
      if(used.has(item.key)||!matchesMember(item.member,names[i]))continue;
      used.add(item.key);slots[i]=item.slot;
      const result=solve(i+1);if(result)return result;
      used.delete(item.key);
    }
    return null;
  }
  return solve(0);
}

export function classifyZone(zone, previews) {
  const names=previews.map(normName).filter(Boolean);
  if(!names.length)return null;
  if(zone.status!=='possible' && zone.groups?.length===3){
    const distinct=assignPreviews(zone.groups,names);
    if(distinct)return {quality:zone.status==='warning'?'warning':'matched',slots:distinct,hitCount:names.length};
    const pooled=assignFromPool(zone.groups,names);
    if(pooled)return {quality:'pool',slots:pooled,hitCount:names.length};
    return null;
  }
  // Special-zone assignments are incomplete. A shared source-pool name is only
  // a possible lead, not a guaranteed slot match.
  const available=[...(zone.unassigned||[]),...(zone.focus||[])];
  const hitCount=names.filter(name=>available.some(m=>matchesMember(m,name))).length;
  return hitCount?{quality:'possible',slots:[],hitCount}:null;
}

export function searchZones(zones,{previews,type='all',star='all'}){
  const names=previews.map(normName).filter(Boolean);
  if(!names.length)return [];
  return zones.flatMap(zone=>{
    if(type!=='all'&&zone.type!==type)return [];
    if(star!=='all'&&String(zone.star)!==String(star))return [];
    const hit=classifyZone(zone,names);
    return hit?[{zone,...hit}]:[];
  }).sort((a,b)=>{
    const rank={matched:0,warning:1,pool:2,possible:3};
    return rank[a.quality]-rank[b.quality]||b.hitCount-a.hitCount||b.zone.star-a.zone.star||a.zone.id.localeCompare(b.zone.id);
  });
}

// Mixed-type zones are inferred from Serebii's independently documented
// single-type source pools. The source does NOT identify which particular
// type-specific zone patterns or clusters will be paired in-game.
// Instead of fabricating cross-product "zones", return a bounded, star-specific
// group of independently compatible source patterns for each selected type.
export function searchMixedZones(zones,{previews,types,star='all'}) {
  const observed=previews.map(normName).filter(Boolean);
  const selected=[...new Set((types||[]).map(normName).filter(t=>t&&t!=='all'))];
  if(observed.length===0||selected.length<2||selected.length>3||selected.includes('special'))return [];
  const stars=star==='all'?[1,2,3,4,5]:[Number(star)];
  return stars.flatMap(rating=>{
    const bases=selected.map(type=>zones.filter(z=>z.type===type&&z.star===rating&&z.status!=='possible'&&z.groups?.length===3));
    if(bases.some(list=>!list.length))return [];
    const candidateMaps=selected.map(()=>new Map());
    const assignment=new Array(observed.length).fill(0);
    let allocationCount=0;

    // At most 3^3 = 27 type-allocation attempts. Each observed Pokémon must
    // be explained by one source type, which itself must contain a valid
    // source pattern at the same star rating as the other selected types.
    function visit(i){
      if(i<observed.length){
        for(let t=0;t<selected.length;t++){assignment[i]=t;visit(i+1);}
        return;
      }
      const compatible=selected.map((_,typeIndex)=>{
        const indices=observed.map((_,j)=>j).filter(j=>assignment[j]===typeIndex);
        const subset=indices.map(j=>observed[j]);
        const rows=bases[typeIndex].flatMap(zone=>{
          if(!subset.length)return [{zone,quality:'unconstrained',indices:[]}];
          const result=classifyZone(zone,subset);
          if(!result||result.quality==='possible')return [];
          return [{zone,quality:result.quality,indices}];
        });
        return rows;
      });
      if(compatible.some(group=>!group.length))return;
      allocationCount++;
      compatible.forEach((options,typeIndex)=>{
        const map=candidateMaps[typeIndex];
        for(const candidate of options){
          let entry=map.get(candidate.zone.id);
          if(!entry){
            entry={zone:candidate.zone,observedIndices:new Set(),qualities:new Set()};
            map.set(candidate.zone.id,entry);
          }
          candidate.indices.forEach(j=>entry.observedIndices.add(j));
          entry.qualities.add(candidate.quality);
        }
      });
    }
    visit(0);
    if(!allocationCount)return [];
    const sources=selected.map((type,i)=>({
      type,
      candidates:[...candidateMaps[i].values()].map(c=>({
        zone:c.zone,
        observedIndices:[...c.observedIndices].sort((a,b)=>a-b),
        qualities:[...c.qualities]
      })).sort((a,b)=>b.observedIndices.length-a.observedIndices.length||a.zone.number-b.zone.number)
    }));
    return [{
      kind:'mixed',id:`MIXED-${selected.join('-')}-${rating}`,types:selected,
      star:rating,sources,allocationCount,previewCount:observed.length,
      status:'inferred'
    }];
  }).sort((a,b)=>b.star-a.star);
}
