import {useEffect,useRef,useState} from 'react';
import {FileText,X} from 'lucide-react';
import {api} from '../services/api.js';
import {Notice,Spinner} from './UI.jsx';
export default function DocumentPreview({documentId,citation,onClose}){
 const dialog=useRef(null),active=useRef(null);
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 async function load(offset=0){
  active.current?.abort();const controller=new AbortController();active.current=controller;
  setLoading(true);setError('');
  try{const next=await api(`/documents/${documentId}/preview?offset=${offset}`,{signal:controller.signal});
   if(!controller.signal.aborted)setData(old=>({...next,chunks:offset?[...(old?.chunks||[]),...next.chunks]:next.chunks}));
  }catch(e){if(e.name!=='AbortError')setError(e.message);}
  finally{if(!controller.signal.aborted)setLoading(false);}
 }
 useEffect(()=>{dialog.current?.showModal();load(citation?.chunkIndex??0);return()=>active.current?.abort();},[documentId]);
 return <dialog ref={dialog} className="document-preview" aria-labelledby="preview-title" onClose={onClose}><div className="preview-header"><div><div className="eyebrow">VISTA PREVIA DEL TEXTO INDEXADO</div><h2 id="preview-title"><FileText size={19}/>{data?.document.name||'Documento'}</h2></div><button autoFocus className="icon-button" aria-label="Cerrar vista previa" onClick={()=>dialog.current?.close()}><X size={20}/></button></div>
 <div className="preview-body">{citation?.excerpt&&<blockquote className="citation-original"><strong>Fragmento consultado al generar la respuesta{citation.page?` · página ${citation.page}`:''}</strong><p>{citation.excerpt}</p><button className="text-button" onClick={()=>load(0)} disabled={loading}>Leer desde el inicio</button></blockquote>}<Notice error={error}/>{error&&<button className="btn btn-secondary" disabled={loading} onClick={()=>load(data?.nextOffset??0)}>Reintentar</button>}
 {data&&<><p className="preview-description">Este es el texto que utiliza el asistente para buscar respuestas. Los fragmentos pueden solaparse para conservar el contexto.</p>{data.chunks.length===0?<p>No hay texto indexado para este documento. Pide al administrador que revise su estado o vuelva a cargarlo.</p>:data.chunks.map(c=><section className={'preview-chunk '+(c.chunk_index===citation?.chunkIndex?'is-cited':'')} key={c.chunk_index}><h3>Fragmento {c.chunk_index+1} de {data.total}{c.page_number?` · página ${c.page_number}`:''}</h3><p>{c.content}</p></section>)}</>}
 {loading&&<Spinner label="Cargando texto…"/>}
 {data?.nextOffset!==null&&data&&!error&&<button className="btn btn-secondary" disabled={loading} onClick={()=>load(data.nextOffset)}>Cargar más texto</button>}
 </div><div className="preview-footer"><button className="btn btn-secondary" onClick={()=>dialog.current?.close()}>Cerrar</button></div></dialog>;
}
