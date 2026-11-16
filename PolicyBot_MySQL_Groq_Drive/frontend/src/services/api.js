export class ApiError extends Error{constructor(message,status){super(message);this.status=status;}}
export async function api(path,{method='GET',body,signal}={}){
  const options={method,credentials:'same-origin',signal,headers:{}};
  if(body instanceof FormData)options.body=body;
  else if(body!==undefined){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body);}
  const res=await fetch('/api'+path,options);
  let data={};try{data=await res.json();}catch{}
  if(!res.ok)throw new ApiError(data.error||`Error ${res.status}`,res.status);
  return data;
}
export async function chatStream(question,{onEvent,signal}={}){
  const res=await fetch('/api/chat/stream',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({question}),signal});
  if(!res.ok){let message=`Error ${res.status}`;try{message=(await res.json()).error||message;}catch{}throw new ApiError(message,res.status);}
  if(!res.body)throw new Error('Streaming no disponible');
  const reader=res.body.getReader(),decoder=new TextDecoder();let buffer='';
  try{
    while(true){const {done,value}=await reader.read();if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||'';
      for(const block of blocks){for(const line of block.split(/\r?\n/))if(line.startsWith('data:')){
        let event;try{event=JSON.parse(line.slice(5).trim());}catch{continue;}
        if(event.type==='error')throw new ApiError(event.error||'Error al generar la respuesta',event.status);
        onEvent?.(event);
      }}
    }
  }finally{reader.releaseLock();}
}
