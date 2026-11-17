import {Router} from 'express';
import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {env} from '../config/env.js';
import {authenticate,adminOnly} from '../middlewares/auth.js';
import {asyncHandler} from '../middlewares/error.js';
import {many,one} from '../db/pool.js';
import {driveClient,validateFolder} from '../services/drive.service.js';
import {mailConfigured,mailTransport} from '../services/mail.service.js';
import {embed,embeddingModel} from '../services/embedding.service.js';
import {streamGroq} from '../services/groq.service.js';
import {HttpError} from '../utils/errors.js';
const router=Router();router.use(authenticate,adminOnly);
router.get('/',asyncHandler(async(req,res)=>{
 let drive=false;try{driveClient();drive=true;}catch{}
 const models=await many("SELECT c.embedding_model,COUNT(*) AS chunks FROM chunks c JOIN documents d ON d.id=c.document_id AND d.company_id=c.company_id WHERE c.company_id=? AND d.state='indexado' GROUP BY c.embedding_model",[req.companyId]);
 res.set('Cache-Control','no-store').json({groq:{configured:Boolean(env.groqKey),model:env.groqModel},drive:{configured:drive},mail:{configured:mailConfigured()},embeddings:{provider:env.embeddingProvider,model:embeddingModel(),indexedModels:models},ocr:{enabled:env.ocrEnabled,language:env.ocrLang}});
}));
const limit=rateLimit({windowMs:60000,limit:5,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Espera un minuto antes de repetir las pruebas'}});
router.post('/check',limit,asyncHandler(async(req,res)=>{
 const {service}=z.object({service:z.enum(['groq','drive','mail','embeddings'])}).strict().parse(req.body);
 try{
  if(service==='groq'){
   // Una respuesta corta comprueba autenticación, modelo y streaming real.
   for await(const _item of streamGroq([{role:'user',content:'Responde únicamente: conexión correcta.'}])){}
  }else if(service==='drive'){
   const company=await one('SELECT drive_folder_id FROM companies WHERE id=?',[req.companyId]);
   if(!company?.drive_folder_id)throw new HttpError(400,'Configura una carpeta en Documentos → Google Drive');
   await validateFolder(company.drive_folder_id);
  }else if(service==='mail')await mailTransport().verify();
  else await embed(['Comprobación de conexión semántica'],'query');
 }catch(error){if(error instanceof HttpError)throw error;throw new HttpError(503,'La comprobación falló. Revisa la configuración del servicio en el servidor.');}
 res.json({ok:true,message:'Conexión comprobada correctamente.'});
}));
export default router;
