import {Router} from 'express';
import {z} from 'zod';
import {authenticate} from '../middlewares/auth.js';
import {asyncHandler} from '../middlewares/error.js';
import {messageSchema} from '../utils/validation.js';
import {history,prepareQuestion,processQuestion} from '../services/chat.service.js';
import {ownedConversation,listConversations,createConversation,conversationMessages,renameConversation,exportMarkdown} from '../services/conversations.service.js';
import {idSchema} from '../utils/validation.js';
const router=Router();router.use(authenticate);
router.get('/conversations',asyncHandler(async(req,res)=>{
 const query=z.string().max(150).parse(req.query.q??'');
 res.json({conversations:await listConversations(req.companyId,req.user.id,query)});
}));
router.post('/conversations',asyncHandler(async(req,res)=>{
 const {title}=z.object({title:z.string().trim().min(1).max(150).default('Nueva conversación')}).strict().parse(req.body||{});
 res.status(201).json({conversation:await createConversation(req.companyId,req.user.id,title)});
}));
router.patch('/conversations/:id',asyncHandler(async(req,res)=>{
 const id=idSchema.parse(req.params.id),{title}=z.object({title:z.string().trim().min(1).max(150)}).strict().parse(req.body);
 await renameConversation(req.companyId,req.user.id,id,title);res.json({ok:true});
}));
router.get('/conversations/:id/messages',asyncHandler(async(req,res)=>{
 const id=idSchema.parse(req.params.id);res.json({messages:await conversationMessages(req.companyId,req.user.id,id),limit:200});
}));
router.get('/conversations/:id/export',asyncHandler(async(req,res)=>{
 const id=idSchema.parse(req.params.id),conversation=await ownedConversation(req.companyId,req.user.id,id);
 const messages=(await conversationMessages(req.companyId,req.user.id,id,1001)).reverse();
 if(messages.length>1000)return res.status(413).json({error:'La conversación supera el límite de 1000 respuestas por exportación'});
 res.set('Cache-Control','no-store').json({conversation,messages,markdown:exportMarkdown(conversation,messages)});
}));
router.get('/history',asyncHandler(async(req,res)=>res.json({messages:await history(req.companyId,req.user.id)})));
router.post('/stream',asyncHandler(async(req,res)=>{
  const {question,conversationId}=messageSchema.parse(req.body);
  // Validar fuentes, credenciales y cuota ANTES de confirmar HTTP 200.
  // Así los límites realmente responden con 429, como exige la práctica.
  const controller=new AbortController();
  res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  const prepared=await prepareQuestion({companyId:req.companyId,userId:req.user.id,question,conversationId});
  res.status(200).set({'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no','Connection':'keep-alive'});
  res.flushHeaders();
  const send=(event)=>{if(!res.destroyed)res.write(`data: ${JSON.stringify(event)}\n\n`);};
  const heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': keep-alive\n\n');},15000);
  heartbeat.unref();
  try{
    await processQuestion({companyId:req.companyId,userId:req.user.id,companyName:req.user.company_name,question,onEvent:send,signal:controller.signal,prepared});
  }catch(e){console.error('Error de chat:',{status:e.status||500,name:e.name});if(!controller.signal.aborted)send({type:'error',error:e.status?e.message:'No se pudo generar la respuesta',status:e.status||500});}
  finally{clearInterval(heartbeat);if(!res.destroyed)res.end();}
}));
export default router;
