import {normName, searchZones} from './matcher.mjs';

const $ = (id) => document.getElementById(id);
const inputs=[$('pokemon1'),$('pokemon2'),$('pokemon3')];
const typeInput=$('zoneType'), starInput=$('starRating');
const list=$('resultsList'), summary=$('resultSummary'), more=$('loadMore');
let zones=[];
let names=[];
let results=[];
let visible=18;
let toastTimeout=null;
const TYPES=['normal','fighting','flying','poison','ground','rock','bug','ghost','steel','fire','water','grass','electric','psychic','ice','dragon','dark','fairy','special'];
const escapeText=(s)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const title=(s)=>s ? s.charAt(0).toUpperCase()+s.slice(1) : '';
const range=(bounds)=>Array.isArray(bounds)&&bounds[0]!=null&&bounds[1]!=null ? (bounds[0]===bounds[1]?String(bounds[0]):`${bounds[0]}–${bounds[1]}`) : 'n/a';
const percent=(n)=>n==null?'—':`${Number.isInteger(Number(n))?Number(n):Number(n).toFixed(1)}%`;
const safeSource=(url)=>/^https:\/\/www\.serebii\.net\//.test(url||'') ? url : 'https://www.serebii.net/legendsz-a/hyperspacelumiose.shtml';
const srcImage=(path)=>typeof path==='string' && /^assets\/pokemon\/[\w.-]+$/.test(path) ? `./${path}` : '';

function getQuery(){return {previews:inputs.map(x=>x.value.trim()),type:typeInput.value,star:starInput.value};}
function toast(message){const el=$('toast');el.textContent=message;el.hidden=false;clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>{el.hidden=true},2500);}
function syncUrl(){const {previews,type,star}=getQuery();const url=new URL(window.location.href);url.search='';previews.forEach((s,i)=>{if(s)url.searchParams.set(`p${i+1}`,s)});if(type!=='all')url.searchParams.set('type',type);if(star!=='all')url.searchParams.set('star',star);history.replaceState(null,'',url);}
function restoreQuery(){const query=new URLSearchParams(window.location.search);inputs.forEach((inp,i)=>{inp.value=query.get(`p${i+1}`)||''});const type=query.get('type');if(type&&[...typeInput.options].some(o=>o.value===type))typeInput.value=type;const star=query.get('star');if(star&&[...starInput.options].some(o=>o.value===star))starInput.value=star;}
function buildMember(m,selected){
  const selectedClass=selected.has(normName(m.name))?' selected':'';
  const icon=srcImage(m.image);
  const avatar=icon?`<img loading="lazy" src="${escapeText(icon)}" alt="" />`:escapeText((m.name||'?').slice(0,1));
  // Form keys are unambiguous in the importer even when names repeat.
  const form=m.hasSameNameForm?`<div class="member-form">Form: ${escapeText(m.form||'unspecified')}</div>`:'';
  return `<div class="member${selectedClass}"><span class="member-art">${avatar}</span><div class="member-copy"><div class="member-name">${escapeText(m.name)}</div>${form}<div class="member-meta">Lv. ${escapeText(range(m.level))} · Alpha ${percent(m.alpha)} · Alpha Lv. ${escapeText(range(m.alphaLevel))}</div></div><span class="member-percent">${percent(m.rarity)}</span></div>`;
}
function clusterHtml(group,zone,selected,matchedSlots){
  const assigned=matchedSlots.has(group.slot);
  const values=group.members||[];
  const formCounts=new Map();values.forEach(m=>formCounts.set(normName(m.name),(formCounts.get(normName(m.name))||0)+1));
  const items=values.map(m=>buildMember({...m,hasSameNameForm:formCounts.get(normName(m.name))>1},selected)).join('');
  return `<section class="cluster${assigned?' cluster-preview':''}"><div class="cluster-head"><strong>Cluster ${group.slot}</strong><span>${assigned?'✓ Preview matched':`${values.length} possible spawn${values.length!==1?'s':''}`}</span></div>${items||'<p class="member-unknown">No spawn information.</p>'}</section>`;
}
function zoneCard(result,index,query){
  const z=result.zone;
  const isPossible=result.quality==='possible';
  const isWarning=result.quality==='warning';
  const state=isPossible?'Possible match':isWarning?'Match with warning':'Compatible match';
  const label=isPossible?'possible':isWarning?'warning':'';
  const chosen=new Set(query.previews.map(normName).filter(Boolean));
  const slots=new Set(result.slots);
  const source=safeSource(z.source);
  const stars=Number(z.star)?'★'.repeat(Math.min(Number(z.star),5)):'—';
  const info=`${Number(z.star)}-star ${title(z.type)} source category · Zone #${z.number}`;
  let body;
  if(!isPossible){
    body=`<div class="group-grid">${z.groups.map(g=>clusterHtml(g,z,chosen,slots)).join('')}</div>`;
  } else {
    const unique=new Map();(z.unassigned||[]).forEach(m=>{const key=normName(m.name)+'_'+m.form;if(!unique.has(key))unique.set(key,m)});
    const possible=[...unique.values()];
    body=`<p class="source-note">Pokémon recorded for this zone (preview-slot assignment is unknown):</p><div class="uncertain-list">${possible.slice(0,22).map(m=>`<span class="uncertain-name">${escapeText(m.name)}</span>`).join('')}${possible.length>22?`<span class="uncertain-name">+${possible.length-22} more</span>`:''}</div>`;
  }
  const warning= z.warnings?.length?`<div class="issue${isPossible?' possible':''}"><strong>${isPossible?'Incomplete source:':'Source note:'}</strong> ${escapeText(z.warnings.join(' · '))}</div>`:'';
  return `<details class="zone-card" ${index===0?'open':''}><summary><div><div class="zone-topline"><span class="zone-title">${escapeText(title(z.type))} Wild Zone <span class="zone-id">#${escapeText(z.number)}</span></span><span class="zone-state ${label}">${state}</span></div><div class="zone-subline"><span class="type-chip">${escapeText(title(z.type))}</span><span class="zone-stars" title="${Number(z.star)} stars">${stars}</span><span>·</span><span>${escapeText(z.id)}</span></div></div><span class="card-right"><span class="preview-match">${isPossible?`${result.hitCount} preview${result.hitCount!==1?'s':''} listed`:`${result.hitCount} preview${result.hitCount!==1?'s':''} matched`}</span><span class="card-chevron" aria-hidden="true">⌄</span></span></summary><div class="zone-body"><div class="source-details"><a target="_blank" rel="noopener noreferrer" href="${escapeText(source)}">View on Serebii ↗</a><span>${escapeText(info)}</span></div>${body}${warning}<p class="source-note">Rarity is conditional within its cluster. Image/form variants and source percentages are preserved as listed.</p></div></details>`;
}
function render(){
  const query=getQuery();
  const valid=query.previews.map(x=>normName(x)).filter(Boolean);
  const known=new Set(names.map(normName));
  const unknown=query.previews.filter(x=>x.trim()&&!known.has(normName(x)));
  $('resultsTitle').textContent=valid.length?'Potential combinations':'Ready when you are';
  if(!zones.length){list.innerHTML='<div class="empty-state"><div class="empty-icon">✦</div><h3>Loading encounter data…</h3><p>All search calculations happen right here on your device.</p></div>';return;}
  if(!valid.length){
    results=[];
    $('resultCount').textContent='';summary.innerHTML='';
    list.innerHTML='<div class="empty-state"><div class="empty-icon">✦</div><h3>Start with a Pokémon</h3><p>Enter one, two, or three Pokémon from the portal preview—or tap “Try an example” to see a complete result.</p></div>';
    more.hidden=true;return;
  }
  if(unknown.length){
    results=[];$('resultCount').textContent='';summary.innerHTML='';
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">⌕</div><h3>Check the Pokémon name</h3><p>${escapeText(unknown.join(', '))} ${unknown.length===1?'is not in':'are not in'} the extracted encounter list. Choose a name from the suggestions to continue.</p></div>`;
    more.hidden=true;return;
  }
  results=searchZones(zones,query);
  $('resultCount').textContent=`${results.length} combination${results.length===1?'':'s'}`;
  const a=results.filter(x=>x.quality==='matched').length,b=results.filter(x=>x.quality==='warning').length,c=results.filter(x=>x.quality==='possible').length;
  summary.innerHTML=`<div class="summary-stat"><strong>${a}</strong> compatible matches</div><div class="summary-stat warn"><strong>${b}</strong> with source warnings</div><div class="summary-stat possible"><strong>${c}</strong> tentative Special candidates</div>`;
  if(!results.length){
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">⌕</div><h3>No compatible combination found</h3><p>No zone in the selected category and star rating assigns these Pokémon to distinct known clusters. Try removing a filter. Special zones have incomplete data and cannot always be ruled out.</p></div>`;
    more.hidden=true;return;
  }
  list.innerHTML=results.slice(0,visible).map((r,i)=>zoneCard(r,i,query)).join('');
  more.hidden=results.length<=visible;
  more.textContent=`Show more combinations (${results.length-visible} remaining)`;
  for (const img of list.querySelectorAll('.member-art img')){
    img.addEventListener('error',()=>{img.replaceWith(document.createTextNode('?'))},{once:true});
  }
}
function onChange(){visible=18;syncUrl();render()}
async function init(){
  for(const type of TYPES){const option=document.createElement('option');option.value=type;option.textContent=title(type);typeInput.append(option)}
  try{
    const response=await fetch('./data/zones.json',{cache:'no-cache'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const downloaded=await response.json();
    if(!Array.isArray(downloaded)||downloaded.length!==507)throw new Error('Unexpected encounter database structure');
    zones=downloaded;
    names=[...new Set(zones.flatMap(z=>[...(z.groups||[]).flatMap(g=>g.members||[]),...(z.unassigned||[])].map(m=>m.name)))].sort((a,b)=>a.localeCompare(b));
    const namesList=$('pokemonNames');
    for(const name of names){const option=document.createElement('option');option.value=name;namesList.appendChild(option)}
    $('datasetStatus').innerHTML='<span class="dot"></span> 507 zones · 2,533 spawn records';
    restoreQuery();
    for (const input of [...inputs,typeInput,starInput]) input.addEventListener('input',onChange);
    $('clearButton').addEventListener('click',()=>{inputs.forEach(x=>x.value='');typeInput.value='all';starInput.value='all';onChange();inputs[0].focus()});
    $('sampleButton').addEventListener('click',()=>{inputs.forEach((x,i)=>x.value=['Patrat','Bunnelby','Buneary'][i]);typeInput.value='normal';starInput.value='2';onChange();document.getElementById('results').scrollIntoView({behavior:'smooth',block:'start'})});
    $('shareButton').addEventListener('click',async()=>{syncUrl();try{await navigator.clipboard.writeText(location.href);toast('Search link copied!')}catch{toast('Copy the page URL to share this search.')}});
    more.addEventListener('click',()=>{visible+=18;render();});
    render();
  }catch(error){
    console.error(error);$('datasetStatus').textContent='Encounter data unavailable';
    list.innerHTML=`<div class="empty-state"><div class="empty-icon">!</div><h3>Could not load encounter data</h3><p>Try refreshing the page. If you're opening the HTML directly from a folder, run a local server instead (see README).</p></div>`;
  }
}
init();
if('serviceWorker' in navigator && window.location.protocol==='https:'){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
