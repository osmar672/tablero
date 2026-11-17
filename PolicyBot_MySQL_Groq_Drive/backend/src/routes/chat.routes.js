import {Router} from 'express';
import {authenticate} from '../middlewares/auth.js';
import {asyncHandler} from '../middlewares/error.js';
import {messageSchema} from '../utils/validation.js';
import {history,prepareQuestion,processQuestion} from '../services/chat.service.js';
const router=Router();router.use(authenticate);
router.get('/history',asyncHandler(async(req,res)=>res.json({messages:await history(req.companyId,req.user.id)})));
router.post('/stream',asyncHandler(async(req,res)=>{
  const {question}=messageSchema.parse(req.body);
  // Validar fuentes, credenciales y cuota ANTES de confirmar HTTP 200.
  // Así los límites realmente responden con 429, como exige la práctica.
  const controller=new AbortController();
  res.on('close',()=>{if(!res.writableEnded)controller.abort();});
  const prepared=await prepareQuestion({companyId:req.companyId,userId:req.user.id,question});
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
