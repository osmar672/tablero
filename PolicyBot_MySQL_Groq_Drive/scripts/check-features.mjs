/** Comprobación local: crea dos empresas temporales y elimina sus datos al terminar. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {env} from '../backend/src/config/env.js';
import {pool,run,one,many} from '../backend/src/db/pool.js';
import {createConversation,conversationMessages} from '../backend/src/services/conversations.service.js';
import {createDocument,indexDocument,previewDocument} from '../backend/src/services/documents.service.js';
import {prepareQuestion,processQuestion} from '../backend/src/services/chat.service.js';
import {inviteUser,requestReset,tokenHash} from '../backend/src/services/access.service.js';
const require=createRequire(new URL('../backend/package.json',import.meta.url)),jwt=require('jsonwebtoken');
if(env.nodeEnv==='production')throw Error('Solo se permite en desarrollo');
const base=process.env.API_URL||'http://127.0.0.1:4000/api';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Usa una API local');
const a=randomUUID(),b=randomUUID(),ua=randomUUID(),ub=randomUUID(),peer=randomUUID(),oldKey=env.groqKey;
const cookie=id=>'policybot_session='+jwt.sign({sub:id,ver:0},env.jwtSecret,{issuer:'policybot',expiresIn:'10m'});
async function request(path,{user=ua,method='GET',body}={}){
 const response=await fetch(base+path,{method,headers:{cookie:cookie(user),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 return {status:response.status,data:await response.json()};
}
try{
 for(const [id,name] of [[a,'QA funciones A'],[b,'QA funciones B']])await run("INSERT INTO companies(id,name,plan_id) VALUES (?,?,'gratis')",[id,name]);
 for(const [id,company,role] of [[ua,a,'admin'],[ub,b,'admin'],[peer,a,'colaborador']])await run('INSERT INTO users(id,company_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?)',[id,company,'QA temporal',id+'@qa.invalid','login-disabled',role]);
 const ca=await createConversation(a,ua,'Vacaciones'),cb=await createConversation(b,ub,'Solo B');
 for(const user of [ub,peer]){
  assert.equal((await request(`/chat/conversations/${ca.id}/messages`,{user})).status,404);
  assert.equal((await request(`/chat/conversations/${ca.id}/export`,{user})).status,404);
  assert.equal((await request(`/chat/conversations/${ca.id}`,{user,method:'PATCH',body:{title:'Intrusión'}})).status,404);
 }
 assert.ok(!(await request('/chat/conversations',{user:ub})).data.conversations.some(c=>c.id===ca.id));
 assert.equal((await request('/integrations',{user:peer})).status,403);
 const status=await request('/integrations');assert.equal(status.status,200);assert.ok(!JSON.stringify(status.data).includes(env.jwtSecret));
 const doc=await createDocument({companyId:a,name:'vacaciones-paginadas.pdf',mime:'application/pdf'});
 await indexDocument(a,doc,{pages:[{number:1,text:'Las vacaciones anuales corresponden a quince días hábiles por cada año trabajado.'},{number:2,text:'Para solicitar vacaciones debes completar el formulario y pedir autorización al supervisor con siete días de anticipación.'}]});
 const preview=await previewDocument(a,doc);assert.deepEqual(preview.chunks.map(c=>c.page_number),[1,2]);
 const sources=(await many('SELECT c.*,d.name AS document_name,d.id AS document_id FROM chunks c JOIN documents d ON d.id=c.document_id WHERE c.company_id=? ORDER BY c.chunk_index',[a])).map((s,i)=>({...s,ref:i+1}));
 env.groqKey='qa-injected-transport-no-network';
 const first=await prepareQuestion({companyId:a,userId:ua,conversationId:ca.id,question:'¿Cuántos días de vacaciones tenemos?',rank:async()=>sources});
 const events=[];await processQuestion({companyId:a,userId:ua,companyName:'QA',question:'¿Cuántos días de vacaciones tenemos?',prepared:first,onEvent:e=>events.push(e),groq:async function*(){yield {type:'delta',text:'Quince días hábiles [1].'};}});
 assert.equal(events.at(-1).type,'done');assert.equal(events[0].sources[1].page,2);assert.match(events[0].sources[1].excerpt,/formulario/);
 const second=await prepareQuestion({companyId:a,userId:ua,conversationId:ca.id,question:'¿Y cómo lo solicito?',rank:async(company,q)=>{assert.equal(company,a);assert.match(q,/vacaciones/);return sources;}});
 assert.equal(second.turns.length,1);
 await assert.rejects(prepareQuestion({companyId:a,userId:ua,conversationId:ca.id,question:'Otra pregunta',rank:async()=>sources}),e=>e.status===409);
 await processQuestion({companyId:a,userId:ua,companyName:'QA',question:'¿Y cómo lo solicito?',prepared:second,onEvent:()=>{},groq:async function*(prompt){assert.match(prompt[1].content,/Quince días/);yield {type:'delta',text:'Completa el formulario y pide autorización siete días antes [2].'};}});
 await assert.rejects(prepareQuestion({companyId:a,userId:ua,conversationId:cb.id,question:'Datos ajenos'}),e=>e.status===404);
 assert.equal((await conversationMessages(b,ub,cb.id)).length,0);
 const exported=await request(`/chat/conversations/${ca.id}/export`);assert.equal(exported.status,200);assert.equal(exported.data.messages.length,2);assert.match(exported.data.markdown,/página 2/);
 assert.ok((await request('/chat/conversations?q=formulario')).data.conversations.some(c=>c.id===ca.id));
 assert.equal((await request(`/chat/conversations/${ca.id}`,{method:'PATCH',body:{title:'Vacaciones y trámites'}})).status,200);
 let invite;
 const email=randomUUID()+'@qa.invalid';
 await inviteUser(a,{email,name:'Persona invitada',role:'colaborador'},{checkMail:false,deliver:async value=>{invite=value;}});
 const stored=await one('SELECT token_hash FROM auth_tokens WHERE email=?',[email]);assert.equal(stored.token_hash,tokenHash(invite.token));assert.notEqual(stored.token_hash,invite.token);
 assert.equal((await request('/auth/token-info',{method:'POST',body:{token:invite.token,purpose:'reset'}})).status,400);
 const password='ClavePruebaSegura2026!';
 assert.equal((await request('/auth/set-password',{method:'POST',body:{token:invite.token,purpose:'invite',password}})).status,200);
 assert.equal((await request('/auth/set-password',{method:'POST',body:{token:invite.token,purpose:'invite',password}})).status,400);
 const invited=await one('SELECT company_id,role FROM users WHERE email=?',[email]);assert.equal(invited.company_id,a);assert.equal(invited.role,'colaborador');
 let reset;
 await requestReset(ua+'@qa.invalid',{checkMail:false,deliver:async value=>{reset=value;}});
 let anotherReset;await requestReset(ua+'@qa.invalid',{checkMail:false,deliver:async value=>{anotherReset=value;}});
 assert.equal((await request('/auth/me')).status,200);
 const resets=await Promise.all([reset,anotherReset].map(link=>request('/auth/set-password',{method:'POST',body:{token:link.token,purpose:'reset',password}})));
 assert.deepEqual(resets.map(r=>r.status).sort(),[200,400]);
 assert.equal((await request('/auth/me')).status,401);
 const login=await request('/auth/login',{method:'POST',body:{email:ua+'@qa.invalid',password}});assert.equal(login.status,200);
 assert.equal((await request('/auth/set-password',{method:'POST',body:{token:reset.token,purpose:'reset',password}})).status,400);
 let expired;
 await requestReset(peer+'@qa.invalid',{checkMail:false,deliver:async value=>{expired=value;}});
 await run('UPDATE auth_tokens SET expires_at=UTC_TIMESTAMP()-INTERVAL 1 MINUTE WHERE token_hash=?',[tokenHash(expired.token)]);
 assert.equal((await request('/auth/set-password',{method:'POST',body:{token:expired.token,purpose:'reset',password}})).status,400);
 let delivered=false;await requestReset('unknown-'+randomUUID()+'@qa.invalid',{checkMail:false,deliver:async()=>{delivered=true;}});assert.equal(delivered,false);
 console.log('PASS: conversaciones privadas, aislamiento entre usuarios y empresas, contexto, citas con páginas, búsqueda/exportación, enlaces de un solo uso, caducidad y revocación de sesiones. Transporte de IA/correo simulado; MySQL y HTTP reales.');
}finally{
 env.groqKey=oldKey;
 for(const company of [a,b]){
  await run('DELETE FROM messages WHERE company_id=?',[company]);await run('DELETE FROM conversations WHERE company_id=?',[company]);await run('DELETE FROM documents WHERE company_id=?',[company]);await run('DELETE FROM auth_tokens WHERE company_id=?',[company]);await run('DELETE FROM users WHERE company_id=?',[company]);await run('DELETE FROM companies WHERE id=?',[company]);
 }
 await pool.end();
}
