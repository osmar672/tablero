import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {rankChunks} from '../src/rag/retrieval.js';
import {localEmbedding} from '../src/rag/localEmbedding.js';
import {lexicalMatch} from '../src/rag/lexical.js';
const fixtures=await Promise.all(['vacaciones','reembolsos','teletrabajo'].map(async topic=>{
 const content=await fs.readFile(new URL(`../../database/fixtures/cafe-${topic}.txt`,import.meta.url),'utf8');
 return {id:topic,document_id:topic,document_name:`cafe-${topic}.txt`,content,embedding:JSON.stringify(localEmbedding(content))};
}));
const embedding=async texts=>texts.map(localEmbedding);
for(const [question,expected] of [['¿Cómo solicito un reembolso?','reembolsos'],['¿Cuántos días de vacaciones tenemos?','vacaciones'],['¿Cuál es la política de teletrabajo?','teletrabajo']]){
 test(`recupera la política correspondiente: ${question}`,async()=>{
  const found=await rankChunks('empresa-a',question,{db:async()=>fixtures,embedding,model:'local-hash-384'});
  assert.equal(found[0]?.document_id,expected);
  assert.equal(found[0].ref,1);assert.ok(!('embedding' in found[0]));
 });
}
test('acentos y plural coinciden sin regenerar embeddings',()=>{
 assert.equal(lexicalMatch('vacación','Vacaciones anuales').coverage,1);
 assert.equal(lexicalMatch('reembolso','reembolsos aprobados').coverage,1);
});
test('descarta colisiones de hash sin coincidencia léxica',async()=>{
 const question='astronomia galaxias';
 const result=await rankChunks('empresa-a',question,{db:async()=>[{...fixtures[0],embedding:localEmbedding(question)}],embedding,model:'local-hash-384'});
 assert.deepEqual(result,[]);
});
test('mantiene filtros de empresa y modelo en la consulta',async()=>{
 await rankChunks('empresa-a','vacaciones',{model:'local-hash-384',embedding,db:async(sql,params)=>{
  assert.deepEqual(params,['empresa-a','empresa-a','local-hash-384']);
  assert.match(sql,/d.company_id=c.company_id/);assert.match(sql,/d.state='indexado'/);return [];
 }});
});
test('conserva el ranking vectorial de proveedores semánticos',async()=>{
 const result=await rankChunks('empresa-a','consulta sin palabras coincidentes',{model:'voyage-test',embedding:async()=>[[1,0]],db:async()=>[{...fixtures[0],embedding:[1,0]},{...fixtures[1],embedding:[0,1]}]});
 assert.equal(result.length,1);assert.equal(result[0].score,1);
});
