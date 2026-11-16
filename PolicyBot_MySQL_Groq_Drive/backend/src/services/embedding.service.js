import {env} from '../config/env.js';
import {localEmbedding} from '../rag/localEmbedding.js';
import {HttpError} from '../utils/errors.js';
export function embeddingModel(){return env.embeddingProvider==='local'?'local-hash-384':env.voyageModel;}
export async function embed(texts,type='document'){
  if(env.embeddingProvider==='local')return texts.map(localEmbedding);
  if(!env.voyageKey)throw new HttpError(503,'Configura VOYAGE_API_KEY');
  const r=await fetch('https://api.voyageai.com/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${env.voyageKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({input:texts,model:env.voyageModel,input_type:type})});
  if(!r.ok)throw new HttpError(502,`Error al generar embeddings (${r.status})`);
  const body=await r.json();
  if(!Array.isArray(body.data)||body.data.length!==texts.length)throw new HttpError(502,'Respuesta de embeddings inesperada');
  return body.data.sort((a,b)=>a.index-b.index).map(item=>item.embedding);
}
