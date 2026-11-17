import {ZodError} from 'zod';
import {HttpError} from '../utils/errors.js';
export function asyncHandler(fn){return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);}
export function errors(error,_req,res,_next){
  if(res.headersSent)return _next(error);
  if(error.type==='entity.parse.failed')return res.status(400).json({error:'El cuerpo de la solicitud debe ser JSON válido'});
  if(error.type==='entity.too.large')return res.status(413).json({error:'La solicitud supera el tamaño permitido'});
  if(['LIMIT_UNEXPECTED_FILE','LIMIT_FILE_COUNT','LIMIT_PART_COUNT','LIMIT_FIELD_COUNT'].includes(error.code))return res.status(400).json({error:'Envía un solo archivo en el campo file'});
  if(['ECONNREFUSED','PROTOCOL_CONNECTION_LOST','ER_CON_COUNT_ERROR','ETIMEDOUT'].includes(error.code))return res.status(503).json({error:'Servicio temporalmente no disponible. Intenta de nuevo en unos momentos'});
  if(error instanceof ZodError)return res.status(400).json({error:'Datos inválidos',details:error.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
  if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'El registro ya existe'});
  if(error.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'Archivo demasiado grande'});
  if(error instanceof HttpError)return res.status(error.status).json({error:error.message});
  console.error('[ERROR]',{name:error.name||'Error',code:error.code||'UNEXPECTED'});
  return res.status(500).json({error:'Error interno del servidor'});
}
