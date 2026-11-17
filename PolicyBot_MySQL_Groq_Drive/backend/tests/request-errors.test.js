import {test} from 'node:test';
import assert from 'node:assert/strict';
import {errors} from '../src/middlewares/error.js';
import {getCookie} from '../src/middlewares/auth.js';
import {extractFile} from '../src/services/extraction.service.js';
function result(error){let code,body;const res={headersSent:false,status(n){code=n;return this;},json(data){body=data;}};errors(error,{},res,()=>assert.fail('next inesperado'));return {code,body};}
test('cookie dañada produce 401 en vez de un fallo interno',()=>{
 assert.throws(()=>getCookie({headers:{cookie:'policybot_session=%E0%A4%A'}}),e=>e.status===401);
 assert.equal(getCookie({headers:{cookie:'otra=valor'}}),null);
 assert.equal(getCookie({headers:{cookie:'otra=x; policybot_session=abc%2Edef'}}),'abc.def');
});
test('JSON inválido y cuerpo grande dan errores recuperables sin exponer el cuerpo',()=>{
 assert.deepEqual(result({type:'entity.parse.failed',body:'password=secreto'}),{code:400,body:{error:'El cuerpo de la solicitud debe ser JSON válido'}});
 assert.equal(result({type:'entity.too.large'}).code,413);
});
test('campos multipart inesperados son errores 400',()=>{
 assert.equal(result({code:'LIMIT_UNEXPECTED_FILE'}).code,400);
 assert.equal(result({code:'LIMIT_FILE_SIZE'}).code,413);
});
test('base de datos no disponible responde 503 y oculta los detalles',()=>{
 const response=result({code:'ECONNREFUSED',message:'host privado contraseña'});
 assert.equal(response.code,503);assert.ok(!JSON.stringify(response).includes('contraseña'));
});
test('texto inválido no se indexa como caracteres de reemplazo',async()=>{
 await assert.rejects(extractFile(Buffer.from([0xc3,0x28,...Buffer.from(' un contenido con longitud suficiente')]),'text/plain'),e=>e.status===400);
 assert.equal(await extractFile(Buffer.from('\ufeffPolítica válida con suficiente texto para indexar.'),'text/plain'),'Política válida con suficiente texto para indexar.');
});
test('documentos dañados producen errores de archivo, sin fallos internos',async()=>{
 await assert.rejects(extractFile(Buffer.from('PK archivo incompleto y no válido'),'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),e=>e.status===422);
 await assert.rejects(extractFile(Buffer.from('%PDF-1.7\narchivo truncado'),'application/pdf'),e=>e.status===422);
});
