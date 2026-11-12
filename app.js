import {normName, displayName, matchesMember, searchZones, searchMixedZones} from './matcher.mjs';
import {summarizeOtherPokemon} from './discovery.mjs';

const $ = (id) => document.getElementById(id);
const inputs=[$('pokemon1'),$('pokemon2'),$('pokemon3')];
const typeInput=$('zoneType'), type2Input=$('zoneType2'), type3Input=$('zoneType3'), starInput=$('starRating');
const list=$('resultsList'), detail=$('zoneDetails'), summary=$('resultSummary');
let zones=[], names=[], results=[], selectedId=null, toastTimeout=null, showAllExtras=false;
const TYPES=['normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy','special'];
const escapeText=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=s=>s ? s[0].toUpperCase()+s.slice(1) : '';
const range=pair=>Array.isArray(pair)&&pair[0]!=null&&pair[1]!=null?(pair[0]===pair[1]?String(pair[0]):`${pair[0]}–${pair[1]}`):'—';
const percent=n=>n==null?'—':`${Number.isInteger(Number(n))?Number(n):Number(n).toFixed(1)}%`;
const safeSource=url=>/^https:\/\/www\.serebii\.net\//.test(url||'')?url:'https://www.serebii.net/legendsz-a/hyperspacelumiose.shtml';
const uniqueMembers=members=>[...new Map(members.map(m=>[normName(displayName(m))+'|'+(m.form||''),m])).values()];

function getQuery(){
  const type=typeInput.value,type2=type2Input.value,type3=type3Input.value;
  return {previews:inputs.map(x=>x.value.trim()),type,type2,type3,
    types:[...new Set([type,type2,type3].filter(t=>t&&t!=='all'))],star:starInput.value};
}
function syncTypeControls(){
  const canMix=typeInput.value!=='all'&&typeInput.value!=='special';
  if(!canMix||type2Input.value===typeInput.value)type2Input.value='';
  if(type3Input.value===typeInput.value||type3Input.value===type2Input.value)type3Input.value='';
  type2Input.disabled=!canMix;
  type3Input.disabled=!canMix||!type2Input.value;
  if(type3Input.disabled)type3Input.value='';
  for(const inp of [type2Input,type3Input])for(const option of inp.options){
    if(!option.value)continue;
    option.disabled=option.value===typeInput.value||(inp===type3Input&&option.value===type2Input.value);
  }
}

function observed(member,previews){return previews.some(p=>p&&matchesMember(member,p));}
function extraMembers(zone,previews){return uniqueMembers((zone.status==='possible'?zone.unassigned:zone.groups.flatMap(g=>(g.members||[]).map(m=>({...m,slot:g.slot}))))||[]).filter(m=>!observed(m,previews));}
function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.hidden=true,2500);}
function syncUrl(){const {previews,type,type2,type3,star}=getQuery(),url=new URL(location.href);url.search='';previews.forEach((p,i)=>{if(p)url.searchParams.set(`p${i+1}`,p)});if(type!=='all')url.searchParams.set('type',type);if(type2)url.searchParams.set('type2',type2);if(type3)url.searchParams.set('type3',type3);if(star!=='all')url.searchParams.set('star',star);if(selectedId)url.searchParams.set('zone',selectedId);history.replaceState(null,'',url);}
function restoreQuery(){const q=new URLSearchParams(location.search);inputs.forEach((inp,i)=>inp.value=q.get(`p${i+1}`)||'');const type=q.get('type'),star=q.get('star');if(type&&[...typeInput.options].some(o=>o.value===type))typeInput.value=type;const type2=q.get('type2'),type3=q.get('type3');if(type2&&[...type2Input.options].some(o=>o.value===type2))type2Input.value=type2;if(type3&&[...type3Input.options].some(o=>o.value===type3))type3Input.value=type3;syncTypeControls();if(star&&[...starInput.options].some(o=>o.value===star))starInput.value=star;selectedId=q.get('zone');}
function matchLabel(quality){return {matched:'Compatible',warning:'Warning',pool:'Possible – shared cluster',possible:'Possible – incomplete'}[quality]||'Unknown';}
function extraPreview(zone,previews){const names=extraMembers(zone,previews).map(displayName);return names.length?`Other: ${names.slice(0,4).join(', ')}${names.length>4?` +${names.length-4}`:''}`:'No other listed Pokémon';}
function renderCandidates(query){
  $('candidateCount').textContent=results.length?String(results.length):'';
  if(!results.length){list.innerHTML='<div class="placeholder">No combinations</div>';return;}
  list.innerHTML=results.map(r=>{
    if(r.kind==='mixed'){
      const active=r.id===selectedId;
      const counts=r.sources.map(source=>`${title(source.type)} ${source.candidates.length}`).join(' · ');
      return `<button class="candidate" type="button" data-zone="${escapeText(r.id)}" aria-pressed="${active}">
        <span class="candidate-top"><span class="candidate-name">${escapeText(r.types.map(title).join(' + '))}</span><span class="candidate-star">${r.star}★</span></span>
        <span class="candidate-bottom">Inferred mixed-type source pools</span>
        <span class="candidate-extra">${escapeText(counts)}</span>
      </button>`;
    }
    const z=r.zone,active=z.id===selectedId;
    return `<button class="candidate" type="button" data-zone="${escapeText(z.id)}" aria-pressed="${active}">
      <span class="candidate-top"><span class="candidate-name">${escapeText(title(z.type))} · Zone #${z.number}</span><span class="candidate-star">${z.star}★</span></span>
      <span class="candidate-bottom">${escapeText(matchLabel(r.quality))}</span>
      <span class="candidate-extra">${escapeText(extraPreview(z,query.previews))}</span>
    </button>`;
  }).join('');
}
function renderDiscovery(query){
  const root=$('discoverySummary');
  if(!results.length){root.hidden=true;return;}
  const {mixed,totalResults,items}=summarizeOtherPokemon(results,query.previews);
  root.hidden=false;
  $('discoveryCount').textContent=`(${items.length})`;
  $('discoveryNote').textContent=mixed
    ? 'Inferred from compatible single-type source patterns; not guaranteed.'
    : `Across ${totalResults} matching combination${totalResults===1?'':'s'}; not all in one zone.`;
  const displayed=showAllExtras?items:items.slice(0,12);
  if(!items.length){
    $('discoveryList').innerHTML='<span class="discovery-empty">No other Pokémon listed in these candidates.</span>';
  }else{
    $('discoveryList').innerHTML=displayed.map(entry=>{
      const resultId=entry.resultIds[0];
      const reference=mixed
        ? `${entry.count} source pattern${entry.count===1?'':'s'} · ${entry.sourceTypes.map(title).join(' + ')}`
        : `${entry.count} of ${totalResults} combination${totalResults===1?'':'s'}${entry.zones.length===1?` · zone #${entry.zones[0].number}`:''}`;
      if(mixed)return `<div class="discovery-entry"><strong>${escapeText(entry.label)}</strong><span>${escapeText(reference)}</span></div>`;
      return `<button class="discovery-entry" type="button" data-extra-result="${escapeText(resultId)}" title="Show zone details for ${escapeText(entry.label)}"><strong>${escapeText(entry.label)}</strong><span>${escapeText(reference)}</span></button>`;
    }).join('');
  }
  const button=$('discoveryMore');
  button.hidden=items.length<=12;
  button.textContent=showAllExtras?'Show fewer':`Show all ${items.length} Pokémon`;
  $('discoveryList').classList.toggle('discovery-expanded',showAllExtras);
}

function memberHtml(m,previews){
  const seen=observed(m,previews);
  return `<div class="member${seen?' observed':''}"><div class="member-top"><span class="member-name">${escapeText(displayName(m))}${seen?'<span class="observed-indicator">Observed</span>':''}</span><span class="member-percent">${percent(m.rarity)}</span></div><div class="member-meta">Lv ${escapeText(range(m.level))} · Alpha ${percent(m.alpha)} (Lv ${escapeText(range(m.alphaLevel))})</div></div>`;
}
function clusterHtml(group,previews){
  const n=(group.members||[]).filter(m=>observed(m,previews)).length;
  return `<section class="cluster"><div class="cluster-head"><strong>Cluster ${group.slot}</strong><span>${n?`${n} observed`:`${(group.members||[]).length} spawn${group.members.length===1?'':'s'}`}</span></div>${(group.members||[]).map(m=>memberHtml(m,previews)).join('')}</section>`;
}
function renderDetail(query){
  const match=results.find(r=>(r.kind==='mixed'?r.id:r.zone.id)===selectedId);
  if(match?.kind==='mixed'){renderMixedDetail(match,query);return;}
  if(!match){detail.innerHTML='<div class="placeholder">Enter observed Pokémon to see the other possible spawns.</div>';return;}
  const z=match.zone,extras=extraMembers(z,query.previews);
  const extraHtml=extras.length?`<div class="extra-grid">${extras.map(m=>`<div class="extra-entry"><div class="extra-name">${escapeText(displayName(m))}</div><div class="extra-meta">${percent(m.rarity)} in cluster${m.slot?` ${m.slot}`:''} · Lv ${escapeText(range(m.level))}</div></div>`).join('')}</div>`:'<div class="extras-none">No other Pokémon listed for this combination.</div>';
  const hasGroups=z.status!=='possible'&&z.groups?.length===3;
  const body=hasGroups?`<section class="cluster-section"><div class="detail-caption">Full spawn list by cluster</div><div class="cluster-grid">${z.groups.map(g=>clusterHtml(g,query.previews)).join('')}</div></section>`:
    `<section class="cluster-section"><div class="detail-caption">Recorded spawns (cluster assignment unknown)</div><div class="unassigned-grid">${uniqueMembers(z.unassigned||[]).map(m=>`<div class="extra-entry"><div class="extra-name">${escapeText(displayName(m))}</div><div class="extra-meta">${percent(m.rarity)} · Lv ${escapeText(range(m.level))}</div></div>`).join('')}</div></section>`;
  let caution='';
  if(match.quality==='pool')caution='<div class="warning-note">All observed Pokémon are listed, but at least two share one documented cluster. This is a possible combination, not a confirmed preview-slot match.</div>';
  if(match.quality==='possible')caution='<div class="warning-note">Special-zone preview clusters are incomplete. This is a possible candidate only.</div>';
  if(z.warnings?.length)caution+=`<div class="warning-note">${escapeText(z.warnings.join(' · '))}</div>`;
  detail.innerHTML=`<div class="detail-head"><div><h3>${escapeText(title(z.type))} Wild Zone #${z.number} · ${z.star}★</h3><div class="detail-meta">${escapeText(z.id)} · <span class="status${match.quality==='pool'||match.quality==='possible'||match.quality==='warning'?' caution':''}">${escapeText(matchLabel(match.quality))}</span></div></div><a class="detail-link" href="${escapeText(safeSource(z.source))}" target="_blank" rel="noopener noreferrer">Serebii source</a></div>
    <section class="extra-section"><div class="extra-title"><div class="detail-caption">Other possible Pokémon</div><span>${extras.length} not in your preview</span></div>${extraHtml}</section>${body}${caution}`;
}
// For mixed types, display independently compatible source pools, NOT fabricated
// mixed-zone pairings or guaranteed spawn odds. Source rarity is conditional.
function sourceMembers(source,previews){
  const records=new Map();
  for(const candidate of source.candidates){
    const seen=new Set();
    for(const group of candidate.zone.groups){
      for(const m of group.members||[]){
        const key=normName(displayName(m))+'|'+(m.form||'');
        if(seen.has(key)||observed(m,previews))continue;
        seen.add(key);
        if(!records.has(key))records.set(key,{member:m,support:0,rarities:new Set(),minLevel:Infinity,maxLevel:-Infinity,alpha:new Set()});
        const record=records.get(key);
        record.support++;
        if(m.rarity!=null)record.rarities.add(Number(m.rarity));
        if(m.alpha!=null)record.alpha.add(Number(m.alpha));
        if(m.level?.[0]!=null)record.minLevel=Math.min(record.minLevel,m.level[0]);
        if(m.level?.[1]!=null)record.maxLevel=Math.max(record.maxLevel,m.level[1]);
      }
    }
  }
  return [...records.values()].sort((a,b)=>b.support-a.support||displayName(a.member).localeCompare(displayName(b.member)));
}
function numericRange(values){
  const list=[...values].sort((a,b)=>a-b);
  return !list.length?'—':list.length===1?String(list[0]):`${list[0]}–${list[list.length-1]}`;
}
function mixedSourceHtml(source,query){
  const extras=sourceMembers(source,query.previews);
  const count=source.candidates.length;
  const unconstrained=source.candidates.every(c=>c.observedIndices.length===0);
  const sourceWarnings=source.candidates.filter(c=>c.zone.warnings?.length).length;
  const extraHtml=extras.length?`<div class="extra-grid">${extras.map(entry=>{
    const l=Number.isFinite(entry.minLevel)?`Lv ${entry.minLevel}–${entry.maxLevel}`:'Lv —';
    return `<div class="extra-entry"><div class="extra-name">${escapeText(displayName(entry.member))}</div><div class="extra-meta">${entry.support}/${count} source patterns · ${escapeText(l)}</div><div class="mixed-extra-count">${escapeText(numericRange(entry.rarities))}% rarity in listed clusters · Alpha ${escapeText(numericRange(entry.alpha))}%</div></div>`;
  }).join('')}</div>`:'<div class="extras-none">No additional species in these source patterns.</div>';
  const lists=source.candidates.map(entry=>{
    const z=entry.zone,matchNames=entry.observedIndices.map(i=>query.previews[i]).filter(Boolean);
    const flags=z.warnings?.length?`<p class="warning-note">${escapeText(z.warnings.join(' · '))}</p>`:'';
    return `<details class="pattern-details"><summary>${escapeText(title(source.type))} zone #${z.number} · ${escapeText(z.id)}${matchNames.length?` · supports ${escapeText(matchNames.join(', '))}`:' · no preview assigned'}</summary><div class="pattern-detail-body"><div class="cluster-grid">${z.groups.map(g=>clusterHtml(g,query.previews)).join('')}</div><p class="pattern-note"><a target="_blank" rel="noopener noreferrer" href="${escapeText(safeSource(z.source))}">Serebii source</a> · This is a source pattern, not a verified mixed-zone pairing.</p>${flags}</div></details>`;
  }).join('');
  return `<section class="mixed-source"><div class="mixed-source-head"><strong>${escapeText(title(source.type))}</strong><span>${count} compatible source pattern${count===1?'':'s'}${sourceWarnings?` · ${sourceWarnings} with source warnings`:''}</span></div>${unconstrained?'<p class="pattern-note">No preview assigned to this type. All source patterns at this rating remain candidates.</p>':''}${extraHtml}<details class="pattern-details mixed-references"><summary>Inspect ${count} ${escapeText(title(source.type))} source pattern${count===1?'':'s'}</summary><div class="pattern-detail-body">${lists}</div></details></section>`;
}
function renderMixedDetail(mix,query){
  const names=mix.types.map(title).join(' + ');
  const counts=mix.sources.map(s=>`${title(s.type)}: ${s.candidates.length}`).join(' · ');
  detail.innerHTML=`<div class="detail-head"><div><h3>${escapeText(names)} · ${mix.star}★</h3><div class="detail-meta">Inferred mixed-type pools · ${escapeText(counts)}</div></div><a class="detail-link" href="https://www.serebii.net/legendsz-a/hyperspacelumiose.shtml" target="_blank" rel="noopener noreferrer">Serebii guide</a></div>
    <div class="warning-note">These are compatible single-type source patterns, not confirmed mixed-zone combinations. Serebii doesn't specify which full patterns and clusters get combined. None of the additional Pokémon below is guaranteed to spawn.</div>
    <section class="extra-section"><div class="detail-caption">Other possible Pokémon from the source pools</div>${mix.sources.map(s=>mixedSourceHtml(s,query)).join('')}</section>
    <p class="source-note">“X/Y source patterns” means the Pokémon is recorded in X of Y independently compatible source patterns for that type; it is not an encounter probability. Percentages are preserved within the original source cluster.</p>`;
}
function render(){
  const query=getQuery(),valid=query.previews.map(normName).filter(Boolean),known=new Set(names.map(normName));
  const unknown=query.previews.filter(x=>x&&!known.has(normName(x)));
  if(!zones.length){detail.innerHTML='<div class="placeholder">Loading encounter data…</div>';return;}
  if(!valid.length||unknown.length){
    results=[];selectedId=null;$('resultCount').textContent='';summary.textContent='';$('discoverySummary').hidden=true;
    renderCandidates(query);
    detail.innerHTML=`<div class="placeholder">${unknown.length?`Not in the encounter list: ${escapeText(unknown.join(', '))}. Select a listed name.`:'Enter observed Pokémon to see matching zones and other possible spawns.'}</div>`;
    return;
  }
  const mixed=query.types.length>=2;
  results=mixed?searchMixedZones(zones,query):searchZones(zones,query);
  if(!results.some(r=>(r.kind==='mixed'?r.id:r.zone.id)===selectedId))selectedId=results[0]?(results[0].kind==='mixed'?results[0].id:results[0].zone.id):null;
  if(mixed){
    $('resultCount').textContent=`${results.length} compatible star rating${results.length===1?'':'s'}`;
    summary.innerHTML='<span>Mixed-type candidates · inferred, not confirmed</span>';
  }else{
    const n={matched:0,warning:0,pool:0,possible:0};results.forEach(r=>n[r.quality]++);
    $('resultCount').textContent=`${results.length} ${results.length===1?'combination':'combinations'}`;
    summary.innerHTML=`<span><strong>${n.matched}</strong> compatible</span><span><strong>${n.warning}</strong> warnings</span><span><strong>${n.pool}</strong> shared-cluster</span><span><strong>${n.possible}</strong> incomplete</span>`;
  }
  renderDiscovery(query);
  renderCandidates(query);
  if(results.length)renderDetail(query);
  else detail.innerHTML='<div class="placeholder">No compatible source pools found for these previews and filters. Try adjusting the types or star rating.</div>';
}
function onChange(){showAllExtras=false;render();syncUrl();}
async function init(){
  for(const type of TYPES){
    const option=document.createElement('option');option.value=type;option.textContent=title(type);typeInput.append(option);
    if(type!=='special')for(const select of [type2Input,type3Input]){const o=document.createElement('option');o.value=type;o.textContent=title(type);select.append(o);}
  }
  syncTypeControls();
  try{
    const response=await fetch('./data/zones.json',{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    zones=await response.json();if(!Array.isArray(zones)||zones.length!==507)throw new Error('Unexpected encounter data');
    names=[...new Set(zones.flatMap(z=>[...(z.groups||[]).flatMap(g=>g.members||[]),...(z.unassigned||[])].flatMap(m=>[m.name,displayName(m)])))].sort((a,b)=>a.localeCompare(b));
    const namesList=$('pokemonNames');for(const name of names){const option=document.createElement('option');option.value=name;namesList.appendChild(option);}
    $('datasetStatus').textContent='507 zones · 2,533 spawn records';
    restoreQuery();
    for(const input of inputs)input.addEventListener('input',onChange);
    for(const input of [typeInput,type2Input,type3Input])input.addEventListener('change',()=>{syncTypeControls();selectedId=null;onChange();});
    starInput.addEventListener('change',onChange);
    $('clearButton').addEventListener('click',()=>{inputs.forEach(x=>x.value='');typeInput.value='all';type2Input.value='';type3Input.value='';syncTypeControls();starInput.value='all';selectedId=null;onChange();inputs[0].focus();});
    $('sampleButton').addEventListener('click',()=>{['Alolan Raichu','Flaaffy','Ampharos'].forEach((x,i)=>inputs[i].value=x);typeInput.value='electric';type2Input.value='';type3Input.value='';syncTypeControls();starInput.value='4';selectedId=null;onChange();});
    $('shareButton').addEventListener('click',async()=>{syncUrl();try{await navigator.clipboard.writeText(location.href);toast('Search link copied.');}catch{toast('Copy the browser URL to share.');}});
    list.addEventListener('click',event=>{const button=event.target.closest('button[data-zone]');if(!button)return;selectedId=button.dataset.zone;renderCandidates(getQuery());renderDetail(getQuery());syncUrl();});
    $('discoveryMore').addEventListener('click',()=>{showAllExtras=!showAllExtras;renderDiscovery(getQuery());});
    $('discoveryList').addEventListener('click',event=>{
      const button=event.target.closest('button[data-extra-result]');if(!button)return;
      const id=button.dataset.extraResult;
      if(!results.some(r=>(r.kind==='mixed'?r.id:r.zone.id)===id))return;
      selectedId=id;
      renderCandidates(getQuery());renderDetail(getQuery());syncUrl();
      const selected=list.querySelector('button[aria-pressed="true"]');
      selected?.scrollIntoView({block:'nearest',inline:'nearest'});
      if(window.matchMedia('(max-width:760px)').matches)detail.scrollIntoView({block:'start',behavior:'smooth'});
    });
    render();
  }catch(error){console.error(error);$('datasetStatus').textContent='Data unavailable';detail.innerHTML='<div class="placeholder">Could not load encounter data. Refresh the page. Local files require an HTTP server rather than file://.</div>';}
}
init();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});