/** Smoke HTTP de endpoints reales. Ejecutar con backend y base de datos funcionando y con los datos demo instalados. */
import assert from 'node:assert/strict';
const base=process.env.API_URL||'http://127.0.0.1:4000/api';
async function request(route,{method='GET',body,cookie}={}){
 const opts={method,headers:{}};
 if(cookie)opts.headers.Cookie=cookie;
 if(body instanceof FormData)opts.body=body;
 else if(body){opts.headers['Content-Type']='application/json';opts.body=JSON.stringify(body);}
 const res=await fetch(base+route,opts);
 let data;try{data=await res.json();}catch{data={};}
 return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]||''};
}
const pass=process.env.DEMO_PASSWORD||'DemoSeguro2026!';
const health=await request('/health');assert.equal(health.status,200);
const a=await request('/auth/login',{method:'POST',body:{email:'admin.cafe@demo.test',password:pass}});
const b=await request('/auth/login',{method:'POST',body:{email:'admin.logistica@demo.test',password:pass}});
assert.equal(a.status,200,'Login empresa A');assert.equal(b.status,200,'Login empresa B');
const da=await request('/documents',{cookie:a.cookie}),db=await request('/documents',{cookie:b.cookie});
assert.equal(da.status,200);assert.equal(db.status,200);
assert.ok(da.data.documents.some(d=>d.name.startsWith('cafe-')));
assert.ok(db.data.documents.some(d=>d.name.startsWith('logistica-')));
assert.ok(da.data.documents.every(d=>!d.name.startsWith('logistica-')),'La empresa A no debe ver documentos de B');
assert.ok(db.data.documents.every(d=>!d.name.startsWith('cafe-')),'La empresa B no debe ver documentos de A');
const c=await request('/auth/login',{method:'POST',body:{email:'equipo.cafe@demo.test',password:pass}});
assert.equal(c.status,200);
const form=new FormData();form.append('file',new Blob(['Texto de prueba con suficiente contenido para ser válido.'],{type:'text/plain'}),'prueba.txt');
const upload=await request('/documents/upload',{method:'POST',body:form,cookie:c.cookie});assert.equal(upload.status,403,'Colaborador no puede subir');
const usage=await request('/usage',{cookie:a.cookie});assert.equal(usage.status,200);
console.log('PASS: health, autenticación A/B, aislamiento documentos, 403 colaborador, uso del plan.');
console.log('No comprueba Groq ni Drive: requieren credenciales y prueba de aceptación real.');
