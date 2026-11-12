import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assignPreviews,searchZones} from '../matcher.mjs';
const zones=JSON.parse(fs.readFileSync(new URL('../data/zones.json',import.meta.url),'utf8'));
const example=zones.find(x=>x.id==='NORMAL-011');
test('full dataset contains all parsed zones and statuses',()=>{
 assert.equal(zones.length,507);
 assert.deepEqual(zones.reduce((a,z)=>(a[z.status]=(a[z.status]||0)+1,a),{}),{matched:467,warning:33,possible:7});
});
test('preview order is irrelevant',()=>{
 let a=assignPreviews(example.groups,['Patrat','Bunnelby','Buneary']);
 let b=assignPreviews(example.groups,['Buneary','Patrat','Bunnelby']);
 assert.deepEqual(new Set(a),new Set([1,2,3]));
 assert.deepEqual(new Set(b),new Set([1,2,3]));
});
test('non-representative cluster Pokémon is matched',()=>{
 assert.equal(example.focus[0].name,'Watchog');
 assert.ok(searchZones(zones,{previews:['Patrat','Bunnelby','Buneary'],type:'normal',star:'2'}).some(x=>x.zone.id==='NORMAL-011'));
});
test('same cluster cannot satisfy two preview slots',()=>{
 const groups=[{slot:1,members:[{name:'A'},{name:'B'}]},{slot:2,members:[{name:'C'}]},{slot:3,members:[{name:'D'}]}];
 assert.equal(assignPreviews(groups,['A','B']),null);
});
test('same species may match two distinct clusters',()=>{
 const groups=[{slot:1,members:[{name:'A'}]},{slot:2,members:[{name:'A'}]},{slot:3,members:[{name:'B'}]}];
 assert.deepEqual(assignPreviews(groups,['A','A','B']),[1,2,3]);
});
test('incomplete Special zones never appear as definite matches',()=>{
 const matches=searchZones(zones,{previews:['Latias'],type:'special',star:5});
 assert.ok(matches.some(x=>x.zone.id==='SPECIAL-001'));
 assert.ok(matches.every(x=>x.quality==='possible'));
});
test('warning zones remain searchable',()=>{
 const z=zones.find(x=>x.id==='NORMAL-027');
 const names=z.groups.map(g=>g.members[0].name);
 const matches=searchZones(zones,{previews:names,type:'normal',star:3});
 assert.equal(matches.find(x=>x.zone.id===z.id)?.quality,'warning');
});

import {displayName,assignFromPool,matchesMember} from '../matcher.mjs';
test('Alolan form is separately searchable; standard Raichu never impersonates Alolan',()=>{
 const alolan={name:'Raichu',form:'026-a'};
 assert.equal(displayName(alolan),'Alolan Raichu');
 assert.equal(matchesMember(alolan,'Alolan Raichu'),true);
 assert.equal(matchesMember({name:'Raichu',form:'026'},'Alolan Raichu'),false);
});
test('observed Alolan Raichu + Flaaffy + Ampharos is a possible Electric 4-star zone 10',()=>{
 const matches=searchZones(zones,{previews:['Alolan Raichu','Flaaffy','Ampharos'],type:'electric',star:4});
 const zone=matches.find(m=>m.zone.id==='ELECTRIC-030');
 assert.ok(zone);
 assert.equal(zone.quality,'pool');
 assert.deepEqual(zone.slots,[1,2,2]);
 assert.ok(!matches.some(m=>m.zone.id==='ELECTRIC-022')); // only standard Raichu here
});
test('shared-cluster entries are possible, not confirmed',()=>{
 const groups=[{slot:1,members:[{name:'A'},{name:'B'}]},{slot:2,members:[{name:'C'}]},{slot:3,members:[{name:'D'}]}];
 assert.deepEqual(assignFromPool(groups,['A','B','D']),[1,1,3]);
 assert.equal(assignPreviews(groups,['A','B','D']),null);
 assert.equal(assignFromPool(groups,['A','A','D']),null); // same spawn record cannot count twice
});

import {searchMixedZones} from '../matcher.mjs';

test('Ghost + Normal 3-star reveals independently compatible source pools',()=>{
 const matches=searchMixedZones(zones,{previews:['Lampent','Litwick','Porygon'],types:['ghost','normal'],star:3});
 assert.equal(matches.length,1);
 const entry=matches[0];
 assert.equal(entry.kind,'mixed');
 assert.equal(entry.star,3);
 assert.ok(entry.allocationCount>0);
 const ghost=entry.sources.find(s=>s.type==='ghost');
 const normal=entry.sources.find(s=>s.type==='normal');
 assert.ok(ghost.candidates.some(c=>c.zone.id==='GHOST-011'));
 assert.ok(normal.candidates.some(c=>c.zone.id==='NORMAL-029'));
 assert.ok(entry.sources.every(s=>s.candidates.every(c=>c.zone.star===3)));
 assert.ok(!('zone' in entry)); // no fabricated source pairing
});

test('mixed search does not assign incompatible Pokémon to an unrelated type',()=>{
 assert.deepEqual(searchMixedZones(zones,{previews:['Alolan Raichu'],types:['ghost','normal'],star:3}),[]);
});

test('mixed search enforces the same star rating across types',()=>{
 const fake=[
   {id:'A1',type:'ghost',star:1,status:'matched',groups:[{slot:1,members:[{name:'A'}]},{slot:2,members:[{name:'C'}]},{slot:3,members:[{name:'D'}]}]},
   {id:'B2',type:'normal',star:2,status:'matched',groups:[{slot:1,members:[{name:'B'}]},{slot:2,members:[{name:'E'}]},{slot:3,members:[{name:'F'}]}]}
 ];
 assert.deepEqual(searchMixedZones(fake,{previews:['A','B'],types:['ghost','normal'],star:'all'}),[]);
});

test('3-type search accepts multiple preview-to-type allocations without enumerating pairs',()=>{
 const matches=searchMixedZones(zones,{previews:['Lampent','Porygon'],types:['ghost','normal','fighting'],star:3});
 assert.equal(matches.length,1);
 assert.deepEqual(matches[0].types,['ghost','normal','fighting']);
 assert.equal(matches[0].sources.length,3);
 assert.ok(matches[0].sources.every(s=>s.candidates.length>0));
});

test('mixed search will not treat Special legendary tables as verified source patterns',()=>{
 assert.deepEqual(searchMixedZones(zones,{previews:['Latias','Porygon'],types:['special','normal'],star:5}),[]);
});

test('region-specific names are not confused with similarly suffixed nonregional forms',()=>{
 assert.equal(displayName({name:'Slowbro',form:'080-g'}),'Galarian Slowbro');
 assert.equal(displayName({name:'Goodra',form:'706-h'}),'Hisuian Goodra');
 assert.equal(displayName({name:'Rotom',form:'479-h'}),'Rotom');
 assert.equal(matchesMember({name:'Slowbro',form:'080'},'Galarian Slowbro'),false);
 assert.equal(matchesMember({name:'Slowbro',form:'080-g'},'Galarian Slowbro'),true);
 assert.equal(matchesMember({name:'Goodra',form:'706-h'},'Goodra (Hisuian)'),true);
});
