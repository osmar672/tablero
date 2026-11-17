import {z} from 'zod';
import {requestReset,accessTokenInfo,consumeAccessToken} from '../services/access.service.js';
import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import {one,many,transaction} from '../db/pool.js';
import {signupSchema,loginSchema,newPassword} from '../utils/validation.js';
import {HttpError} from '../utils/errors.js';
import {asyncHandler} from '../middlewares/error.js';
import {authenticate,setSession,clearSession} from '../middlewares/auth.js';
const router=Router();
const limiter=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Demasiados intentos. Intenta más tarde'}});
router.post('/register',limiter,asyncHandler(async(req,res)=>{
  const data=signupSchema.parse(req.body);
  const hash=await bcrypt.hash(data.password,12);
  const companyId=randomUUID(),userId=randomUUID();
  await transaction(async cx=>{
    await cx.execute(`INSERT INTO companies(id,name,plan_id) VALUES (?,?,'gratis')`,[companyId,data.companyName]);
    await cx.execute(`INSERT INTO users(id,company_id,email,name,password_hash,role) VALUES (?,?,?,?,?,'admin')`,[userId,companyId,data.email,data.name,hash]);
  });
  setSession(res,{id:userId});
  res.status(201).json({user:{id:userId,name:data.name,email:data.email,role:'admin'},company:{id:companyId,name:data.companyName,plan:'gratis'}});
}));
router.post('/login',limiter,asyncHandler(async(req,res)=>{
  const {email,password}=loginSchema.parse(req.body);
  const row=await one('SELECT id,name,email,role,password_hash,session_version FROM users WHERE email=?',[email]);
  if(!row||!(await bcrypt.compare(password,row.password_hash)))throw new HttpError(401,'Correo o contraseña incorrectos');
  setSession(res,row);res.json({user:{id:row.id,name:row.name,email:row.email,role:row.role}});
}));
const accessLimiter=rateLimit({windowMs:15*60*1000,limit:15,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Demasiados intentos. Intenta más tarde'}});
const tokenSchema=z.object({token:z.string().regex(/^[a-f0-9]{64}$/),purpose:z.enum(['reset','invite'])});
router.post('/forgot-password',accessLimiter,asyncHandler(async(req,res)=>{
 const {email}=z.object({email:z.string().trim().email().max(190).transform(x=>x.toLowerCase())}).strict().parse(req.body);
 await requestReset(email);res.json({message:'Si el correo está registrado, recibirás un enlace para cambiar tu contraseña.'});
}));
router.post('/token-info',accessLimiter,asyncHandler(async(req,res)=>{
 const {token,purpose}=tokenSchema.strict().parse(req.body);res.set('Cache-Control','no-store').json(await accessTokenInfo(token,purpose));
}));
router.post('/set-password',accessLimiter,asyncHandler(async(req,res)=>{
 const {token,purpose,password}=tokenSchema.extend({password:newPassword}).strict().parse(req.body);
 await consumeAccessToken(token,purpose,password);clearSession(res);res.json({ok:true});
}));
router.post('/logout',(_req,res)=>{clearSession(res);res.json({ok:true});});
router.get('/me',authenticate,(req,res)=>res.json({user:{id:req.user.id,name:req.user.name,email:req.user.email,role:req.user.role},company:{id:req.companyId,name:req.user.company_name,plan:req.user.plan_id}}));
export default router;
