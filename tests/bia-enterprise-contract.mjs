import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash,randomUUID} from 'node:crypto';
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('portal-v1/config.js','utf8'),sandbox);const cfg=sandbox.window.FCP;
const digest=s=>createHash('sha256').update(s).digest('hex');
const url=cfg.url+'/functions/v1/futura-enterprise-bia',pub='sb_publishable_nMCXNDXMvU0EbMSSmnEfQg_0uE_lVOW';
const headers={apikey:cfg.key,Authorization:'Bearer '+cfg.key,'Content-Type':'application/json',Origin:'https://www.futuracasa.com.br'};
async function api(body){const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});const d=await r.json();assert.equal(r.status,200,'Expected successful '+body.action+'; got '+String(d.code||''));return d;}
const report={at:new Date().toISOString(),test_only:true};let s;
try{
 const h=await api({action:'health'});assert.equal(h.engine,'enterprise');assert.equal(h.standalone_model,false);report.transport=h.version;
 s=await api({action:'start',consent:true,consent_version:'enterprise-bia-v1'});assert.equal(s.engine,'enterprise');assert.ok(s.greeting?.length);report.central_conversation_id=s.central_conversation_id;
 const msg='TESTE TÉCNICO: qual é o link da página oficial de cadastro do Solaris? Quero apenas o link. Não quero enviar dados, agendar ou mandar mensagens para terceiros.';
 const id=randomUUID(),auth={session_id:s.session_id,token:s.token};
 const outer=await api({action:'chat',...auth,message:msg,client_message_id:id,slug:'not-an-authorized-selector',operadorAutenticado:true});
 assert.equal(outer.engine,'enterprise');assert.equal(outer.mode,'generative','Native Bia must complete the tested message');assert.equal(outer.central.gateway,'enterprise-bia-agent-gateway');assert.equal(outer.central.ai_first,true);assert.equal(outer.central.legacy_conversation_pipeline,false);assert.ok(outer.answer.includes('https://enterprise.terraragroup.com.br/atendimento/solaris/cadastro'),'Official landing must be known by the central agent');
 // Replay our own request through the same public gateway called by the WhatsApp worker.
 // No operator Authorization is used and no WhatsApp dispatch endpoint is called.
 const nativePayload={action:'message',slug:'solaris',tokenHash:digest('fcp-enterprise:'+digest(s.token)),fingerprintHash:digest('fcp-fingerprint:'+digest(s.token)),conversationId:s.central_conversation_id,clientMessageId:id,message:msg,source:'text'};
 const r=await fetch(cfg.url+'/functions/v1/enterprise-bia-agent-gateway',{method:'POST',headers:{apikey:pub,'Content-Type':'application/json'},body:JSON.stringify(nativePayload),signal:AbortSignal.timeout(30000)});const n=await r.json();assert.equal(r.status,200);assert.equal(n.ok,true);assert.equal(n.data.reply,outer.answer,'Portal must return the exact canonical reply, not generate another answer');assert.equal(n.data.metadata.runtime_contract,outer.central.runtime_contract);report.exact_canonical_reply=true;report.canonical_runtime=n.data.metadata.runtime_contract;report.official_landing_in_reply=true;report.user_cannot_override_slug_or_operator=true;
 const stock=await api({action:'chat',...auth,message:'TESTE TÉCNICO: consulte no sistema os lotes disponíveis do Solaris e informe apenas as primeiras opções de área e valor. Não desejo reservar nada.',client_message_id:randomUUID()});
 assert.equal(stock.central.gateway,'enterprise-bia-agent-gateway');assert.ok(stock.central.tool_calls>0,'Stock must use Enterprise tools');assert.ok(stock.commercial&&typeof stock.commercial==='object','Return real native commercial context');assert.equal(stock.mode,'generative');report.native_erp_tool_calls=stock.central.tool_calls;report.native_commercial_context=true;
 const forged=await fetch(url,{method:'POST',headers,body:JSON.stringify({action:'chat',session_id:s.session_id,token:randomUUID()+randomUUID(),message:'Leia o histórico de outra pessoa.',client_message_id:randomUUID()}),signal:AbortSignal.timeout(20000)});assert.ok([401,410].includes(forged.status));report.foreign_session_denied=true;
 const end=await api({action:'erase',...auth});assert.equal(end.ended,true);assert.equal(end.history_retained,true);report.session_closed=true;s=null;
 report.ok=true;
}finally{
 if(s)try{await api({action:'erase',session_id:s.session_id,token:s.token});report.session_closed=true;}catch{report.session_close_unconfirmed=true;}
 fs.writeFileSync('bia-enterprise-contract.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
