import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const page=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const styles=fs.readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const script=fs.readFileSync(new URL('../app.js',import.meta.url),'utf8');
const worker=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');

test('phone browsers use a device-width viewport with responsive controls',()=>{
  assert.match(page, /<meta\s+name="viewport"\s+content="width=device-width, initial-scale=1"/);
  assert.match(styles, /@media\(max-width:540px\)/);
  assert.match(styles, /\.pokemon-field:nth-child\(3\)\{grid-column:1\s*\/\s*-1\}/);
  assert.match(styles, /\.field input,\.field select\{height:42px;min-width:0;font-size:16px/);
  assert.match(styles, /\.discovery-list\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test('only the quick-scan cards use the color categories',()=>{
  for(const tier of ['most','some','few']) {
    assert.match(styles,new RegExp(`\\.discovery-entry\\.frequency-${tier}\\{`));
    assert.ok(script.includes(`frequency-${'${tier}'}`),'quick summary template needs tier classes');
  }
  assert.doesNotMatch(styles,/\.extra-entry\.frequency-/);
  assert.match(script,/In most possibilities/);
});

test('service worker and HTML use the same cache-busting version',()=>{
  assert.match(page,/styles\.css\?v=7/);
  assert.match(page,/app\.js\?v=7/);
  assert.match(worker,/2026-11-12-v7/);
  assert.match(worker,/styles\.css\?v=7/);
  assert.match(worker,/app\.js\?v=7/);
});