// All matching stays on-device. These functions do not depend on a browser.
export function normName(name) {
  return String(name ?? '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US');
}

// Assign each entered preview Pokémon to a DIFFERENT known spawn cluster.
// Inputs are allowed in any order; repeated names are allowed only when distinct
// clusters independently contain that species.
export function assignPreviews(groups, previews) {
  const names = previews.map(normName).filter(Boolean);
  const assignment = [];
  const used = new Set();
  function visit(index) {
    if (index === names.length) return [...assignment];
    for (let j = 0; j < groups.length; j++) {
      if (used.has(j)) continue;
      const candidates = groups[j].members || [];
      if (!candidates.some(member => normName(member.name) === names[index])) continue;
      assignment[index] = Number(groups[j].slot) || j + 1;
      used.add(j);
      const answer = visit(index + 1);
      if (answer) return answer;
      used.delete(j);
    }
    return null;
  }
  return visit(0);
}

export function classifyZone(zone, previews) {
  const names = previews.map(normName).filter(Boolean);
  if (!names.length) return null;
  if (zone.status !== 'possible' && zone.groups?.length === 3) {
    const slots = assignPreviews(zone.groups, names);
    return slots ? { quality: zone.status === 'warning' ? 'warning' : 'matched', slots, hitCount: names.length } : null;
  }
  // Special-zone tables do not give reliable assignments to preview slots.
  // An overlap shows a potentially relevant zone, never a confirmed match.
  const available = new Set([...(zone.unassigned || []).map(x => normName(x.name)),
    ...(zone.focus || []).map(x => normName(x.name))]);
  const hitCount = names.filter(x => available.has(x)).length;
  return hitCount ? {quality:'possible',slots:[],hitCount} : null;
}

export function searchZones(zones, { previews, type='all', star='all' }) {
  const names = previews.map(normName).filter(Boolean);
  if (!names.length) return [];
  return zones.flatMap(zone => {
    if (type !== 'all' && zone.type !== type) return [];
    if (star !== 'all' && String(zone.star) !== String(star)) return [];
    const hit=classifyZone(zone,names);
    if (!hit) return [];
    return [{zone,...hit}];
  }).sort((a,b) => {
    const order={matched:0,warning:1,possible:2};
    return order[a.quality]-order[b.quality] || b.hitCount-a.hitCount || b.zone.star-a.zone.star || a.zone.id.localeCompare(b.zone.id);
  });
}
