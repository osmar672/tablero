import {test} from 'node:test';
import assert from 'node:assert/strict';
import {api,chatStream} from '../../frontend/src/services/api.js';
function setup(t,status){
 const events=[];
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:{dispatchEvent:e=>events.push(e.type)},configurable:true});
 t.after(()=>{if(descriptor)Object.defineProperty(globalThis,'window',descriptor);else delete globalThis.window;});
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({error:'Acceso rechazado'}),{status}));
 return events;
}
test('401 en una API privada notifica que caducó la sesión',async t=>{
 const events=setup(t,401);await assert.rejects(api('/documents'),e=>e.status===401);
 assert.deepEqual(events,['policybot:session-expired']);
});
test('credenciales incorrectas y comprobación inicial no generan caducidad global',async t=>{
 const events=setup(t,401);
 for(const path of ['/auth/login','/auth/me'])await assert.rejects(api(path));
 assert.deepEqual(events,[]);
});
test('403 no cierra una sesión válida',async t=>{
 const events=setup(t,403);await assert.rejects(api('/users'));
 assert.deepEqual(events,[]);
});
test('401 de streaming también notifica sesión terminada',async t=>{
 const events=setup(t,401);await assert.rejects(chatStream('consulta'),e=>e.status===401);
 assert.deepEqual(events,['policybot:session-expired']);
});
test('HTML inesperado no se interpreta como datos de aplicación',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('<html>proxy</html>',{status:200}));
 await assert.rejects(api('/documents'),e=>e.status===502);
});
test('respuestas JSON primitivas no pasan como un objeto válido',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('null',{status:200}));
 await assert.rejects(api('/documents'),e=>e.status===502);
});
