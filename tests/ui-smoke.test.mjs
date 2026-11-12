import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Lightweight browser-API stub for checking the page's rendering logic in Node.
test('compact interface presents missing spawn options and preserves selected result', async () => {
  const zones=JSON.parse(fs.readFileSync(new URL('../data/zones.json',import.meta.url),'utf8'));
  class Element {
    constructor(id='') { this.id=id; this.value=''; this.options=[]; this.innerHTML=''; this.textContent=''; this.handlers=new Map();this.dataset={}; }
    append(el){this.options.push(el);}
    appendChild(el){this.options.push(el);}
    addEventListener(name,callback){this.handlers.set(name,callback);}
    focus(){}
    get hidden(){return this._hidden||false;}
    set hidden(x){this._hidden=x;}
  }
  const ids=['pokemon1','pokemon2','pokemon3','zoneType','zoneType2','zoneType3','starRating','pokemonNames','datasetStatus','resultCount','resultSummary','candidateCount','resultsList','zoneDetails','sampleButton','shareButton','clearButton','toast'];
  const els=new Map(ids.map(id=>[id,new Element(id)]));
  els.get('zoneType').value='all';els.get('zoneType').options=[{value:'all'}];
  for(const id of ['zoneType2','zoneType3']){els.get(id).value='';els.get(id).options=[{value:''}];}
  els.get('starRating').value='all';els.get('starRating').options=[{value:'all'},...['1','2','3','4','5'].map(value=>({value}))];
  globalThis.document={getElementById:(id)=>els.get(id),createElement:()=>new Element()};
  globalThis.location={href:'http://example.test/finder/',protocol:'http:'};
  globalThis.history={replaceState:(_a,_b,url)=>{globalThis.location.href=url.toString();}};
  globalThis.fetch=async()=>({ok:true,json:async()=>zones});
  await import(new URL('../app.js',import.meta.url));
  for(let attempt=0;attempt<20&&!els.get('datasetStatus').textContent.includes('507');attempt++)await new Promise(r=>setTimeout(r,0));
  assert.match(els.get('datasetStatus').textContent,/507 zones/);
  assert.match(els.get('zoneDetails').innerHTML,/Enter observed Pokémon/);
  els.get('sampleButton').handlers.get('click')();
  assert.equal(els.get('pokemon1').value,'Alolan Raichu');
  assert.match(els.get('resultCount').textContent,/combination/);
  const html=els.get('zoneDetails').innerHTML;
  for(const name of ['Electric Wild Zone #10','Other possible Pokémon','Eelektross','Eelektrik','Raichu','Alolan Raichu','Flaaffy','Ampharos','Shared cluster'])assert.match(html,new RegExp(name,'i'),name);
  assert.match(html,/20% in cluster 3/);
  assert.match(els.get('resultsList').innerHTML,/aria-pressed="true"/);
  assert.match(globalThis.location.href,/zone=ELECTRIC-030/);
  // Exercise the real interactive path: choose Normal + Ghost and enter
  // three previews whose source pools span both types.
  const event={};
  els.get('pokemon1').value='Lampent';
  els.get('pokemon2').value='Litwick';
  els.get('pokemon3').value='Porygon';
  els.get('zoneType').value='ghost';
  els.get('zoneType2').value='normal';
  els.get('starRating').value='3';
  els.get('zoneType2').handlers.get('change')(event);
  const mixedHtml=els.get('zoneDetails').innerHTML;
  assert.match(mixedHtml,/Ghost \+ Normal/i);
  assert.match(mixedHtml,/Other possible Pokémon/);
  assert.match(mixedHtml,/Inferred mixed-type pools/);
  assert.match(mixedHtml,/compatible source pattern/);
  assert.match(globalThis.location.href,/type2=normal/);
  assert.match(els.get('resultCount').textContent,/star rating/);
});
