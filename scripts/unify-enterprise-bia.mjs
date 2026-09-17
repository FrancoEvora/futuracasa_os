import fs from 'node:fs';
import assert from 'node:assert/strict';
const read=p=>fs.readFileSync(p,'utf8');
const updates=new Map();
function once(s,oldValue,newValue,label){assert.equal(s.split(oldValue).length,2,'Expected exactly one '+label);return s.replace(oldValue,newValue);}
function range(s,start,end,replacement){const a=s.indexOf(start),b=s.indexOf(end,a+start.length);assert.ok(a>=0&&b>a,'Missing source range '+start);return s.slice(0,a)+replacement+'\n'+s.slice(b);}
let app=read('portal-v1/app.js');
assert.ok(!app.includes("from './bia-enterprise.mjs'"),'Migration already applied; do not run twice');
app="import {BIA_CONSENT_VERSION,appendBiaText,renderEnterpriseResources,enterprisePrivacy} from './bia-enterprise.mjs';\n"+app;
app=once(app,"busy=false,detailId=null;","busy=false,detailId=null,pendingTurn=null;",'chat state');
app=once(app,"if(s&&new Date(s.expires_at)>new Date())","if(s&&s.engine==='enterprise'&&new Date(s.expires_at)>new Date())",'session version gate');
app=once(app,"body.action==='chat'?55000:25000","body.action==='chat'?95000:30000",'browser timeout');
app=once(app,"n.textContent=text;$('#messages').append(n);","appendBiaText(n,text);$('#messages').append(n);",'safe text renderer');
app=range(app,'function privacy(){','function contact(',"function privacy(){dialog('Privacidade e atendimento',enterprisePrivacy);}");
app=range(app,"function openChat(prompt='')",'async function send(text)',`function openChat(prompt=''){
 if($('#content-dialog').open)$('#content-dialog').close();if(prompt)pendingPrompt=prompt;
 if(!$('#chat-dialog').open)$('#chat-dialog').showModal();$('#chat-consent').hidden=!!session;$('#chat-body').hidden=!session;
 if(session){updateProfile();$('#chat-mode').textContent='Bia do Enterprise · mesma central do WhatsApp';
  if(!$('#messages').children.length){const history=session.messages||[];if(history.length)history.forEach(m=>message(m.text,m.role));else message(session.greeting||'Olá! Sou a Bia, da Futura Casa. Como posso ajudar?');quick([]);}
  if(pendingPrompt&&!busy){const p=pendingPrompt;pendingPrompt='';send(p);}else $('#chat-message').focus();
 }
}`);
app=range(app,'async function send(text)',"$('#start-chat').addEventListener",`async function send(text){
 if(busy)return;if(!session){openChat(text);return;}text=String(text).trim();if(!text)return;
 if(text.length>800){$('#chat-error').textContent='Envie até 800 caracteres por mensagem, como no atendimento da Bia pelo WhatsApp.';return;}
 const retry=!!pendingTurn&&pendingTurn.text===text;
 if(!retry)pendingTurn={text,id:crypto.randomUUID()};
 busy=true;$('#chat-error').textContent='';$('#chat-form button').disabled=true;$('#chat-message').value='';quick([]);
 if(!retry)message(text,'user');const wait=message('Bia está consultando sua central de atendimento…','thinking');
 try{
  let r;for(let n=0;n<4;n++){r=await api({action:'chat',message:text,client_message_id:pendingTurn.id,...credentials()});if(r.status!=='processing')break;await new Promise(resolve=>setTimeout(resolve,Math.min(4000,r.retryAfterMs||1500)));}
  if(!r||r.status==='processing')throw new Error('Sua mensagem está em processamento. Aguarde e tente novamente para consultar a mesma solicitação.');
  if(r.engine!=='enterprise'||typeof r.answer!=='string')throw new Error('A conexão com a central da Bia precisa ser atualizada. Recarregue a página.');
  wait.remove();message(r.answer);profile=r.profile||profile;
  session.messages=[...(session.messages||[]),{role:'user',text},{role:'assistant',text:r.answer}].slice(-60);pendingTurn=null;remember();updateProfile();
  $('#chat-mode').textContent=r.mode==='generative'?'IA generativa · Bia do Enterprise':'Bia do Enterprise · consulta indisponível';
  $('#chat-body').dataset.biaEngine=r.central?.gateway||'enterprise-bia-agent-gateway';
  if(r.notice)message(r.notice,'notice');quick(r.quick_replies||[]);renderEnterpriseResources(r,$('#messages'));
  if(r.wants_human&&!r.followup?.recorded){const link=document.createElement('button');link.className='btn chat-handoff';link.dataset.action='contact';link.textContent='Solicitar atendimento da equipe ↗';$('#messages').append(link);}
  $('#messages').lastElementChild?.scrollIntoView({block:'nearest'});
 }catch(err){wait.remove();$('#chat-error').textContent=err.message||'Não foi possível obter uma resposta da central da Bia.';$('#chat-message').value=text;}
 finally{busy=false;$('#chat-form button').disabled=false;$('#chat-message').focus();}
}`);
app=once(app,"api({action:'start',consent:true});profile=emptyProfile();","api({action:'start',consent:true,consent_version:BIA_CONSENT_VERSION});profile=session.profile||emptyProfile();",'central session opening');
app=once(app,'Apagar a conversa e começar de novo? Solicitações já enviadas à equipe não serão apagadas.','Encerrar esta sessão e começar de novo? O histórico e as solicitações já registrados no Enterprise serão mantidos.','session-close disclosure');
app=once(app,"session=null;profile=emptyProfile();sessionStorage.removeItem('fcp-conversation')","session=null;pendingTurn=null;profile=emptyProfile();sessionStorage.removeItem('fcp-conversation')",'reset state');
app=once(app,'Não foi possível apagar a conversa: ','Não foi possível encerrar a sessão: ','close error');
updates.set('portal-v1/app.js',app);
let html=read('portal-v1/index.html');
html=once(html,'<html lang="pt-BR">','<html lang="pt-BR" data-bia-engine="enterprise">','engine marker');
html=html.replaceAll('maxlength="2000"','maxlength="800"');
html=once(html,'Sua conversa é processada por IA e pode conter erros. Não envie documentos ou dados sensíveis. A sessão expira em 24 horas; a limpeza ocorre diariamente.','Você conversa com a mesma Bia do Enterprise e do WhatsApp. As mensagens são registradas nessa central de atendimento. A sessão desta aba expira em 24 horas; reiniciar não apaga o histórico comercial. Não envie senhas ou dados sensíveis.','new consent disclosure');
html=once(html,'Li as informações e concordo com o processamento desta conversa para receber atendimento.','Li as informações e concordo com o processamento e registro desta conversa na central Enterprise para receber atendimento.','explicit central consent');
html=html.replaceAll('Apagar e reiniciar conversa','Encerrar e reiniciar conversa');
updates.set('portal-v1/index.html',html);
let admin=read('portal-v1/admin.js');
const centralPanel="<div class=\"admin-panel\"><div class=\"eyebrow\">UMA ÚNICA BIA · SITE E WHATSAPP</div><h2>Conhecimento e atendimento no Enterprise.</h2><p>O portal utiliza o mesmo agente, as mesmas ferramentas, o mesmo modelo configurado e a mesma base aprovada da Bia do WhatsApp. As antigas respostas locais não alimentam mais a conversa.</p><p>Atualize conteúdo, políticas e materiais na central Enterprise. O catálogo visual do portal continua neste painel; a publicação aqui não altera automaticamente o estoque comercial do Enterprise.</p><a class=\"btn\" href=\"https://enterprise.terraragroup.com.br/bia/gestao\" target=\"_blank\" rel=\"noopener noreferrer\">Abrir a central da Bia ↗</a></div>";
admin=once(admin,"try{if(view==='overview')",`try{if(view==='knowledge'){$('#admin-content').innerHTML=${JSON.stringify(centralPanel)};return;}if(view==='overview')`,'central knowledge view');
admin=once(admin,"['Respostas aprovadas',d,'Base de conhecimento da Bia']","['Atendimento Bia','Enterprise','Mesmo agente do WhatsApp']",'central stats');
admin=once(admin,'O catálogo que a Bia conhece começa aqui.','Catálogo do portal e Bia centralizada.','admin heading');
admin=once(admin,'A Bia consulta o catálogo e as respostas aprovadas a cada atendimento.','A Bia consulta o conhecimento, o estoque e as regras comerciais da central Enterprise. As conversas ficam nessa central; os formulários do portal permanecem no módulo Interessados.','correct admin scope');
admin=once(admin,"fetch(cfg.url+'/functions/v1/futura-portal'","fetch('/api/bia'",'admin health transport');
admin=once(admin,"Credencial de IA no servidor: ${h.ai_configured?'configurada; a execução depende do provedor':'não confirmada; atendimento guiado disponível'}.","Agente: ${h.engine==='enterprise'?'Bia do Enterprise, a mesma do WhatsApp':'conexão central não confirmada'}.",'admin central status');
admin=once(admin,'Configuração de credencial não substitui um teste real de conversa.','Nenhum prompt ou modelo próprio é mantido no portal. A disponibilidade é a do agente central.','health meaning');
admin=once(admin,'async function editor(kind,id){try{',"async function editor(kind,id){if(kind==='knowledge'){await render('knowledge');return;}try{",'prevent duplicate knowledge editor');
updates.set('portal-v1/admin.js',admin);
let proxy=read('api/bia.js');
proxy=once(proxy,'/functions/v1/futura-portal','/functions/v1/futura-enterprise-bia','central adapter destination');
proxy=once(proxy,"body.action==='chat'?43000:18000","body.action==='chat'?87000:25000",'server timeout');
proxy=proxy.replace("'same-origin-v1'","'same-origin-enterprise-v2'");
updates.set('api/bia.js',proxy);
let build=read('build-portal.mjs');
assert.equal(build.split("'config.js','core.mjs','app.js','admin.js'").length,3,'Both module lists must be updated');build=build.replaceAll("'config.js','core.mjs','app.js','admin.js'","'config.js','core.mjs','app.js','admin.js','bia-enterprise.mjs'");
// The syntax loop uses the same sequence in a separate expression on the current baseline.
if(build.includes("['config.js','core.mjs','app.js','admin.js']"))build=build.replace("['config.js','core.mjs','app.js','admin.js']","['config.js','core.mjs','app.js','admin.js','bia-enterprise.mjs']");
build=build.replace("version:'1.0.0'","version:'2.0.0'");
updates.set('build-portal.mjs',build);
const vercel=JSON.parse(read('vercel.json'));assert.ok(vercel.functions?.['api/bia.js']);vercel.functions['api/bia.js'].maxDuration=100;updates.set('vercel.json',JSON.stringify(vercel,null,2)+'\n');
const css=read('portal-v1/styles.css');updates.set('portal-v1/styles.css',css+'\n/* Central Enterprise Bia resources. */\n.message a{color:#f5b774;text-decoration:underline;overflow-wrap:anywhere}.enterprise-resources{flex-shrink:0;max-width:100%;overflow-wrap:anywhere}.enterprise-material{display:block;margin:8px 0;color:#efad6a;text-decoration:underline}.enterprise-resources p{font-size:12px;line-height:1.7}.enterprise-resources small{display:block;font-size:10px;line-height:1.7}.enterprise-resources strong{font-size:12px}\n');
for(const [file,content] of updates)fs.writeFileSync(file,content);
console.log('Updated source files:',[...updates.keys()].join(', '));
