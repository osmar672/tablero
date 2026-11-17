/** Non-destructive local API regression checks using the prepared demo users. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {env} from '../backend/src/config/env.js';
import {pool,many} from '../backend/src/db/pool.js';
const jwt=createRequire(new URL('../backend/package.json',import.meta.url))('jsonwebtoken');
if(env.nodeEnv==='production')throw Error('Solo se permite ejecutar esta comprobación en desarrollo');
const base=process.env.API_URL||'http://127.0.0.1:4000/api';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('Selecciona una API local');
let count=0;
async function expect(path,status,options={}){const r=await fetch(base+path,{signal:AbortSignal.timeout(10000),...options});assert.equal(r.status,status,`${options.method||'GET'} ${path}`);count++;return r;}
try{
 const users=await many("SELECT id,email FROM users WHERE email IN ('admin.cafe@demo.test','admin.logistica@demo.test','equipo.cafe@demo.test')");
 assert.equal(users.length,3,'Ejecuta el seed de desarrollo');
 const cookie=email=>'policybot_session='+jwt.sign({sub:users.find(u=>u.email===email).id},env.jwtSecret,{issuer:'policybot',expiresIn:'5m'});
 const a={cookie:cookie('admin.cafe@demo.test')},b={cookie:cookie('admin.logistica@demo.test')},collaborator={cookie:cookie('equipo.cafe@demo.test')};
 const {documents}=await (await expect('/documents',200,{headers:a})).json();const doc=documents.find(d=>d.name==='cafe-vacaciones.txt');assert.ok(doc);
 await expect('/health',200);
 await expect('/documents',401);
 await expect('/documents',401,{headers:{cookie:'policybot_session=%E0%A4%A'}});
 await expect('/documents/'+doc.id+'/preview',404,{headers:b});
 await expect('/documents/'+doc.id,404,{method:'DELETE',headers:b});
 await expect('/documents/'+doc.id+'/preview',200,{headers:collaborator});
 await expect('/documents/'+doc.id+'/preview?offset=-1',400,{headers:a});
 await expect('/documents/'+doc.id+'/preview?offset=1&offset=2',400,{headers:a});
 await expect('/documents/not-a-uuid/preview',400,{headers:a});
 await expect('/chat/stream',400,{method:'POST',headers:{...a,'Content-Type':'application/json'},body:'{roto'});
 await expect('/chat/stream',413,{method:'POST',headers:{...a,'Content-Type':'application/json'},body:JSON.stringify({question:'a'.repeat(45000)})});
 await expect('/documents/upload',400,{method:'POST',headers:a,body:new FormData()});
 const unexpected=new FormData();unexpected.append('wrong',new Blob(['texto']),'archivo.txt');
 await expect('/documents/upload',400,{method:'POST',headers:a,body:unexpected});
 const invalid=new FormData();invalid.append('file',new Blob(['texto no permitido como ejecutable']),'archivo.exe');
 await expect('/documents/upload',415,{method:'POST',headers:a,body:invalid});
 const empty=new FormData();empty.append('file',new Blob([]),'vacio.txt');
 await expect('/documents/upload',400,{method:'POST',headers:a,body:empty});
 for(const [path,method] of [['/documents/upload','POST'],['/documents/'+doc.id+'/reindex','POST'],['/documents/'+doc.id,'DELETE'],['/users','POST'],['/drive','GET']])await expect(path,403,{method,headers:collaborator});
 await expect('/documents/upload',403,{method:'POST',headers:{...a,Origin:'https://external.invalid'}});
 const invalidAlgorithm='policybot_session='+jwt.sign({sub:users[0].id},env.jwtSecret,{issuer:'policybot',algorithm:'HS512'});
 await expect('/documents',401,{headers:{cookie:invalidAlgorithm}});
 await expect('/documents/'+doc.id+'/preview',200,{headers:a});
 console.log(`PASS: ${count} comprobaciones HTTP de permisos, aislamiento, cookies, JSON, multipart y validación. Sin cambios persistentes.`);
}finally{await pool.end();}
