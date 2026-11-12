import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchZones,searchMixedZones} from '../matcher.mjs';
import {summarizeOtherPokemon} from '../discovery.mjs';
const zones=JSON.parse(fs.readFileSync(new URL('../data/zones.json',import.meta.url),'utf8'));

test('Furfrou / Pidgeotto / Pidgeot: all three extra species are visible across combinations',()=>{
  const previews=['Furfrou','Pidgeotto','Pidgeot'];
  const matches=searchZones(zones,{previews,type:'normal',star:4});
  assert.deepEqual(matches.map(m=>m.zone.id),['NORMAL-032','NORMAL-033','NORMAL-034']);
  const result=summarizeOtherPokemon(matches,previews);
  assert.deepEqual(result.items.map(e=>e.name),['Drampa','Kangaskhan','Kecleon']);
  assert.ok(result.items.every(e=>e.count===1));
  assert.deepEqual(result.items.find(e=>e.name==='Kecleon').zones.map(z=>z.id),['NORMAL-034']);
  assert.equal(result.totalResults,3);
});

test('Observed Pokémon never appear in the other-possible list, including regional forms',()=>{
  const previews=['Alolan Raichu','Flaaffy','Ampharos'];
  const matches=searchZones(zones,{previews,type:'electric',star:4});
  const list=summarizeOtherPokemon(matches,previews).items.map(x=>x.name);
  assert.ok(!list.includes('Alolan Raichu'));
  assert.ok(!list.includes('Flaaffy'));
  assert.ok(!list.includes('Ampharos'));
  assert.ok(list.includes('Eelektross'));
  assert.ok(list.includes('Eelektrik'));
});

test('Mixed results aggregate distinct source patterns, never synthetic cross-product pairs',()=>{
  const previews=['Lampent','Litwick','Porygon'];
  const match=searchMixedZones(zones,{previews,types:['ghost','normal'],star:3});
  const summary=summarizeOtherPokemon(match,previews);
  assert.ok(summary.mixed);
  assert.ok(summary.items.length>0);
  assert.ok(summary.items.every(item=>item.zones.every(z=>z.star===3)));
  assert.ok(summary.items.every(item=>item.count===new Set(item.zones.map(z=>z.id)).size));
  assert.ok(summary.items.every(item=>item.resultIds.every(id=>id.startsWith('MIXED-'))));
});

test('A species can be recorded in multiple source zones but only once per zone',()=>{
  const synthetic=[{zone:{id:'A',type:'normal',star:4,number:1,status:'matched',groups:[{members:[{name:'B'},{name:'B'}]}]}},
    {zone:{id:'B',type:'normal',star:4,number:2,status:'matched',groups:[{members:[{name:'B'}]}]}}];
  const summary=summarizeOtherPokemon(synthetic,['A']);
  assert.equal(summary.items[0].count,2);
});

test('mixed Fairy + Poison summary is concise and ranks listed options without guessing odds',()=>{
  const previews=['Mawile','Bellsprout','Arbok'];
  const matches=searchMixedZones(zones,{previews,types:['fairy','poison'],star:3});
  const summary=summarizeOtherPokemon(matches,previews);
  assert.equal(matches.length,1);
  assert.equal(summary.items.filter(e=>e.name==='Floette').length,1);
  assert.equal(summary.items.find(e=>e.name==='Floette').forms.length,5);
  assert.equal(summary.items.find(e=>e.name==='Weepinbell').frequency,'In most possibilities');
  assert.equal(summary.items.find(e=>e.name==='Ekans').frequency,'In some possibilities');
  assert.equal(summary.items.find(e=>e.name==='Spinarak').frequency,'In a few possibilities');
  assert.equal(summary.items[0].name,'Weepinbell');
  assert.ok(summary.items.length < 27); // cosmetic form codes no longer clutter the top.
  assert.ok(summary.items.every(e=>!e.label.includes('(')));
});

test('cosmetic forms merge for top summary but regional forms remain separate',()=>{
  const combined=[{zone:{id:'A',type:'normal',star:1,number:1,status:'matched',groups:[{members:[{name:'Floette',form:'670-b'},{name:'Floette',form:'670-w'},{name:'Raichu',form:'026-a'},{name:'Raichu',form:'026'}]}]}}];
  const summary=summarizeOtherPokemon(combined,['Pidgey']);
  assert.equal(summary.items.find(x=>x.name==='Floette').count,1);
  assert.equal(summary.items.find(x=>x.name==='Floette').forms.length,2);
  assert.ok(summary.items.some(x=>x.name==='Raichu'));
  assert.ok(summary.items.some(x=>x.name==='Alolan Raichu'));
});