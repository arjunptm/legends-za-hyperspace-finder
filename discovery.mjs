import {displayName, matchesMember, normName} from './matcher.mjs';

// This is a frequency *among candidate listings*, never a spawn probability.
// Merge cosmetic forms with the same display name for the short summary, while
// keeping regional forms separately named (e.g. Raichu vs Alolan Raichu).
export function summaryFrequency(ratio) {
  if (ratio >= 0.75) return 'In most possibilities';
  if (ratio >= 0.4) return 'In some possibilities';
  return 'In a few possibilities';
}

export function summarizeOtherPokemon(results, previews) {
  const observed=previews.map(p=>String(p||'').trim()).filter(Boolean);
  const mixed=results.some(r=>r.kind==='mixed');
  const totals=new Map();
  if (mixed) for (const result of results) {
    for (const source of result.sources||[]) {
      // Unique source zone IDs, not duplicate ways to assign preview Pokémon.
      if (!totals.has(source.type)) totals.set(source.type,new Set());
      for (const candidate of source.candidates||[]) totals.get(source.type).add(candidate.zone.id);
    }
  }
  const entries=new Map();
  const add=(member,zone,selectedResultId)=>{
    if (observed.some(p=>matchesMember(member,p))) return;
    const name=displayName(member);
    if (!name) return;
    const key=normName(name);
    if (!entries.has(key)) entries.set(key,{
      key,name,label:name,zoneIds:new Set(),resultIds:new Set(),
      sources:new Map(),zones:[],forms:new Set()
    });
    const entry=entries.get(key);
    if (member.form) entry.forms.add(String(member.form));
    if (entry.zoneIds.has(zone.id)) return;
    entry.zoneIds.add(zone.id);
    entry.resultIds.add(selectedResultId);
    entry.zones.push({id:zone.id,type:zone.type,star:zone.star,number:zone.number});
    entry.sources.set(zone.type,(entry.sources.get(zone.type)||0)+1);
  };
  for (const result of results) {
    if (result.kind==='mixed') {
      for (const source of result.sources||[]) {
        for (const candidate of source.candidates||[]) {
          for (const group of candidate.zone.groups||[]) {
            for (const member of group.members||[]) add(member,candidate.zone,result.id);
          }
        }
      }
    } else {
      const zone=result.zone;
      const members=zone.status==='possible'?(zone.unassigned||[]):(zone.groups||[]).flatMap(g=>g.members||[]);
      for (const member of members) add(member,zone,zone.id);
    }
  }
  const items=[...entries.values()].map(entry=>{
    const support=mixed
      ? Math.max(0,...[...entry.sources.entries()].map(([type,count])=>count/(totals.get(type)?.size||Infinity)))
      : entry.zoneIds.size/Math.max(1,results.length);
    return {
      key:entry.key,name:entry.name,label:entry.name,
      form:entry.forms.size===1?[...entry.forms][0]:null,
      forms:[...entry.forms],count:entry.zoneIds.size,
      sourceTypes:[...entry.sources.keys()].sort(),
      sourceCounts:Object.fromEntries(entry.sources),
      resultIds:[...entry.resultIds],zones:entry.zones,
      support,frequency:summaryFrequency(support)
    };
  }).sort((a,b)=>b.support-a.support || b.count-a.count || a.label.localeCompare(b.label));
  return {mixed,totalResults:results.length,items};
}