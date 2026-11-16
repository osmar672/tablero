import mammoth from 'mammoth';
import {getDocumentProxy,extractText} from 'unpdf';
import {HttpError} from '../utils/errors.js';
export const ACCEPTED=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','text/csv'];
export async function extractFile(buffer,mime){
  if(!Buffer.isBuffer(buffer)||!buffer.length)throw new HttpError(400,'Archivo vacío');
  let text='';
  if(mime==='application/pdf'){
    if(buffer.subarray(0,5).toString()!=='%PDF-')throw new HttpError(400,'El archivo no parece ser un PDF');
    const pdf=await getDocumentProxy(new Uint8Array(buffer),{maxImageSize:16777216});
    try {if(pdf.numPages>200)throw new HttpError(413,'PDF de más de 200 páginas');const extracted=await extractText(pdf,{mergePages:true});text=Array.isArray(extracted.text)?extracted.text.join(' '):extracted.text;}
    finally{await pdf.destroy?.();}
  }else if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
    if(buffer.subarray(0,2).toString()!=='PK')throw new HttpError(400,'Archivo Word inválido');
    text=(await mammoth.extractRawText({buffer})).value;
  }else if(['text/plain','text/markdown','text/csv'].includes(mime)){
    text=buffer.toString('utf8').replace(/^\uFEFF/,'');
    if(text.includes('\u0000'))throw new HttpError(400,'Archivo de texto inválido');
  }else throw new HttpError(415,'Formato no soportado. Usa PDF, DOCX, TXT, MD o CSV');
  text=String(text||'').trim();
  if(text.length<20)throw new HttpError(422,'Documento sin texto suficiente. Los PDF escaneados requieren OCR');
  if(text.length>400000)throw new HttpError(413,'El documento supera 400.000 caracteres');
  return text;
}
