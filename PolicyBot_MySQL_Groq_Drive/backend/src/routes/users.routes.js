import {Router} from 'express';
import bcrypt from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {many,run} from '../db/pool.js';
import {authenticate,adminOnly} from '../middlewares/auth.js';
import {asyncHandler} from '../middlewares/error.js';
import {userSchema} from '../utils/validation.js';
const router=Router();router.use(authenticate,adminOnly);
router.get('/',asyncHandler(async(req,res)=>res.json({users:await many('SELECT id,name,email,role,created_at FROM users WHERE company_id=? ORDER BY created_at',[req.companyId])})));
router.post('/',asyncHandler(async(req,res)=>{
  const data=userSchema.parse(req.body),hash=await bcrypt.hash(data.password,12),id=randomUUID();
  await run('INSERT INTO users(id,company_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?)',[id,req.companyId,data.name,data.email,hash,data.role]);
  res.status(201).json({user:{id,name:data.name,email:data.email,role:data.role}});
}));
export default router;
