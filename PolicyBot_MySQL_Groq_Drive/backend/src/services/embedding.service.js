import {env} from '../config/env.js';
import {localEmbedding} from '../rag/localEmbedding.js';
import {HttpError} from '../utils/errors.js';
let extractor;
export function embeddingModel(){return env.embeddingProvider==='local'?'local-hash-384':env.embeddingProvider==='transformers'?`transformers:${env.localModel}`:env.voyageModel;}
export async function localSemantic(texts){
 if(!extractor)extractor=(async()=>{
  const {pipeline,env:runtime}=await import('@huggingface/transformers');
  runtime.cacheDir=env.modelCache;runtime.backends.onnx.wasm.numThreads=1;
  return pipeline('feature-extraction',env.localModel,{dtype:'q8',device:'cpu'});
 })().catch(()=>{extractor=null;throw new HttpError(503,'No se pudo cargar el modelo semántico local. Prepara el modelo o revisa la conexión del servidor.');});
 const model=await extractor;
 const output=await model(texts,{pooling:'mean',normalize:true});
 return output.tolist();
}
export async function embed(texts,type='document'){
  if(env.embeddingProvider==='local')return texts.map(localEmbedding);
  if(env.embeddingProvider==='transformers')return localSemantic(texts);
  if(!env.voyageKey)throw new HttpError(503,'Configura VOYAGE_API_KEY');
  const r=await fetch('https://api.voyageai.com/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${env.voyageKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({input:texts,model:env.voyageModel,input_type:type})});
  if(!r.ok)throw new HttpError(502,`Error al generar embeddings (${r.status})`);
  const body=await r.json();
  if(!Array.isArray(body.data)||body.data.length!==texts.length)throw new HttpError(502,'Respuesta de embeddings inesperada');
  const vectors=body.data.sort((a,b)=>a.index-b.index).map(item=>item.embedding);
  if(vectors.some(v=>!Array.isArray(v)||!v.length||v.some(n=>typeof n!=='number'||!Number.isFinite(n)))||new Set(vectors.map(v=>v.length)).size!==1)throw new HttpError(502,'Vectores semánticos inválidos');
  return vectors;
}
