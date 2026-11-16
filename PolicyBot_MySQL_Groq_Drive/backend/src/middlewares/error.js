import {ZodError} from 'zod';
import {HttpError} from '../utils/errors.js';
export function asyncHandler(fn){return (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);}
export function errors(error,_req,res,_next){
  if(res.headersSent)return _next(error);
  if(error instanceof ZodError)return res.status(400).json({error:'Datos inválidos',details:error.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
  if(error.code==='ER_DUP_ENTRY')return res.status(409).json({error:'El registro ya existe'});
  if(error.code==='LIMIT_FILE_SIZE')return res.status(413).json({error:'Archivo demasiado grande'});
  if(error instanceof HttpError)return res.status(error.status).json({error:error.message});
  console.error('[ERROR]',error);
  return res.status(500).json({error:'Error interno del servidor'});
}
