import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {env} from '../config/env.js';
import {HttpError} from '../utils/errors.js';
const execute=promisify(execFile);let busy=false;
export async function withOcrDirectory(task){
 if(!env.ocrEnabled)throw new HttpError(422,'El archivo requiere OCR. El administrador debe habilitarlo.');
 if(busy)throw new HttpError(503,'El reconocimiento de texto está ocupado. Intenta cargar el archivo de nuevo en unos momentos.');
 busy=true;let dir;
 try{dir=await fs.mkdtemp(path.join(os.tmpdir(),'policybot-ocr-'));return await task(dir);}
 finally{if(dir)await fs.rm(dir,{recursive:true,force:true});busy=false;}
}
export async function recognizeImage(file){
 try{
  const {stdout}=await execute('tesseract',[file,'stdout','-l',env.ocrLang,...(env.ocrData?['--tessdata-dir',env.ocrData]:[])],{timeout:45000,maxBuffer:2000000,windowsHide:true});
  return stdout.trim();
 }catch(error){
  if(error.code==='ENOENT')throw new HttpError(503,'OCR no disponible. Instala Tesseract en el servidor.');
  throw new HttpError(422,'No se pudo reconocer el texto. Revisa la imagen y los idiomas instalados de Tesseract.');
 }
}
export async function recognizeBuffer(buffer){
 const png=buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 const jpeg=buffer[0]===255&&buffer[1]===216&&buffer[2]===255;
 if(!png&&!jpeg)throw new HttpError(400,'Imagen inválida. Usa un archivo PNG o JPEG real');
 return withOcrDirectory(async dir=>{
  const image=path.join(dir,'image.png');
  try{await sharp(buffer,{limitInputPixels:20000000}).rotate().resize({width:2000,height:2000,fit:'inside',withoutEnlargement:true}).png().toFile(image);}
  catch{throw new HttpError(422,'Imagen inválida o de más de 20 megapíxeles');}
  return recognizeImage(image);
 });
}
export async function recognizePdfPages(buffer,pageNumbers){
 if(pageNumbers.length>20)throw new HttpError(413,'El OCR admite hasta 20 páginas escaneadas por archivo');
 return withOcrDirectory(async dir=>{
  const input=path.join(dir,'source.pdf');await fs.writeFile(input,buffer,{mode:0o600});const pages=new Map();
  for(const number of pageNumbers){
   const output=path.join(dir,`page-${number}`);
   try{await execute('pdftoppm',['-f',String(number),'-l',String(number),'-singlefile','-scale-to','2000','-png',input,output],{timeout:30000,maxBuffer:1000000,windowsHide:true});}
   catch(error){throw new HttpError(error.code==='ENOENT'?503:422,'No se pudo convertir el PDF para OCR. Revisa el archivo y la instalación de Poppler.');}
   const image=output+'.png';pages.set(number,await recognizeImage(image));await fs.unlink(image);
  }
  return pages;
 });
}
