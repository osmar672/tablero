import {many} from '../db/pool.js';
import {cosine} from './localEmbedding.js';
import {embed,embeddingModel} from '../services/embedding.service.js';
export async function rankChunks(companyId,question,{db=many,embedding=embed,model=embeddingModel(),limit=5,threshold}={}){
  const chunks=await db(`SELECT c.id,c.content,c.embedding,d.id AS document_id,d.name AS document_name,d.drive_url
    FROM chunks c JOIN documents d ON d.id=c.document_id AND d.company_id=c.company_id
    WHERE c.company_id=? AND d.company_id=? AND d.state='indexado' AND c.embedding_model=?`,[companyId,companyId,model]);
  if(!chunks.length)return [];
  const [queryVector]=await embedding([question],'query');
  const cutoff=threshold??(model.startsWith('local-')?0.075:0.17);
  return chunks.map(c=>({...c,score:cosine(queryVector,typeof c.embedding==='string'?JSON.parse(c.embedding):c.embedding)}))
    .filter(c=>Number.isFinite(c.score)&&c.score>=cutoff)
    .sort((a,b)=>b.score-a.score).slice(0,limit)
    .map(({embedding,...c},index)=>({...c,ref:index+1}));
}
