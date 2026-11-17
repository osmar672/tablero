import {HttpError} from './errors.js';
export function uploadFilename(original){
 let name=String(original||'');
 // Multipart browsers send UTF-8 bytes; Busboy's fallback filename charset is Latin-1.
 if(Array.from(name).every(c=>c.codePointAt(0)<=255)){
  try{name=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(name,c=>c.charCodeAt(0)));}catch{/* already decoded Latin-1/Unicode name */}
 }
 name=name.normalize('NFC').replace(/\\/g,'/').split('/').pop().replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,255);
 if(!name||name==='.'||name==='..')throw new HttpError(400,'El nombre del archivo no es válido');
 return name;
}
