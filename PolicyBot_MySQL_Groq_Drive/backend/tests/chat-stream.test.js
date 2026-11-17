import {test} from 'node:test';
import assert from 'node:assert/strict';
import {chatStream,ApiError} from '../../frontend/src/services/api.js';
const encode=new TextEncoder();
function response(t,chunks){
 let cancelled=false;
 const body=new ReadableStream({start(c){for(const chunk of chunks)c.enqueue(typeof chunk==='string'?encode.encode(chunk):chunk);c.close();},cancel(){cancelled=true;}});
 t.mock.method(globalThis,'fetch',async()=>new Response(body));
 return ()=>cancelled;
}
test('reconstruye caracteres UTF-8 y eventos repartidos entre paquetes',async t=>{
 const bytes=encode.encode('data: {"type":"delta","text":"política 🌳"}\r\n\r\ndata: {"type":"done"}\r\n\r\n');
 response(t,Array.from(bytes,b=>new Uint8Array([b])));
 const events=[];await chatStream('pregunta',{onEvent:e=>events.push(e)});
 assert.deepEqual(events,[{type:'delta',text:'política 🌳'},{type:'done'}]);
});
test('acepta el evento final sin separador al cerrar',async t=>{
 response(t,[': heartbeat\n\ndata: {"type":"done"}']);
 const events=[];await chatStream('pregunta',{onEvent:e=>events.push(e)});
 assert.deepEqual(events,[{type:'done'}]);
});
test('rechaza una conexión cerrada sin done y conserva los fragmentos recibidos',async t=>{
 response(t,['data: {"type":"delta","text":"parcial"}\n\n']);
 const events=[];await assert.rejects(chatStream('pregunta',{onEvent:e=>events.push(e)}),/conexión se interrumpió/);
 assert.equal(events[0].text,'parcial');
});
test('propaga errores SSE con su estado',async t=>{
 response(t,['data: {"type":"error","status":429,"error":"Cuota agotada"}\n\n']);
 await assert.rejects(chatStream('pregunta'),e=>e instanceof ApiError&&e.status===429&&e.message==='Cuota agotada');
});
test('rechaza eventos JSON malformados',async t=>{
 response(t,['data: {malformado}\n\n']);
 await assert.rejects(chatStream('pregunta'),/no es válida/);
});
test('la cancelación conserva AbortError',async t=>{
 response(t,[]);const c=new AbortController();c.abort();
 await assert.rejects(chatStream('pregunta',{signal:c.signal}),{name:'AbortError'});
});
test('libera la conexión al recibir done sin esperar un cierre del servidor',async t=>{
 let cancelled=false;
 t.mock.method(globalThis,'fetch',async()=>new Response(new ReadableStream({start(c){c.enqueue(encode.encode('data: {"type":"done"}\n\n'));},cancel(){cancelled=true;}})));
 await chatStream('pregunta');assert.equal(cancelled,true);
});
test('propaga errores HTTP previos al streaming',async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response(JSON.stringify({error:'Inicia sesión'}),{status:401}));
 await assert.rejects(chatStream('pregunta'),e=>e.status===401&&e.message==='Inicia sesión');
});
