import {randomUUID} from 'node:crypto';
import {one,many,run,transaction} from '../db/pool.js';
import {rankChunks} from '../rag/retrieval.js';
import {buildPrompt,streamGroq} from './groq.service.js';
import {env} from '../config/env.js';
import {HttpError} from '../utils/errors.js';
export async function history(companyId,userId){return many(`SELECT id,question,answer,sources,input_tokens,output_tokens,state,created_at FROM messages WHERE company_id=? AND user_id=? AND state='ok' ORDER BY created_at DESC LIMIT 40`,[companyId,userId]);}
export async function reserveQuestion(companyId,userId,question){
  const id=randomUUID();
  await transaction(async cx=>{
    const [companyRows]=await cx.execute(`SELECT c.id,p.max_questions_month FROM companies c JOIN plans p ON p.id=c.plan_id WHERE c.id=? FOR UPDATE`,[companyId]);
    if(!companyRows.length)throw new HttpError(404,'Empresa no encontrada');
    const [usageRows]=await cx.execute(`SELECT COUNT(*) AS used FROM messages WHERE company_id=? AND (state='ok' OR (state='processing' AND created_at>=UTC_TIMESTAMP()-INTERVAL 15 MINUTE)) AND created_at>=DATE_FORMAT(UTC_TIMESTAMP(),'%Y-%m-01') AND created_at<DATE_FORMAT(DATE_ADD(UTC_TIMESTAMP(),INTERVAL 1 MONTH),'%Y-%m-01')`,[companyId]);
    if(usageRows[0].used>=companyRows[0].max_questions_month)throw new HttpError(429,'Has alcanzado el límite mensual de preguntas de tu plan');
    await cx.execute(`INSERT INTO messages(id,company_id,user_id,question,state) VALUES (?,?,?,?,'processing')`,[id,companyId,userId,question]);
  });return id;
}
export async function prepareQuestion({companyId,userId,question,rank=rankChunks}){
  const messageId=await reserveQuestion(companyId,userId,question);
  try{
    const sources=await rank(companyId,question);
    if(sources.length&&!env.groqKey)throw new HttpError(503,'Configura GROQ_API_KEY para utilizar el chatbot');
    return {sources,messageId};
  }catch(error){
    await run(`UPDATE messages SET state='error',answer=? WHERE id=? AND company_id=?`,[String(error.message||'Error').slice(0,200),messageId,companyId]);
    throw error;
  }
}
export async function processQuestion({companyId,userId,companyName,question,onEvent,signal,prepared=null,rank=rankChunks,groq=streamGroq}){
  const {sources,messageId}=prepared||await prepareQuestion({companyId,userId,question,rank});
  const validSources=sources.map(s=>({id:s.ref,documentId:s.document_id,name:s.document_name,url:s.drive_url||null}));
  let answer='',inputTokens=0,outputTokens=0;
  try{
    onEvent({type:'sources',sources:validSources});
    if(!sources.length){answer='No encuentro esa información en los documentos disponibles.';onEvent({type:'delta',text:answer});}
    else{
      for await(const item of groq(buildPrompt(companyName,sources,question),signal)){
        if(item.type==='delta'){answer+=item.text;onEvent(item);}
        if(item.type==='usage'){inputTokens=Number(item.usage?.prompt_tokens||0);outputTokens=Number(item.usage?.completion_tokens||0);}
      }
    }
    if(signal.aborted)throw new Error('Respuesta interrumpida');
    await run(`UPDATE messages SET answer=?,sources=?,input_tokens=?,output_tokens=?,state='ok' WHERE id=? AND company_id=?`,[answer,JSON.stringify(validSources),inputTokens,outputTokens,messageId,companyId]);
    onEvent({type:'done',messageId,inputTokens,outputTokens});
  }catch(e){await run(`UPDATE messages SET state='error',answer=? WHERE id=? AND company_id=?`,[String(e.message||'Error').slice(0,200),messageId,companyId]).catch(()=>{});throw e;}
}
