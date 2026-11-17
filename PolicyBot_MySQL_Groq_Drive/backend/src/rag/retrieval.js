import {many} from '../db/pool.js';
import {lexicalMatch} from './lexical.js';
import {cosine} from './localEmbedding.js';
import {embed,embeddingModel} from '../services/embedding.service.js';
export async function rankChunks(companyId,question,{db=many,embedding=embed,model=embeddingModel(),limit=5,threshold}={}){
  const chunks=await db(`SELECT c.id,c.content,c.embedding,c.chunk_index,c.page_number,d.id AS document_id,d.name AS document_name,d.drive_url
    FROM chunks c JOIN documents d ON d.id=c.document_id AND d.company_id=c.company_id
    WHERE c.company_id=? AND d.company_id=? AND d.state='indexado' AND c.embedding_model=?`,[companyId,companyId,model]);
  if(!chunks.length)return [];
  const [queryVector]=await embedding([question],'query');
  const cutoff=threshold??(model.startsWith('local-')?0.075:0.17);
  const local=model.startsWith('local-');
  return chunks.map(c=>{
    const vectorScore=cosine(queryVector,typeof c.embedding==='string'?JSON.parse(c.embedding):c.embedding);
    if(!Number.isFinite(vectorScore))return {...c,score:-1};
    const {coverage,titleCoverage}=lexicalMatch(question,c.content,c.document_name);
    if(!local)return {...c,score:vectorScore+0.08*coverage+0.04*titleCoverage};
    // Una colisión del hash sin palabras compartidas no constituye una fuente.
    return {...c,score:coverage?0.65*coverage+0.2*titleCoverage+0.15*Math.max(0,vectorScore):-1};
  })
    .filter(c=>Number.isFinite(c.score)&&c.score>=cutoff)
    .sort((a,b)=>b.score-a.score).slice(0,limit)
    .map(({embedding,...c},index)=>({...c,ref:index+1}));
}
