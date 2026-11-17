import fs from 'node:fs';
import path from 'node:path';
import {google} from 'googleapis';
import {randomUUID} from 'node:crypto';
import {env} from '../config/env.js';
import {one,many,run} from '../db/pool.js';
import {extractDocument} from './extraction.service.js';
import {createDocument,indexDocument} from './documents.service.js';
import {embeddingModel} from './embedding.service.js';
import {HttpError} from '../utils/errors.js';
export const DRIVE_MIMES=new Map([
  ['application/vnd.google-apps.document','text/plain'],
  ['application/vnd.google-apps.spreadsheet','text/csv']
]);
export const DOWNLOADABLE=new Set(['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','text/csv','image/png','image/jpeg']);
const active=new Set();
export function driveClient(){
  const file=path.resolve(env.backendDir,env.googleCredentials);
  if(!fs.existsSync(file))throw new HttpError(503,'No hay credenciales de Google Drive. Configura la cuenta de servicio');
  let credentials;
  try{
    if(fs.statSync(file).size>100000)throw new Error('size');
    credentials=JSON.parse(fs.readFileSync(file,'utf8'));
    if(credentials.type!=='service_account'||typeof credentials.client_email!=='string'||typeof credentials.private_key!=='string'||!credentials.private_key.includes('BEGIN PRIVATE KEY'))throw new Error('format');
  }catch{throw new HttpError(503,'La cuenta de servicio de Google Drive no está configurada correctamente. Contacta al administrador.');}
  const auth=new google.auth.GoogleAuth({credentials,scopes:['https://www.googleapis.com/auth/drive.readonly']});
  return google.drive({version:'v3',auth});
}
export function validFolder(id){return /^[A-Za-z0-9_-]{10,120}$/.test(id);}
export async function validateFolder(folderId,api=driveClient()){
  if(!validFolder(folderId))throw new HttpError(400,'ID de carpeta inválido');
  try{
    const {data}=await api.files.get({fileId:folderId,fields:'id,name,mimeType',supportsAllDrives:true});
    if(data.mimeType!=='application/vnd.google-apps.folder')throw new HttpError(400,'El ID no corresponde a una carpeta');
    return data;
  }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'No se puede acceder a la carpeta. Compártela con la cuenta de servicio');}
}
export async function listAllFiles(folderId,api=driveClient()){
  if(!validFolder(folderId))throw new HttpError(400,'ID de carpeta inválido');
  let pageToken;const items=[];
  do{
    const {data}=await api.files.list({q:`'${folderId}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,size)',pageSize:1000,pageToken,includeItemsFromAllDrives:true,supportsAllDrives:true});
    items.push(...(data.files||[]));pageToken=data.nextPageToken;
    if(items.length>2000)throw new HttpError(413,'La carpeta supera el límite de 2000 archivos del MVP');
  }while(pageToken);
  return items;
}
export async function downloadDriveFile(file,api){
  if(DRIVE_MIMES.has(file.mimeType)){
    const exportMime=DRIVE_MIMES.get(file.mimeType);
    const response=await api.files.export({fileId:file.id,mimeType:exportMime},{responseType:'arraybuffer'});
    const buffer=Buffer.isBuffer(response.data)?response.data:Buffer.from(response.data);
    if(buffer.length>env.uploadLimit)throw new HttpError(413,'Archivo demasiado grande');
    return extractDocument(buffer,exportMime);
  }
  if(!DOWNLOADABLE.has(file.mimeType))throw new HttpError(415,'Formato no soportado');
  if(Number(file.size||0)>env.uploadLimit)throw new HttpError(413,'Archivo demasiado grande');
  const response=await api.files.get({fileId:file.id,alt:'media',supportsAllDrives:true},{responseType:'arraybuffer'});
  const buffer=Buffer.isBuffer(response.data)?response.data:Buffer.from(response.data);
  if(buffer.length>env.uploadLimit)throw new HttpError(413,'Archivo demasiado grande');
  return extractDocument(buffer,file.mimeType);
}
export async function configureFolder(companyId,folderId){
  if(folderId)await validateFolder(folderId);
  await run('UPDATE companies SET drive_folder_id=? WHERE id=?',[folderId||null,companyId]);
}
export async function folderDetails(companyId){
  const c=await one('SELECT drive_folder_id FROM companies WHERE id=?',[companyId]);
  const last=await one('SELECT state,scanned,indexed,message,started_at,finished_at FROM sync_runs WHERE company_id=? ORDER BY started_at DESC LIMIT 1',[companyId]);
  return {folderId:c?.drive_folder_id||'',last};
}
export async function syncDrive(companyId,{client=null}={}){
  if(active.has(companyId))throw new HttpError(409,'Ya hay una sincronización en curso');
  active.add(companyId);const id=randomUUID();let scanned=0,indexed=0;const errors=[];
  try{
    const company=await one('SELECT drive_folder_id FROM companies WHERE id=?',[companyId]);
    if(!company?.drive_folder_id)throw new HttpError(400,'Configura primero una carpeta de Drive');
    await run('INSERT INTO sync_runs(id,company_id,state) VALUES (?, ?, ?)',[id,companyId,'running']);
    const api=client||driveClient();
    await validateFolder(company.drive_folder_id,api);
    const files=await listAllFiles(company.drive_folder_id,api);
    const supported=files.filter(f=>DRIVE_MIMES.has(f.mimeType)||DOWNLOADABLE.has(f.mimeType));
    scanned=supported.length;
    for(const file of supported){
      try{
        let doc=await one('SELECT id,drive_modified_at,state FROM documents WHERE company_id=? AND drive_file_id=?',[companyId,file.id]);
        const remoteTime=new Date(file.modifiedTime);
        if(doc?.state==='indexado'&&doc.drive_modified_at&&new Date(doc.drive_modified_at).getTime()===remoteTime.getTime()){
          const current=await one('SELECT embedding_model FROM chunks WHERE company_id=? AND document_id=? LIMIT 1',[companyId,doc.id]);
          if(current?.embedding_model===embeddingModel())continue;
        }
        const text=await downloadDriveFile(file,api);
        if(!doc){const docId=await createDocument({companyId,name:file.name,mime:file.mimeType,source:'drive',driveFileId:file.id,url:file.webViewLink||`https://drive.google.com/open?id=${file.id}`});doc={id:docId};}
        await run('UPDATE documents SET name=?,mime_type=?,drive_url=? WHERE id=? AND company_id=?',[file.name,file.mimeType,file.webViewLink||`https://drive.google.com/open?id=${file.id}`,doc.id,companyId]);
        await indexDocument(companyId,doc.id,text);
        await run('UPDATE documents SET drive_modified_at=? WHERE id=? AND company_id=?',[remoteTime,doc.id,companyId]);
        indexed++;
      }catch(e){errors.push(`${file.name}: ${e.message}`);}
    }
    // Eliminar del índice documentos previamente sincronizados que ya no están en la carpeta.
    const ids=new Set(supported.map(f=>f.id));
    const previous=await many(`SELECT id,drive_file_id FROM documents WHERE company_id=? AND source='drive'`,[companyId]);
    for(const doc of previous)if(!ids.has(doc.drive_file_id))await run('DELETE FROM documents WHERE id=? AND company_id=?',[doc.id,companyId]);
    const message=errors.length?`${errors.length} archivo(s) con error. ${errors.slice(0,2).join(' | ')}`:null;
    await run('UPDATE sync_runs SET state=?,scanned=?,indexed=?,message=?,finished_at=NOW(3) WHERE id=? AND company_id=?',[errors.length?'error':'ok',scanned,indexed,message?.slice(0,500)||null,id,companyId]);
    return {scanned,indexed,errors};
  }catch(e){await run('UPDATE sync_runs SET state=?,scanned=?,indexed=?,message=?,finished_at=NOW(3) WHERE id=? AND company_id=?',['error',scanned,indexed,String(e.message).slice(0,500),id,companyId]).catch(()=>{});throw e;}
  finally{active.delete(companyId);}
}
