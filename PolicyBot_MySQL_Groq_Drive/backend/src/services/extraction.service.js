import mammoth from 'mammoth';
import {getDocumentProxy,extractText,getResolvedPDFJS} from 'unpdf';
import {recognizeBuffer,recognizePdfPages} from './ocr.service.js';
import {HttpError} from '../utils/errors.js';
export const ACCEPTED=['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','text/csv','image/png','image/jpeg'];
export async function extractDocument(buffer,mime){
 if(!Buffer.isBuffer(buffer)||!buffer.length)throw new HttpError(400,'Archivo vacío');
 let pages=[];
 if(mime==='application/pdf'){
  if(buffer.subarray(0,5).toString()!=='%PDF-')throw new HttpError(400,'El archivo no parece ser un PDF');
  let pdf;const scans=[];
  try{
   pdf=await getDocumentProxy(new Uint8Array(buffer),{maxImageSize:16777216});
   if(pdf.numPages>200)throw new HttpError(413,'PDF de más de 200 páginas');
   const extracted=await extractText(pdf,{mergePages:false});
   pages=(Array.isArray(extracted.text)?extracted.text:[extracted.text]).map((text,i)=>({number:i+1,text:String(text||'').trim()}));
   const {OPS}=await getResolvedPDFJS();
   const imageOps=new Set(['paintImageXObject','paintInlineImageXObject','paintImageXObjectRepeat','paintImageMaskXObject','paintImageMaskXObjectGroup'].map(name=>OPS[name]));
   for(const page of pages.filter(p=>p.text.replace(/\s/g,'').length<80)){
    const pdfPage=await pdf.getPage(page.number),operations=await pdfPage.getOperatorList();
    if(operations.fnArray.some(op=>imageOps.has(op)))scans.push(page.number);
   }
  }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(422,'No se pudo leer el PDF. Comprueba que no esté dañado ni protegido con contraseña.');}
  finally{await pdf?.destroy?.();}
  if(scans.length){const recognized=await recognizePdfPages(buffer,scans);pages=pages.map(p=>recognized.has(p.number)?{...p,text:[p.text,recognized.get(p.number)].filter(Boolean).join('\n'),ocr:true}:p);}
 }else if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
  if(buffer.subarray(0,2).toString()!=='PK')throw new HttpError(400,'Archivo Word inválido');
  try{pages=[{number:null,text:(await mammoth.extractRawText({buffer})).value}];}
  catch{throw new HttpError(422,'No se pudo leer el documento Word. Comprueba que sea un DOCX válido.');}
 }else if(['text/plain','text/markdown','text/csv'].includes(mime)){
  let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(buffer).replace(/^\uFEFF/,'');}catch{throw new HttpError(400,'El archivo de texto debe usar codificación UTF-8');}
  if(text.includes('\u0000'))throw new HttpError(400,'Archivo de texto inválido');pages=[{number:null,text}];
 }else if(['image/png','image/jpeg'].includes(mime))pages=[{number:1,text:await recognizeBuffer(buffer),ocr:true}];
 else throw new HttpError(415,'Formato no soportado. Usa PDF, DOCX, TXT, MD, CSV, PNG o JPG');
 const text=pages.map(p=>p.text).join('\n\n').trim();
 if(text.length<20)throw new HttpError(422,'Documento sin texto suficiente. Revisa la calidad de la imagen o el contenido.');
 if(text.length>400000)throw new HttpError(413,'El documento supera 400.000 caracteres');
 return {text,pages};
}
export async function extractFile(buffer,mime){return (await extractDocument(buffer,mime)).text;}
