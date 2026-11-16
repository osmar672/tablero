import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {rateLimit} from 'express-rate-limit';
import {one,many,transaction} from '../db/pool.js';
import {signupSchema,loginSchema} from '../utils/validation.js';
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
  const row=await one('SELECT id,name,email,role,password_hash FROM users WHERE email=?',[email]);
  if(!row||!(await bcrypt.compare(password,row.password_hash)))throw new HttpError(401,'Correo o contraseña incorrectos');
  setSession(res,row);res.json({user:{id:row.id,name:row.name,email:row.email,role:row.role}});
}));
router.post('/logout',(_req,res)=>{clearSession(res);res.json({ok:true});});
router.get('/me',authenticate,(req,res)=>res.json({user:{id:req.user.id,name:req.user.name,email:req.user.email,role:req.user.role},company:{id:req.companyId,name:req.user.company_name,plan:req.user.plan_id}}));
export default router;
