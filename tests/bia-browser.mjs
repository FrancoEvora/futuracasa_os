import fs from 'node:fs';
import vm from 'node:vm';
import {chromium} from '/tmp/fcp-browser/node_modules/playwright/index.mjs';
const report={at:new Date().toISOString(),preflight:[],console:[],failures:[],http:[]};
const context={window:{}};vm.runInNewContext(fs.readFileSync('portal-v1/config.js','utf8'),context);const cfg=context.window.FCP;
const endpoint=cfg.url+'/functions/v1/futura-portal';
const host=process.env.PORTAL_URL||'https://futuracasa-os.vercel.app';
for(const origin of [host,'https://futuracasa-8plbr04mv-franco-3095s-projects.vercel.app']){try{const r=await fetch(endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'apikey,authorization,content-type'},signal:AbortSignal.timeout(20000)});report.preflight.push({origin,status:r.status,allowOrigin:r.headers.get('access-control-allow-origin'),allowMethods:r.headers.get('access-control-allow-methods'),allowHeaders:r.headers.get('access-control-allow-headers'),body:(await r.text()).slice(0,300)});}catch(e){report.preflight.push({origin,error:e.message});}}
const executablePath=['/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(fs.existsSync);
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1280,height:900}});
page.on('console',m=>{if(m.type()==='error')report.console.push(m.text().slice(0,1200));});
page.on('pageerror',e=>report.console.push(e.message));
page.on('requestfailed',r=>report.failures.push({url:r.url().split('?')[0],method:r.method(),error:r.failure()?.errorText}));
page.on('response',r=>{if(r.url().includes('futura-portal')||r.url().includes('/api/bia'))report.http.push({status:r.status(),url:r.url().split('?')[0],allowOrigin:r.headers()['access-control-allow-origin']});});
let started=false;
try{await page.goto(host,{waitUntil:'networkidle',timeout:45000});report.pageTitle=await page.title();report.catalogue=await page.locator('#results-count').textContent();await page.locator('.nav-actions [data-action="chat"]').click();await page.locator('#ai-consent').check();await page.locator('#start-chat').click();await page.waitForFunction(()=>!document.querySelector('#chat-body').hidden||document.querySelector('#start-error').textContent.length>0,{},{timeout:30000});report.startError=await page.locator('#start-error').textContent();report.started=started=await page.locator('#chat-body').isVisible();if(started){await page.locator('#chat-message').fill('Quero morar em Monte Carmelo. Estou conhecendo as opções.');await page.locator('#chat-form button').click();await page.waitForFunction(()=>!document.querySelector('#chat-form button').disabled,{},{timeout:55000});report.chatError=await page.locator('#chat-error').textContent();report.mode=await page.locator('#chat-mode').textContent();report.assistantMessages=await page.locator('.message.assistant').count();}await page.screenshot({path:'bia-browser.png',fullPage:false});}catch(e){report.exception=e.message;}finally{if(started){page.on('dialog',d=>d.accept());try{await page.locator('#reset-chat').click();await page.waitForTimeout(2500);report.resetVisible=await page.locator('#chat-consent').isVisible();}catch{}}await browser.close();fs.writeFileSync('bia-browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
if(!report.started||report.chatError||report.exception)process.exitCode=1;
