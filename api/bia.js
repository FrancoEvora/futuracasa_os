// Same-origin transport for the public assistant only; no privileged credential is used.
const fs=require('node:fs');
const path=require('node:path');
const net=require('node:net');
const config=fs.readFileSync(path.join(__dirname,'../portal-v1/config.js'),'utf8');
const publicKey=config.match(/key:'([^']+)'/)?.[1];
const destination='https://qsdffayasuzsmngteika.supabase.co/functions/v1/futura-portal';
const canonical='https://futuracasa-os.vercel.app';
const allowed=new Set([canonical,'https://futuracasa-os-franco-3095s-projects.vercel.app','https://futuracasa-os-git-main-franco-3095s-projects.vercel.app','https://futuracasa.terraragroup.com.br']);
const actions=new Set(['health','start','chat','erase','lead']);
const one=v=>Array.isArray(v)?v[0]:v||'';
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('X-FCP-Transport','same-origin-v1');
 const fail=(status,error,code)=>res.status(status).json({error,code});
 const origin=one(req.headers.origin);
 if(origin&&!allowed.has(origin)&&!/^https:\/\/futuracasa-[a-z0-9]{9}-franco-3095s-projects\.vercel\.app$/.test(origin))return fail(403,'Abra a conversa pelo portal da Futura Casa.','ORIGIN_NOT_ALLOWED');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return fail(405,'Use o formulário de conversa.','METHOD_NOT_ALLOWED');}
 if(!/^application\/json(?:;|$)/i.test(one(req.headers['content-type'])))return fail(415,'Formato de solicitação inválido.','INVALID_CONTENT_TYPE');
 try{
  let body=req.body;if(typeof body==='string'){if(Buffer.byteLength(body)>20000)return fail(413,'Mensagem muito extensa.','PAYLOAD_TOO_LARGE');body=JSON.parse(body);}
  if(!body||Array.isArray(body)||!actions.has(body.action))return fail(400,'Operação não reconhecida.','INVALID_ACTION');
  const payload=JSON.stringify(body);if(Buffer.byteLength(payload)>20000)return fail(413,'Mensagem muito extensa.','PAYLOAD_TOO_LARGE');
  if(!publicKey)return fail(503,'Atendimento temporariamente indisponível.','CONFIGURATION');
  const headers={'Content-Type':'application/json',apikey:publicKey,Authorization:'Bearer '+publicKey,Origin:canonical};
  const ip=one(req.headers['x-forwarded-for']).split(',')[0].trim();if(net.isIP(ip))headers['x-forwarded-for']=ip;
  const upstream=await fetch(destination,{method:'POST',headers,body:payload,redirect:'error',signal:AbortSignal.timeout(body.action==='chat'?43000:18000)});
  let result;try{result=await upstream.json();}catch{return fail(502,'O atendimento não respondeu corretamente. Tente novamente em instantes.','INVALID_UPSTREAM_RESPONSE');}
  if(upstream.status>=500)return fail(503,'A Bia está temporariamente indisponível. Tente novamente em instantes.','SERVICE_UNAVAILABLE');
  return res.status(upstream.status).json(result);
 }catch(e){if(e instanceof SyntaxError)return fail(400,'Solicitação inválida.','INVALID_JSON');const timeout=['TimeoutError','AbortError'].includes(e?.name);return fail(timeout?504:503,timeout?'A conexão com a Bia demorou mais que o esperado. Tente novamente.':'Não foi possível conectar ao atendimento. Tente novamente em instantes.',timeout?'SERVICE_TIMEOUT':'SERVICE_UNAVAILABLE');}
};
