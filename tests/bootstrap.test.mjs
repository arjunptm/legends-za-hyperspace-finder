import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const base = new URL('../', import.meta.url);
const script = fs.readFileSync(new URL('app.js', base), 'utf8');
const zones = JSON.parse(fs.readFileSync(new URL('data/zones.json', base), 'utf8'));

function element(id) {
  const options = [];
  return {
    id, value: id === 'zoneType' || id === 'starRating' ? 'all' : '',
    options, hidden: false, disabled: false, textContent: '', innerHTML: '',
    classList: {toggle() {}},
    listeners: {},
    append(child) {options.push(child);},
    appendChild(child) {options.push(child);},
    addEventListener(type, callback) {this.listeners[type] = callback;},
    focus() {},
    querySelector() {return null;},
    scrollIntoView() {},
  };
}

test('standalone script initializes without an ES module network import', async () => {
  assert.ok(!/^\s*(?:import|export)\s/m.test(script), 'app.js must be directly executable');
  const elements = new Map();
  const ids = ['pokemon1', 'pokemon2', 'pokemon3', 'zoneType', 'zoneType2', 'zoneType3', 'starRating', 'resultsList', 'zoneDetails', 'resultSummary', 'candidateCount', 'discoverySummary', 'discoveryCount', 'discoveryNote', 'discoveryList', 'discoveryMore', 'resultCount', 'pokemonNames', 'datasetStatus', 'clearButton', 'sampleButton', 'shareButton', 'toast'];
  ids.forEach(id => elements.set(id, element(id)));
  elements.get('zoneType').options.push({value:'all'});
  for (const id of ['zoneType2', 'zoneType3']) elements.get(id).options.push({value:''});
  elements.get('starRating').options.push({value:'all'});
  const location = {href:'https://arjunptm.github.io/legends-za-hyperspace-finder/', protocol:'https:'};
  const context = {
    document: {getElementById(id) {return elements.get(id) ?? null;},createElement(){return element('option');}},
    fetch: async () => ({ok:true,json:async () => zones}),
    URL, URLSearchParams, location, history:{replaceState(){}},
    window: {location, matchMedia:() => ({matches:false})},
    navigator:{clipboard:{writeText:async()=>{}}},
    console, setTimeout, clearTimeout,
  };
  vm.runInNewContext(script,context,{filename:'app.js'});
  await new Promise(resolve => setTimeout(resolve, 50));
  assert.equal(elements.get('datasetStatus').textContent, '507 zones · 2,533 spawn records');
  assert.ok(elements.get('sampleButton').listeners.click, 'example button bound');
  elements.get('sampleButton').listeners.click();
  assert.match(elements.get('resultCount').textContent,/combination/);
  assert.match(elements.get('discoveryList').innerHTML,/Eelektross|Eelektrik/);
});