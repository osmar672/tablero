import mammoth from 'mammoth';
import {getDocumentProxy,extractText} from 'unpdf';
import {HttpError} from '../utils/errors.js';
export const ACCEPTED=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','text/csv'];
export async function extractFile(buffer,mime){
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw new HttpError(400,'Archivo vacío');
  let text='';
  if(mime==='application/pdf'){
    if(buffer.subarray(0,5).toString()!=='%PDF-')throw new HttpError(400,'El archivo no parece ser un PDF');
    let pdf;
    try{pdf=await getDocumentProxy(new Uint8Array(buffer),{maxImageSize:16777216});if(pdf.numPages>200)throw new HttpError(413,'PDF de más de 200 páginas');const extracted=await extractText(pdf,{mergePages:true});text=Array.isArray(extracted.text)?extracted.text.join(' '):extracted.text;}
    catch(error){if(error instanceof HttpError)throw error;throw new HttpError(422,'No se pudo leer el PDF. Comprueba que no esté dañado ni protegido con contraseña.');}
    finally{await pdf?.destroy?.();}
  }else if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
    if(buffer.subarray(0,2).toString()!=='PK')throw new HttpError(400,'Archivo Word inválido');
    try{text=(await mammoth.extractRawText({buffer})).value;}catch{throw new HttpError(422,'No se pudo leer el documento Word. Comprueba que sea un DOCX válido.');}
  }else if(['text/plain','text/markdown','text/csv'].includes(mime)){
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer).replace(/^\uFEFF/,'');}catch{throw new HttpError(400,'El archivo de texto debe usar codificación UTF-8');}
    if(text.includes('\u0000'))throw new HttpError(400,'Archivo de texto inválido');
  }else throw new HttpError(415,'Formato no soportado. Usa PDF, DOCX, TXT, MD o CSV');
  text=String(text||'').trim();
  if(text.length<20)throw new HttpError(422,'Documento sin texto suficiente. Los PDF escaneados requieren OCR');
  if(text.length>400000)throw new HttpError(413,'El documento supera 400.000 caracteres');
  return text;
}
