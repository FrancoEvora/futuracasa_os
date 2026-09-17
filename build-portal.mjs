import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url)),src=path.join(root,'portal-v1'),out=path.join(root,'dist');
const files=['index.html','admin.html','styles.css','config.js','core.mjs','app.js','admin.js','bia-enterprise.mjs'];
for(const name of ['config.js','core.mjs','app.js','admin.js','bia-enterprise.mjs']){execFileSync(process.execPath,['--input-type=module','--check'],{input:fs.readFileSync(path.join(src,name),'utf8'),stdio:['pipe','pipe','pipe']});console.log('Syntax OK: '+name);}
const core=await import('./portal-v1/core.mjs');
assert.equal(core.escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
assert.equal(core.safeURL('javascript:alert(1)'), '');
assert.equal(core.safeURL(''), '');
assert.equal(core.validPrice({price_from:432000,price_valid_until:'2020-01-01'}), null);
assert.equal(core.matches([{id:'test',status:'published',category:'misto',purposes:['morar'],city:'Monte Carmelo'}],{category:'casa'}).length,0);
assert.equal(core.matches([{id:'test',status:'published',category:'lote',purposes:['morar'],city:'Monte Carmelo'}],{category:'lote',city:'Uberlândia'}).length,0);
console.log('Selection and URL safety checks OK');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(path.join(out,'assets'),{recursive:true});
for(const file of files)fs.copyFileSync(path.join(src,file),path.join(out,file));
const assets=JSON.parse(fs.readFileSync(path.join(src,'brand-assets.json'),'utf8'));
const expected={'hero.webp':'4bad19791879c148260ea192f688d123d268d988ef9a2020e18b5ecd12c9617c','logo.webp':'08af0719a2b30fef93b39c6ea772cc51ef20c2da55f3c293e5e627dec69cb590','bia.webp':'0832d459ab67e67fc909d794ea5612b7b71d3632c507fbb3bef49ef4e4673e58'};
for(const [name,hash] of Object.entries(expected)){const bytes=Buffer.from(assets[name],'base64');assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,'Brand asset integrity: '+name);fs.writeFileSync(path.join(out,'assets',name),bytes);}
fs.writeFileSync(path.join(out,'assets','favicon.svg'),'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#171713"/><path d="M14 17h36v25H29L17 51v-9h-3z" fill="none" stroke="#f57c25" stroke-width="4" stroke-linejoin="round"/><g fill="#f57c25"><circle cx="24" cy="30" r="2.4"/><circle cx="33" cy="30" r="2.4"/><circle cx="42" cy="30" r="2.4"/></g></svg>');
fs.writeFileSync(path.join(out,'robots.txt'),'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin.html\nDisallow: /gestao\n');
const hashes=Object.fromEntries(files.map(n=>[n,createHash('sha256').update(fs.readFileSync(path.join(out,n))).digest('hex')]));
fs.writeFileSync(path.join(out,'release.json'),JSON.stringify({name:'Futura Casa Portal',version:'2.0.0',built_at:new Date().toISOString(),commit:process.env.VERCEL_GIT_COMMIT_SHA||null,checks:{javascript_syntax:true,url_safety:true,selection_rules:true,brand_asset_integrity:true},files:hashes},null,2));
console.log('Futura Casa Portal built successfully. Only dist/ is published. Legacy application files are not included.');
