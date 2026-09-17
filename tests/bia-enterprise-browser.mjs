import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from '/tmp/fcp-browser/node_modules/playwright/index.mjs';
const report={at:new Date().toISOString(),browsers:[],errors:[]};
const landing='https://enterprise.terraragroup.com.br/atendimento/solaris/cadastro';
const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
for(const [host,mobile] of [['https://futuracasa-os.vercel.app',false],['https://www.futuracasa.com.br',true]]){
 const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1280,height:900},isMobile:mobile,hasTouch:mobile});
 const page=await context.newPage();const entry={host,mobile,pageErrors:[]};let started=false;
 page.on('pageerror',e=>entry.pageErrors.push(e.message));
 try{
  await page.goto(host,{waitUntil:'networkidle',timeout:45000});
  assert.equal(await page.locator('html').getAttribute('data-bia-engine'),'enterprise');
  const release=await (await page.request.get(host+'/release.json')).json();assert.equal(release.version,'2.0.0');entry.commit=release.commit;
  await page.waitForFunction(()=>document.querySelector('#results-count')?.textContent?.includes('empreendimento'),{},{timeout:20000});entry.catalogue=await page.locator('#results-count').textContent();
  await page.locator('.nav-actions [data-action="chat"]').click();
  assert.ok((await page.locator('#chat-consent').textContent()).includes('Enterprise'));
  await page.locator('#ai-consent').check();
  const starting=page.waitForResponse(r=>r.url().endsWith('/api/bia')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='start',{timeout:35000});
  await page.locator('#start-chat').click();const sr=await starting;assert.equal(sr.status(),200);const sd=await sr.json();assert.equal(sd.engine,'enterprise');entry.central_conversation_id=sd.central_conversation_id;
  await page.waitForFunction(()=>!document.querySelector('#chat-body').hidden,{},{timeout:5000});started=true;
  assert.equal((await page.locator('#start-error').textContent()).trim(),'');entry.central_greeting=true;
  const responding=page.waitForResponse(r=>r.url().endsWith('/api/bia')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='chat',{timeout:100000});
  await page.locator('#chat-message').fill('TESTE TÉCNICO: qual é o link da página oficial de cadastro do Solaris? Quero apenas conhecer a página, sem agendar, reservar ou enviar mensagens a terceiros.');
  await page.locator('#chat-form button').click();const cr=await responding;assert.equal(cr.status(),200);const cd=await cr.json();
  assert.equal(cd.engine,'enterprise');assert.equal(cd.mode,'generative');assert.equal(cd.central.gateway,'enterprise-bia-agent-gateway');assert.equal(cd.central.legacy_conversation_pipeline,false);assert.ok(cd.answer.includes(landing));
  await page.waitForFunction(()=>!document.querySelector('#chat-form button').disabled,{},{timeout:5000});
  assert.equal((await page.locator('#chat-error').textContent()).trim(),'');assert.equal(await page.locator('#chat-body').getAttribute('data-bia-engine'),'enterprise-bia-agent-gateway');
  assert.ok(await page.locator('#messages a').evaluateAll((links,url)=>links.some(a=>a.href===url),landing));
  entry.central_runtime=cd.central.runtime_contract;entry.mode=cd.mode;entry.central_reply_rendered=(await page.locator('#messages .message.assistant').last().textContent())===cd.answer;
  assert.equal(entry.central_reply_rendered,true);entry.official_landing_clickable=true;entry.transport=cr.headers()['x-fcp-transport'];assert.equal(entry.transport,'same-origin-enterprise-v2');
  await page.screenshot({path:mobile?'bia-enterprise-mobile.png':'bia-enterprise-desktop.png',fullPage:false});
  const ending=page.waitForResponse(r=>r.url().endsWith('/api/bia')&&r.request().method()==='POST'&&r.request().postDataJSON()?.action==='erase',{timeout:25000});
  page.once('dialog',d=>d.accept());await page.locator('#reset-chat').click();const er=await ending;const ed=await er.json();assert.equal(er.status(),200);assert.equal(ed.ended,true);assert.equal(ed.history_retained,true);
  await page.waitForFunction(()=>!document.querySelector('#chat-consent').hidden,{},{timeout:5000});entry.session_ended_history_retained=true;started=false;
  assert.equal(entry.pageErrors.length,0);entry.ok=true;
 }catch(e){entry.error=e.message;report.errors.push({host,error:e.message});}
 finally{
  if(started){try{page.once('dialog',d=>d.accept());await page.locator('#reset-chat').click();await page.waitForTimeout(2000);}catch{}}
  report.browsers.push(entry);await context.close();
 }
}
try{const page=await browser.newPage();await page.goto(landing,{waitUntil:'domcontentloaded',timeout:45000});report.public_landing_title=await page.title();report.public_landing_accessible=report.public_landing_title.includes('Solaris');await page.close();}catch(e){report.landing_check_error=e.message;}
await browser.close();report.ok=report.errors.length===0&&report.browsers.every(b=>b.ok)&&report.public_landing_accessible===true;fs.writeFileSync('bia-enterprise-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.ok)process.exitCode=1;
