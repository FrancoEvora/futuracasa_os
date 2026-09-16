import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export async function verifyPortal(){
 const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('./portal-v1/config.js',import.meta.url),'utf8'),context);const cfg=context.window.FCP;
 const headers={apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json',Origin:'https://futuracasa-os.vercel.app'};
 async function call(body){const r=await fetch(cfg.url+'/functions/v1/futura-portal',{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(45000)});const d=await r.json();assert.equal(r.status,200,'Backend status for '+body.action);return d;}
 const catalogResponse=await fetch(cfg.url+'/rest/v1/fcp_projects?status=eq.published&select=id,name,category,status',{headers});assert.equal(catalogResponse.status,200);const projects=await catalogResponse.json();assert.ok(Array.isArray(projects)&&projects.length>0,'Published catalogue');
 const privateResponse=await fetch(cfg.url+'/rest/v1/fcp_leads?select=id&limit=1',{headers});assert.ok([401,403].includes(privateResponse.status),'Private leads must not be anonymously readable');
 const health=await call({action:'health'});assert.equal(health.catalog,'connected');
 const s=await call({action:'start',consent:true});const credentials={session_id:s.session_id,token:s.token};let testRequestId=null;
 try{
 const first=await call({action:'chat',...credentials,message:'Quero um lote para morar em Monte Carmelo, perto da natureza. Prefiro informar meu orçamento depois.'});assert.equal(first.mode,'generative','Bia must answer through the real AI provider');assert.equal(first.profile.category,'lote');assert.equal(first.profile.purpose,'morar');assert.ok(first.answer.length>20);assert.ok(first.recommendations.length>0,'Relevant real catalogue recommendation');
 const second=await call({action:'chat',...credentials,message:'Mudei minha busca: agora procuro uma casa pronta em Uberlândia. Não quero lote.'});assert.equal(second.mode,'generative');assert.equal(second.profile.category,'casa');assert.equal(second.recommendations.length,0,'Do not substitute an unrelated catalogue property');
 testRequestId=randomUUID();const payload={action:'lead',...credentials,request_id:testRequestId,name:'TESTE TECNICO PUBLICACAO FUTURA CASA',phone:'34900000000',message:'Registro sintético de teste de publicação. Não contatar. Limpeza técnica após validação.',request_type:'atendimento',consent:true,consent_share:false,marketing_opt_in:false};
 const firstLead=await call(payload);assert.equal(firstLead.received,true);const duplicate=await call(payload);assert.equal(duplicate.protocol,firstLead.protocol,'Retry must confirm the same lead');
 const erased=await call({action:'erase',...credentials});assert.equal(erased.erased,true);
 console.log('Live tests passed: catalogue, private data denial, generative Bia, profile correction, lead delivery, duplicate protection, session erasure.');
 return {tested_at:new Date().toISOString(),backend_version:health.version,catalogue:true,anonymous_leads_denied:true,generative_bia:true,profile_correction:true,lead_delivery:true,idempotency:true,session_erasure:true,synthetic_lead_request_id:testRequestId};
 }catch(e){console.error('Live validation failed. Synthetic request to inspect:',testRequestId||'none');try{await call({action:'erase',...credentials});}catch{}throw e;}
}
