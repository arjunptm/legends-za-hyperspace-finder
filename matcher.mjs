// Matching is local to the browser. Preserve form identities from source sprite keys.
export function normName(name) {
  return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

const ALOLAN = new Set(['Raichu', 'Meowth', 'Persian', 'Marowak']);
export function displayName(member) {
  if (!member) return '';
  const name=String(member.name||'');
  return ALOLAN.has(name) && String(member.form||'').endsWith('-a') ? `Alolan ${name}` : name;
}
export function matchesMember(member, requested) {
  const query=normName(requested);
  if (!query) return false;
  // A plain species name intentionally includes all forms; an explicit regional
  // form must match that form specifically, never an ordinary version.
  return query===normName(member.name) || query===normName(displayName(member)) ||
    (query===normName(`${member.name} (Alolan)`) && normName(displayName(member))===normName(`Alolan ${member.name}`));
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
