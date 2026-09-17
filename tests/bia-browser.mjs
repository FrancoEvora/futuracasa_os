import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {chromium} from '/tmp/fcp-browser/node_modules/playwright/index.mjs';
const report={at:new Date().toISOString(),preflight:[],browsers:[],errors:[]};
const context={window:{}};vm.runInNewContext(fs.readFileSync('portal-v1/config.js','utf8'),context);const cfg=context.window.FCP;
const endpoint=cfg.url+'/functions/v1/futura-portal';
const domains=['https://futuracasa-os.vercel.app','https://www.futuracasa.com.br','https://futuracasa.com.br','https://futuracasa.terraragroup.com.br','https://futuracasa-8plbr04mv-franco-3095s-projects.vercel.app'];
for(const origin of [...domains,'https://untrusted.example']){try{const r=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'apikey,authorization,content-type'},signal:AbortSignal.timeout(20000)});const row={origin,status:r.status,allowOrigin:r.headers.get('access-control-allow-origin'),version:r.headers.get('x-fcp-version')};report.preflight.push(row);if(origin==='https://untrusted.example'){assert.equal(r.status,403);assert.equal(row.allowOrigin,null);}else{assert.equal(r.status,204);assert.equal(row.allowOrigin,origin);}}catch(e){report.errors.push('preflight '+origin+': '+e.message);}}
// Wait for the deployment produced by the source fix, not an old cached release.
for(let i=0;i<20;i++){const text=await fetch(domains[0]+'/app.js',{cache:'no-store'}).then(r=>r.text());if(text.includes("fetch('/api/bia'"))break;if(i===19)throw new Error('The fixed client has not been published');await new Promise(r=>setTimeout(r,5000));}
const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
for(const [host,mobile] of [[domains[0],false],[domains[1],true]]){
 const row={host,mobile,errors:[],http:[]};const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});let started=false,injecting=false;
 page.on('pageerror',e=>row.errors.push(e.message));
 page.on('requestfailed',r=>{if(!injecting&&r.url().includes('/api/bia'))row.errors.push(r.failure()?.errorText);});
 page.on('response',r=>{if(r.url().includes('/api/bia'))row.http.push({status:r.status(),transport:r.headers()['x-fcp-transport']});});
 try{
  await page.goto(host,{waitUntil:'networkidle',timeout:45000});row.finalURL=page.url();row.catalogue=await page.locator('#results-count').textContent();
  await page.locator('.nav-actions [data-action="chat"]').click();await page.locator('#ai-consent').check();
  if(!mobile){injecting=true;await page.route('**/api/bia',r=>r.abort('failed'));await page.locator('#start-chat').click();await page.waitForFunction(()=>document.querySelector('#start-error').textContent.length>0,{},{timeout:10000});row.networkFailureMessage=await page.locator('#start-error').textContent();assert.match(row.networkFailureMessage,/Não foi possível conectar à Bia/);assert.ok(!row.networkFailureMessage.includes('Failed to fetch'));await page.unroute('**/api/bia');injecting=false;}
  await page.locator('#start-chat').click();await page.waitForFunction(()=>!document.querySelector('#chat-body').hidden||(!document.querySelector('#start-chat').disabled&&document.querySelector('#start-error').textContent.length>0),{},{timeout:30000});row.startError=await page.locator('#start-error').textContent();row.started=started=await page.locator('#chat-body').isVisible();assert.ok(started,row.startError);
  await page.locator('#chat-message').fill('Quero um lote para morar em Monte Carmelo. Ainda estou conhecendo as opções.');await page.locator('#chat-form button').click();await page.waitForFunction(()=>!document.querySelector('#chat-form button').disabled,{},{timeout:58000});row.chatError=await page.locator('#chat-error').textContent();assert.equal(row.chatError,'');row.mode=await page.locator('#chat-mode').textContent();row.assistantMessages=await page.locator('.message.assistant').count();assert.ok(row.assistantMessages>=2);assert.ok(row.http.every(r=>r.status===200&&r.transport==='same-origin-v1'));
  await page.screenshot({path:mobile?'bia-browser-mobile.png':'bia-browser.png',fullPage:false});
 }catch(e){row.errors.push(e.message);}finally{if(started){page.on('dialog',d=>d.accept());try{await page.locator('#reset-chat').click();await page.waitForFunction(()=>!document.querySelector('#chat-consent').hidden,{},{timeout:25000});row.sessionErased=true;}catch(e){row.errors.push('Session cleanup: '+e.message);}}await page.close();report.browsers.push(row);}
}
await browser.close();report.ok=report.errors.length===0&&report.browsers.every(r=>r.started&&r.sessionErased&&!r.errors.length);fs.writeFileSync('bia-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
