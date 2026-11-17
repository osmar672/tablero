import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readGroqStream} from '../src/services/groq-stream.js';
const encode=new TextEncoder();
function stream(text,fragmented=false){const bytes=encode.encode(text);return new ReadableStream({start(c){if(fragmented)for(const b of bytes)c.enqueue(new Uint8Array([b]));else c.enqueue(bytes);c.close();}});}
async function collect(body,signal){const result=[];for await(const e of readGroqStream(body,signal))result.push(e);return result;}
test('Groq: decodifica fragmentos UTF-8 y conserva uso reportado',async()=>{
 const result=await collect(stream(': keep-alive\r\n\r\ndata: {"choices":[{"delta":{"content":"Política válida 🌳"}}]}\r\n\r\ndata: {"usage":{"prompt_tokens":12,"completion_tokens":5}}\r\n\r\ndata: [DONE]',true));
 assert.deepEqual(result,[{type:'delta',text:'Política válida 🌳'},{type:'usage',usage:{prompt_tokens:12,completion_tokens:5}}]);
});
test('Groq: una desconexión no se considera una respuesta terminada',async()=>{
 await assert.rejects(collect(stream('data: {"choices":[{"delta":{"content":"parcial"}}]}\n\n')),e=>e.status===502);
});
test('Groq: rechaza paquetes rotos, errores y finales por límite',async()=>{
 for(const packet of ['{roto}',JSON.stringify({error:{message:'detalle privado'}}),JSON.stringify({choices:[{finish_reason:'length'}]})]){
  await assert.rejects(collect(stream('data: '+packet+'\n\ndata: [DONE]\n\n')),e=>e.status===502&&!e.message.includes('detalle privado'));
 }
});
test('Groq: la cancelación conserva su motivo y libera el lector',async()=>{
 const c=new AbortController();c.abort();await assert.rejects(collect(stream(''),c.signal),{name:'AbortError'});
});
test('Groq: cancela el transporte al recibir el final aunque siga abierto',async()=>{
 let closed=false;const body=new ReadableStream({start(c){c.enqueue(encode.encode('data: [DONE]\n\n'));},cancel(){closed=true;}});
 await collect(body);assert.equal(closed,true);
});
