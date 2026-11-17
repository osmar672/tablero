import {HttpError} from '../utils/errors.js';
// A response is complete only when the provider confirms its terminal event.
export async function* readGroqStream(body,signal){
 if(!body)throw new HttpError(502,'Groq no devolvió streaming');
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='',complete=false;
 function packet(block){
  const raw=block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
  if(!raw)return null;
  if(raw==='[DONE]')return {done:true};
  try{return JSON.parse(raw);}catch{throw new HttpError(502,'El servicio de respuestas envió datos inválidos');}
 }
 try{
  while(!complete){
   signal?.throwIfAborted();
   const {done,value}=await reader.read();
   signal?.throwIfAborted();
   buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
   const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||'';
   if(done&&buffer.trim()){blocks.push(buffer);buffer='';}
   for(const block of blocks){
    const data=packet(block);if(!data)continue;
    if(data.done){complete=true;break;}
    if(data.error)throw new HttpError(502,'El servicio de respuestas no pudo completar la consulta');
    const choice=data.choices?.[0],reason=choice?.finish_reason;
    if(reason&&reason!=='stop')throw new HttpError(502,reason==='length'?'La respuesta alcanzó el límite de extensión. Formula una pregunta más concreta.':'El servicio interrumpió la respuesta. Intenta reformular la pregunta.');
    const text=choice?.delta?.content;
    if(typeof text==='string'&&text)yield {type:'delta',text};
    const usage=data.usage||data.x_groq?.usage;
    if(usage)yield {type:'usage',usage};
   }
   if(done)break;
  }
  if(!complete)throw new HttpError(502,'La conexión del servicio se interrumpió antes de terminar la respuesta');
 }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
