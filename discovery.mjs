import {displayName, matchesMember, normName} from './matcher.mjs';

// A union of as-yet-unseen Pokémon from *all* matching source records.
// Source-pattern support is NOT an overall encounter probability. Each zone is
// counted once per species/form, even if it lists the Pokémon in multiple slots.
export function summarizeOtherPokemon(results, previews) {
  const observed=previews.map(p=>String(p||'').trim()).filter(Boolean);
  const mixed=results.some(r=>r.kind==='mixed');
  const entries=new Map();
  const add=(member,zone,selectedResultId)=>{
    if(observed.some(p=>matchesMember(member,p)))return;
    const name=displayName(member);
    if(!name)return;
    const form=String(member.form||'');
    const key=`${normName(name)}|${form}`;
    if(!entries.has(key))entries.set(key,{
      key,name,form,zoneIds:new Set(),resultIds:new Set(),
      sources:new Map(),zones:[]
    });
    const entry=entries.get(key);
    if(entry.zoneIds.has(zone.id))return;
    entry.zoneIds.add(zone.id);
    entry.resultIds.add(selectedResultId);
    entry.zones.push({id:zone.id,type:zone.type,star:zone.star,number:zone.number});
    entry.sources.set(zone.type,(entry.sources.get(zone.type)||0)+1);
  };
  for(const result of results){
    if(result.kind==='mixed'){
      for(const source of result.sources||[]){
        for(const candidate of source.candidates||[]){
          const zone=candidate.zone;
          for(const group of zone.groups||[]){
            for(const member of group.members||[])add(member,zone,result.id);
          }
        }
      }
    }else{
      const zone=result.zone;
      const members=zone.status==='possible'?(zone.unassigned||[]):(zone.groups||[]).flatMap(g=>g.members||[]);
      for(const member of members)add(member,zone,zone.id);
    }
  }
  const all=[...entries.values()];
  const counts=new Map();for(const entry of all)counts.set(normName(entry.name),(counts.get(normName(entry.name))||0)+1);
  const items=all.map(entry=>({
    key:entry.key,
    name:entry.name,
    label:counts.get(normName(entry.name))>1 ? `${entry.name} (${entry.form||'form unspecified'})` : entry.name,
    form:entry.form,
    count:entry.zoneIds.size,
    sourceTypes:[...entry.sources.keys()].sort(),
    sourceCounts:Object.fromEntries(entry.sources),
    resultIds:[...entry.resultIds],
    zones:entry.zones
  })).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label));
  return {mixed,totalResults:results.length,items};
}