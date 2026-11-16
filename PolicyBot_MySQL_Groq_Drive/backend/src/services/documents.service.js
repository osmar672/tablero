import {randomUUID} from 'node:crypto';
import {one,many,run,transaction} from '../db/pool.js';
import {splitText} from '../rag/chunk.js';
import {embed,embeddingModel} from './embedding.service.js';
import {HttpError} from '../utils/errors.js';
export async function listDocuments(companyId){return many(`SELECT id,name,source,mime_type,drive_url,state,error_message,chunk_count,indexed_at,created_at FROM documents WHERE company_id=? ORDER BY created_at DESC`,[companyId]);}
export async function enforceDocumentLimit(companyId){
  const quota=await one(`SELECT p.max_documents,COUNT(d.id) AS used FROM companies c JOIN plans p ON c.plan_id=p.id LEFT JOIN documents d ON d.company_id=c.id WHERE c.id=? GROUP BY c.id,p.max_documents`,[companyId]);
  if(!quota)throw new HttpError(404,'Empresa no encontrada');
  if(quota.used>=quota.max_documents)throw new HttpError(429,'Límite de documentos de tu plan alcanzado');
}
export async function createDocument({companyId,name,mime,source='upload',driveFileId=null,modified=null,url=null}){
  const id=randomUUID();
  await transaction(async cx=>{
    const [plans]=await cx.execute('SELECT p.max_documents FROM companies c JOIN plans p ON p.id=c.plan_id WHERE c.id=? FOR UPDATE',[companyId]);
    if(!plans.length)throw new HttpError(404,'Empresa no encontrada');
    const [docs]=await cx.execute('SELECT COUNT(*) AS used FROM documents WHERE company_id=?',[companyId]);
    if(docs[0].used>=plans[0].max_documents)throw new HttpError(429,'Límite de documentos de tu plan alcanzado');
    await cx.execute(`INSERT INTO documents(id,company_id,name,source,mime_type,drive_file_id,drive_modified_at,drive_url,state) VALUES (?,?,?,?,?,?,?,?, 'pendiente')`,[id,companyId,name,source,mime,driveFileId,modified,url]);
  });
  return id;
}
export async function indexDocument(companyId,documentId,text){
  const doc=await one('SELECT id FROM documents WHERE id=? AND company_id=?',[documentId,companyId]);
  if(!doc)throw new HttpError(404,'Documento no encontrado');
  const pieces=splitText(text);
  if(!pieces.length)throw new HttpError(422,'Documento sin contenido indexable');
  if(pieces.length>350)throw new HttpError(413,'Documento demasiado largo para este MVP');
  await run(`UPDATE documents SET state='indexando',error_message=NULL WHERE id=? AND company_id=?`,[documentId,companyId]);
  try{
    const vectors=[];
    for(let i=0;i<pieces.length;i+=32)vectors.push(...await embed(pieces.slice(i,i+32),'document'));
    await transaction(async cx=>{
      await cx.execute('DELETE FROM chunks WHERE document_id=? AND company_id=?',[documentId,companyId]);
      for(let i=0;i<pieces.length;i++)await cx.execute(`INSERT INTO chunks(id,company_id,document_id,chunk_index,content,embedding,embedding_model) VALUES (?,?,?,?,?,?,?)`,[randomUUID(),companyId,documentId,i,pieces[i],JSON.stringify(vectors[i]),embeddingModel()]);
      await cx.execute(`UPDATE documents SET state='indexado',chunk_count=?,indexed_at=NOW(3),error_message=NULL WHERE id=? AND company_id=?`,[pieces.length,documentId,companyId]);
    });
    return pieces.length;
  }catch(error){
    await run(`UPDATE documents SET state='error',error_message=? WHERE id=? AND company_id=?`,[String(error.message||'Error al indexar').slice(0,340),documentId,companyId]);
    throw error;
  }
}
export async function removeDocument(companyId,id){const r=await run('DELETE FROM documents WHERE id=? AND company_id=?',[id,companyId]);if(!r.affectedRows)throw new HttpError(404,'Documento no encontrado');}

export async function reindexExisting(companyId,documentId){
  const doc=await one('SELECT id FROM documents WHERE company_id=? AND id=?',[companyId,documentId]);
  if(!doc)throw new HttpError(404,'Documento no encontrado');
  const pieces=await many('SELECT id,content FROM chunks WHERE company_id=? AND document_id=? ORDER BY chunk_index',[companyId,documentId]);
  if(!pieces.length)throw new HttpError(422,'No hay texto indexado. Vuelve a cargar el archivo');
  await run("UPDATE documents SET state='indexando',error_message=NULL WHERE id=? AND company_id=?",[documentId,companyId]);
  try{
    const vectors=[];
    for(let i=0;i<pieces.length;i+=32)vectors.push(...await embed(pieces.slice(i,i+32).map(x=>x.content),'document'));
    await transaction(async cx=>{
      for(let i=0;i<pieces.length;i++)await cx.execute('UPDATE chunks SET embedding=?,embedding_model=? WHERE id=? AND company_id=?',[JSON.stringify(vectors[i]),embeddingModel(),pieces[i].id,companyId]);
      await cx.execute("UPDATE documents SET state='indexado',indexed_at=NOW(3),error_message=NULL WHERE id=? AND company_id=?",[documentId,companyId]);
    });
    return pieces.length;
  }catch(error){await run("UPDATE documents SET state='error',error_message=? WHERE id=? AND company_id=?",[String(error.message||'Error').slice(0,340),documentId,companyId]);throw error;}
}
