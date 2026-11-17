export class ApiError extends Error{constructor(message,status,details=[]){super(message);this.name='ApiError';this.status=status;this.details=details;}}
function sessionExpired(status,path){if(status===401&&!path.startsWith('/auth/')&&typeof window!=='undefined')window.dispatchEvent(new Event('policybot:session-expired'));}
export async function api(path,{method='GET',body,signal}={}){
  const options={method,credentials:'same-origin',signal,headers:{}};
  if(body instanceof FormData)options.body=body;
  else if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
  const res=await fetch('/api'+path,options);
  let data={};try{data=await res.json();}catch{signal?.throwIfAborted();if(res.ok)throw new ApiError('El servidor devolvió una respuesta no válida. Intenta de nuevo.',502);}
  if(res.ok&&(!data||typeof data!=='object'))throw new ApiError('El servidor devolvió una respuesta no válida. Intenta de nuevo.',502);
  if(!res.ok){sessionExpired(res.status,path);throw new ApiError(data.details?.find(d=>d.field==='password')?.message||data.error||`Error ${res.status}`,res.status,data.details||[]);}
  return data;
}
export async function chatStream(question,{onEvent,signal}={}){
  const res=await fetch('/api/chat/stream',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal});
  if(!res.ok){sessionExpired(res.status,'/chat/stream');let message=`Error ${res.status}`;try{message=(await res.json()).error||message;}catch{}throw new ApiError(message,res.status);}
  if(!res.body)throw new Error('Streaming no disponible');
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer='',completed=false;
  function dispatch(block){
    const data=block.split(/\r?\n/).filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data)return;
    let event;try{event=JSON.parse(data);}catch{throw new ApiError('La respuesta recibida no es válida. Intenta de nuevo.',502);}
    if(event.type==='error')throw new ApiError(event.error||'Error al generar la respuesta',event.status);
    onEvent?.(event);
    if(event.type==='done')completed=true;
  }
  try{
    while(!completed){
      signal?.throwIfAborted();
      const {done,value}=await reader.read();
      buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
      const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||'';
      for(const block of blocks){dispatch(block);if(completed)break;}
      if(done){if(!completed&&buffer.trim())dispatch(buffer);break;}
    }
    signal?.throwIfAborted();
    if(!completed)throw new ApiError('La conexión se interrumpió antes de completar la respuesta. Intenta de nuevo.',502);
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
