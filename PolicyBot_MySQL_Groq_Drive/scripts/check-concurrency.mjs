/** Local integration check: isolated temporary company, real MySQL and running API. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
const jwt=createRequire(new URL('../backend/package.json',import.meta.url))('jsonwebtoken');
import {env} from '../backend/src/config/env.js';
import {pool,run,one} from '../backend/src/db/pool.js';
if(env.nodeEnv==='production')throw new Error('Esta comprobación solo se permite en desarrollo');
const base=process.env.API_URL||'http://127.0.0.1:4000/api';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Usa una API local para esta comprobación');
const company=randomUUID(),user=randomUUID(),plan='qa-'+randomUUID().slice(0,8);
const token=jwt.sign({sub:user},env.jwtSecret,{issuer:'policybot',expiresIn:'10m'});
const headers={cookie:'policybot_session='+token};
try{
 await run('INSERT INTO plans(id,max_documents,max_questions_month) VALUES (?,2,3)',[plan]);
 await run('INSERT INTO companies(id,name,plan_id) VALUES (?,?,?)',[company,'Comprobación temporal de concurrencia',plan]);
 await run("INSERT INTO users(id,company_id,name,email,password_hash,role) VALUES (?,?,?,?,?,'admin')",[user,company,'QA temporal',user+'@qa.invalid','login-disabled']);
 const uploads=await Promise.all(Array.from({length:8},async(_,index)=>{
  const body=new FormData();body.append('file',new Blob(['Normativa temporal para verificar límites simultáneos de carga y el aislamiento de documentos por organización.'],{type:'text/plain'}),`qa-${index}.txt`);
  const r=await fetch(base+'/documents/upload',{method:'POST',headers,body});return r.status;
 }));
 assert.equal(uploads.filter(s=>s===201).length,2);assert.equal(uploads.filter(s=>s===429).length,6);
 assert.equal((await one('SELECT COUNT(*) AS total FROM documents WHERE company_id=?',[company])).total,2);
 for(let i=0;i<2;i++)await run("INSERT INTO messages(id,company_id,user_id,question,answer,state) VALUES (?,?,?,?,?,'ok')",[randomUUID(),company,user,'Mensaje de prueba','Respuesta de prueba']);
 const questions=await Promise.all(Array.from({length:8},async()=>{
  const r=await fetch(base+'/chat/stream',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify({question:'quasarxyz nebulosaxyz'})});
  const body=await r.text();if(r.status===200){assert.match(body,/"type":"done"/);assert.match(body,/No encuentro esa información/);}return r.status;
 }));
 assert.equal(questions.filter(s=>s===200).length,1);assert.equal(questions.filter(s=>s===429).length,7);
 assert.equal((await one("SELECT COUNT(*) AS total FROM messages WHERE company_id=? AND state='ok'",[company])).total,3);
 console.log('PASS: 8 cargas simultáneas respetan 2 plazas; 8 preguntas simultáneas respetan 1 pregunta restante; SSE sin fuentes completo.');
}finally{
 await run('DELETE FROM messages WHERE company_id=?',[company]);
 await run('DELETE FROM documents WHERE company_id=?',[company]);
 await run('DELETE FROM users WHERE company_id=?',[company]);
 await run('DELETE FROM companies WHERE id=?',[company]);
 await run('DELETE FROM plans WHERE id=?',[plan]);
 await pool.end();
}
