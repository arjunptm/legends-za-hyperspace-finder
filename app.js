import {normName, displayName, matchesMember, searchZones} from './matcher.mjs';

const $ = (id) => document.getElementById(id);
const inputs=[$('pokemon1'),$('pokemon2'),$('pokemon3')];
const typeInput=$('zoneType'), starInput=$('starRating');
const list=$('resultsList'), detail=$('zoneDetails'), summary=$('resultSummary');
let zones=[], names=[], results=[], selectedId=null, toastTimeout=null;
const TYPES=['normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy','special'];
const escapeText=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=s=>s ? s[0].toUpperCase()+s.slice(1) : '';
const range=pair=>Array.isArray(pair)&&pair[0]!=null&&pair[1]!=null?(pair[0]===pair[1]?String(pair[0]):`${pair[0]}–${pair[1]}`):'—';
const percent=n=>n==null?'—':`${Number.isInteger(Number(n))?Number(n):Number(n).toFixed(1)}%`;
const safeSource=url=>/^https:\/\/www\.serebii\.net\//.test(url||'')?url:'https://www.serebii.net/legendsz-a/hyperspacelumiose.shtml';
const uniqueMembers=members=>[...new Map(members.map(m=>[normName(displayName(m))+'|'+(m.form||''),m])).values()];

function getQuery(){return {previews:inputs.map(x=>x.value.trim()),type:typeInput.value,star:starInput.value};}
function observed(member,previews){return previews.some(p=>p&&matchesMember(member,p));}
function extraMembers(zone,previews){return uniqueMembers((zone.status==='possible'?zone.unassigned:zone.groups.flatMap(g=>(g.members||[]).map(m=>({...m,slot:g.slot}))))||[]).filter(m=>!observed(m,previews));}
function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>el.hidden=true,2500);}
function syncUrl(){const {previews,type,star}=getQuery(),url=new URL(location.href);url.search='';previews.forEach((p,i)=>{if(p)url.searchParams.set(`p${i+1}`,p)});if(type!=='all')url.searchParams.set('type',type);if(star!=='all')url.searchParams.set('star',star);if(selectedId)url.searchParams.set('zone',selectedId);history.replaceState(null,'',url);}
function restoreQuery(){const q=new URLSearchParams(location.search);inputs.forEach((inp,i)=>inp.value=q.get(`p${i+1}`)||'');const type=q.get('type'),star=q.get('star');if(type&&[...typeInput.options].some(o=>o.value===type))typeInput.value=type;if(star&&[...starInput.options].some(o=>o.value===star))starInput.value=star;selectedId=q.get('zone');}
function matchLabel(quality){return {matched:'Compatible',warning:'Warning',pool:'Possible – shared cluster',possible:'Possible – incomplete'}[quality]||'Unknown';}
function extraPreview(zone,previews){const names=extraMembers(zone,previews).map(displayName);return names.length?`Other: ${names.slice(0,4).join(', ')}${names.length>4?` +${names.length-4}`:''}`:'No other listed Pokémon';}
function renderCandidates(query){
  $('candidateCount').textContent=results.length?String(results.length):'';
  if(!results.length){list.innerHTML='<div class="placeholder">No combinations</div>';return;}
  list.innerHTML=results.map(r=>{
    const z=r.zone,active=z.id===selectedId;
    return `<button class="candidate" type="button" data-zone="${escapeText(z.id)}" aria-pressed="${active}">
      <span class="candidate-top"><span class="candidate-name">${escapeText(title(z.type))} · Zone #${z.number}</span><span class="candidate-star">${z.star}★</span></span>
      <span class="candidate-bottom">${escapeText(matchLabel(r.quality))}</span>
      <span class="candidate-extra">${escapeText(extraPreview(z,query.previews))}</span>
    </button>`;
  }).join('');
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
  const match=results.find(r=>r.zone.id===selectedId);
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
function render(){
  const query=getQuery(),valid=query.previews.map(normName).filter(Boolean),known=new Set(names.map(normName));
  const unknown=query.previews.filter(x=>x&&!known.has(normName(x)));
  if(!zones.length){detail.innerHTML='<div class="placeholder">Loading encounter data…</div>';return;}
  if(!valid.length||unknown.length){
    results=[];selectedId=null;$('resultCount').textContent='';summary.textContent='';
    renderCandidates(query);
    detail.innerHTML=`<div class="placeholder">${unknown.length?`Not in the encounter list: ${escapeText(unknown.join(', '))}. Select a listed name.`:'Enter observed Pokémon to see matching zones and other possible spawns.'}</div>`;
    return;
  }
  results=searchZones(zones,query);
  if(!results.some(r=>r.zone.id===selectedId))selectedId=results[0]?.zone.id??null;
  const n={matched:0,warning:0,pool:0,possible:0};results.forEach(r=>n[r.quality]++);
  $('resultCount').textContent=`${results.length} ${results.length===1?'combination':'combinations'}`;
  summary.innerHTML=`<span><strong>${n.matched}</strong> compatible</span><span><strong>${n.warning}</strong> warnings</span><span><strong>${n.pool}</strong> shared-cluster</span><span><strong>${n.possible}</strong> incomplete</span>`;
  renderCandidates(query);
  if(results.length)renderDetail(query);
  else detail.innerHTML='<div class="placeholder">No listed combinations match these Pokémon and filters. Try a different star rating or type. Mixed-type zone assembly is not included.</div>';
}
function onChange(){render();syncUrl();}
async function init(){
  for(const type of TYPES){const option=document.createElement('option');option.value=type;option.textContent=title(type);typeInput.append(option);}
  try{
    const response=await fetch('./data/zones.json',{cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);
    zones=await response.json();if(!Array.isArray(zones)||zones.length!==507)throw new Error('Unexpected encounter data');
    names=[...new Set(zones.flatMap(z=>[...(z.groups||[]).flatMap(g=>g.members||[]),...(z.unassigned||[])].flatMap(m=>[m.name,displayName(m)])))].sort((a,b)=>a.localeCompare(b));
    const namesList=$('pokemonNames');for(const name of names){const option=document.createElement('option');option.value=name;namesList.appendChild(option);}
    $('datasetStatus').textContent='507 zones · 2,533 spawn records';
    restoreQuery();for(const input of [...inputs,typeInput,starInput])input.addEventListener('input',onChange);
    $('clearButton').addEventListener('click',()=>{inputs.forEach(x=>x.value='');typeInput.value='all';starInput.value='all';selectedId=null;onChange();inputs[0].focus();});
    $('sampleButton').addEventListener('click',()=>{['Alolan Raichu','Flaaffy','Ampharos'].forEach((x,i)=>inputs[i].value=x);typeInput.value='electric';starInput.value='4';selectedId=null;onChange();});
    $('shareButton').addEventListener('click',async()=>{syncUrl();try{await navigator.clipboard.writeText(location.href);toast('Search link copied.');}catch{toast('Copy the browser URL to share.');}});
    list.addEventListener('click',event=>{const button=event.target.closest('button[data-zone]');if(!button)return;selectedId=button.dataset.zone;renderCandidates(getQuery());renderDetail(getQuery());syncUrl();});
    render();
  }catch(error){console.error(error);$('datasetStatus').textContent='Data unavailable';detail.innerHTML='<div class="placeholder">Could not load encounter data. Refresh the page. Local files require an HTTP server rather than file://.</div>';}
}
init();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
