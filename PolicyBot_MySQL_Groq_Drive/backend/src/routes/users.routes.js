import {z} from 'zod';
import {rateLimit} from 'express-rate-limit';
import {inviteUser} from '../services/access.service.js';
import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {many,run} from '../db/pool.js';
import {authenticate,adminOnly} from '../middlewares/auth.js';
import {asyncHandler} from '../middlewares/error.js';
import {userSchema} from '../utils/validation.js';
const router=Router();router.use(authenticate,adminOnly);
const inviteLimiter=rateLimit({windowMs:3600000,limit:30,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Demasiadas invitaciones. Intenta más tarde'}});
router.post('/invite',inviteLimiter,asyncHandler(async(req,res)=>{
 const data=z.object({name:z.string().trim().min(2).max(120),email:z.string().trim().email().max(190).transform(x=>x.toLowerCase()),role:z.enum(['admin','colaborador']).default('colaborador')}).strict().parse(req.body);
 await inviteUser(req.companyId,data);res.status(201).json({message:'Invitación enviada. El enlace vence en 48 horas.'});
}));
router.get('/',asyncHandler(async(req,res)=>res.json({users:await many('SELECT id,name,email,role,created_at FROM users WHERE company_id=? ORDER BY created_at',[req.companyId])})));
router.post('/',asyncHandler(async(req,res)=>{
  const data=userSchema.parse(req.body),hash=await bcrypt.hash(data.password,12),id=randomUUID();
  await run('INSERT INTO users(id,company_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?)',[id,req.companyId,data.name,data.email,hash,data.role]);
  res.status(201).json({user:{id,name:data.name,email:data.email,role:data.role}});
}));
export default router;
