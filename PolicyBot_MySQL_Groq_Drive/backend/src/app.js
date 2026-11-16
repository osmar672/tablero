import express from 'express';
import helmet from 'helmet';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import auth from './routes/auth.routes.js';
import users from './routes/users.routes.js';
import docs from './routes/documents.routes.js';
import drive from './routes/drive.routes.js';
import chat from './routes/chat.routes.js';
import usage from './routes/usage.routes.js';
import {errors} from './middlewares/error.js';
import {HttpError} from './utils/errors.js';
import {env} from './config/env.js';
const app=express();app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:env.nodeEnv==='production'?undefined:false}));
app.use(express.json({limit:'40kb'}));
// Evita escrituras desde orígenes externos con cookies; Vite usa proxy same-origin.
app.use('/api',(req,res,next)=>{
  if(['POST','PUT','PATCH','DELETE'].includes(req.method)&&req.headers.origin){
    try{const origin=new URL(req.headers.origin),host=origin.host;
      const allowed=host===req.get('host')||(env.nodeEnv!=='production'&&['127.0.0.1:5173','localhost:5173'].includes(host));
      if(!allowed)return next(new HttpError(403,'Origen no autorizado'));
    }catch{return next(new HttpError(403,'Origen inválido'));}
  }next();
});
app.get('/api/health',(_req,res)=>res.json({ok:true,app:'PolicyBot',database:'mysql',chat:'groq'}));
app.use('/api/auth',auth);app.use('/api/users',users);app.use('/api/documents',docs);app.use('/api/drive',drive);app.use('/api/chat',chat);app.use('/api/usage',usage);
app.use('/api',(_req,_res,next)=>next(new HttpError(404,'Ruta no encontrada')));
const dist=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../frontend/dist');
app.use(express.static(dist,{maxAge:env.nodeEnv==='production'?'1h':0}));
app.get('/{*path}',(req,res,next)=>{if(req.method!=='GET')return next();res.sendFile(path.join(dist,'index.html'),error=>error&&next(new HttpError(404,'Frontend no compilado. Usa npm run dev')));});
app.use(errors);
export default app;
