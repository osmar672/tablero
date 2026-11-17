import {randomUUID} from 'node:crypto';
import {one,many,run} from '../db/pool.js';
import {HttpError} from '../utils/errors.js';
export async function ownedConversation(companyId,userId,id){
 const item=await one('SELECT id,title,created_at,updated_at FROM conversations WHERE id=? AND company_id=? AND user_id=?',[id,companyId,userId]);
 if(!item)throw new HttpError(404,'Conversación no encontrada');return item;
}
export async function listConversations(companyId,userId,query=''){
 // LOCATE trata %, _ y otros caracteres de búsqueda como texto literal.
 return many(`SELECT c.id,c.title,c.created_at,c.updated_at,
 (SELECT COUNT(*) FROM messages m WHERE m.conversation_id=c.id AND m.company_id=c.company_id AND m.user_id=c.user_id AND m.state='ok') AS message_count
 FROM conversations c WHERE c.company_id=? AND c.user_id=? AND
 (?='' OR LOCATE(?,c.title)>0 OR EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id=c.id AND m.company_id=c.company_id AND m.user_id=c.user_id AND m.state='ok' AND (LOCATE(?,m.question)>0 OR LOCATE(?,m.answer)>0)))
 ORDER BY c.updated_at DESC,c.id LIMIT 100`,[companyId,userId,query,query,query,query]);
}
export async function createConversation(companyId,userId,title='Nueva conversación'){
 const id=randomUUID();await run('INSERT INTO conversations(id,company_id,user_id,title) VALUES (?,?,?,?)',[id,companyId,userId,title]);return {id,title};
}
export async function conversationMessages(companyId,userId,id,limit=200){
 await ownedConversation(companyId,userId,id);
 return many("SELECT id,question,answer,sources,created_at FROM messages WHERE conversation_id=? AND company_id=? AND user_id=? AND state='ok' ORDER BY created_at DESC,id DESC LIMIT "+limit,[id,companyId,userId]);
}
export async function renameConversation(companyId,userId,id,title){
 await ownedConversation(companyId,userId,id);
 await run('UPDATE conversations SET title=?,updated_at=NOW(3) WHERE id=? AND company_id=? AND user_id=?',[title,id,companyId,userId]);
}
export function retrievalQuestion(question,turns=[],title=''){
 // Las referencias cortas a lo ya hablado recuperan el tema anterior.
 const followUp=/^(?:[¿¡]?\s*)?(y\b|eso\b|esa\b|ese\b|entonces\b|como (?:lo|la|los|las)\b|cuanto\b|cuales\b|que (?:plazo|requisito|documento)|puedo\b)/i.test(question.normalize('NFD').replace(/[\u0300-\u036f]/g,''));
 return followUp&&turns.length?`${question} ${String(title||'').slice(0,150)} ${turns.at(-1).answer?.slice(0,600)||''} ${turns.slice(-6).map(t=>t.question.slice(0,350)).join(' ')}`.slice(0,5000):question;
}
export function exportMarkdown(conversation,messages){
 return `# ${conversation.title}\n\n`+messages.map(m=>{
  const sources=typeof m.sources==='string'?JSON.parse(m.sources):m.sources||[];
  return `## Tú\n\n${m.question}\n\n## PolicyBot\n\n${m.answer}\n\n`+sources.map(s=>`- [${s.id}] ${s.name}${s.page?` · página ${s.page}`:''}${s.chunkIndex!==undefined?` · fragmento ${s.chunkIndex+1}`:''}\n  ${s.excerpt||''}`).join('\n');
 }).join('\n\n---\n\n');
}
