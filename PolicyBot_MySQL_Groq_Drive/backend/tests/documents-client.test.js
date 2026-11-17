import {test} from 'node:test';
import assert from 'node:assert/strict';
import {filterDocuments,uploadDocuments} from '../../frontend/src/services/documents.js';
const docs=[{name:'Política de Vacaciones.pdf',state:'indexado',source:'upload'},{name:'Manual de vacaciones.txt',state:'error',source:'drive'},{name:'Reembolsos.csv',state:'indexado',source:'drive'}];
test('filtra por palabras, acentos, mayúsculas, estado y origen sin alterar la lista',()=>{
 assert.deepEqual(filterDocuments(docs,{query:'POLITICA vacaciones',state:'indexado',source:'upload'}),[docs[0]]);
 assert.deepEqual(filterDocuments(docs,{query:'vacaciones',source:'drive'}),[docs[1]]);
 assert.deepEqual(filterDocuments(docs,{state:'pendiente'}),[]);
 assert.equal(docs.length,3);
});
test('continúa tras fallo de un archivo, retiene resultados y carga secuencialmente',async()=>{
 let active=0;const calls=[],progress=[];
 const result=await uploadDocuments([{name:'uno.txt',size:8},{name:'dos.pdf',size:8},{name:'tres.csv',size:8}],{maxBytes:10,onProgress:p=>progress.push(p),upload:async file=>{
  active++;assert.equal(active,1);calls.push(file.name);
  await new Promise(resolve=>setTimeout(resolve,1));active--;
  if(file.name==='dos.pdf')throw new Error('Cuota alcanzada');
 }});
 assert.deepEqual(calls,['uno.txt','dos.pdf','tres.csv']);
 assert.deepEqual(result.map(r=>r.ok),[true,false,true]);
 assert.equal(result[1].error,'Cuota alcanzada');
 assert.deepEqual(progress.map(p=>[p.current,p.total]),[[1,3],[2,3],[3,3]]);
});
test('rechaza archivos vacíos, formatos no admitidos y tamaños excesivos antes de subir',async()=>{
 const sent=[];
 const result=await uploadDocuments([{name:'mal.exe',size:1},{name:'vacio.txt',size:0},{name:'grande.pdf',size:11},{name:'bien.DOCX',size:10}],{maxBytes:10,upload:async f=>sent.push(f.name)});
 assert.deepEqual(sent,['bien.DOCX']);assert.deepEqual(result.map(r=>r.ok),[false,false,false,true]);
});
