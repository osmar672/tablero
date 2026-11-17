import {randomBytes,createHash,randomUUID} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {one,run,transaction} from '../db/pool.js';
import {sendAccessEmail,mailConfigured} from './mail.service.js';
import {HttpError} from '../utils/errors.js';
export const tokenHash=token=>createHash('sha256').update(token).digest('hex');
export function requireMail(){if(!mailConfigured())throw new HttpError(503,'El correo no está configurado. Contacta al administrador.');}
async function issue({companyId,userId=null,email,name=null,role=null,purpose,companyName},deliver=sendAccessEmail){
 const token=randomBytes(32).toString('hex'),hash=tokenHash(token),expires=new Date(Date.now()+(purpose==='invite'?48*3600000:1800000));
 await run('DELETE FROM auth_tokens WHERE expires_at<UTC_TIMESTAMP()-INTERVAL 1 DAY');
 await run('INSERT INTO auth_tokens(token_hash,purpose,company_id,user_id,email,name,role,expires_at) VALUES (?,?,?,?,?,?,?,?)',[hash,purpose,companyId,userId,email,name,role,expires]);
 try{await deliver({email,purpose,token,companyName});}
 catch(error){await run('DELETE FROM auth_tokens WHERE token_hash=?',[hash]);throw error;}
}
export async function requestReset(email,{deliver=sendAccessEmail,checkMail=true}={}){
 if(checkMail)requireMail();
 const user=await one('SELECT id,company_id FROM users WHERE email=?',[email]);
 if(!user)return;
 const recent=await one("SELECT COUNT(*) AS total FROM auth_tokens WHERE user_id=? AND purpose='reset' AND created_at>UTC_TIMESTAMP()-INTERVAL 15 MINUTE",[user.id]);
 if(recent.total>=3)return;
 await issue({companyId:user.company_id,userId:user.id,email,purpose:'reset'},deliver);
}
export async function inviteUser(companyId,{email,name,role},{deliver=sendAccessEmail,checkMail=true}={}){
 if(checkMail)requireMail();
 if(await one('SELECT id FROM users WHERE email=?',[email]))throw new HttpError(409,'Ya existe una cuenta con ese correo');
 const recent=await one("SELECT COUNT(*) AS total FROM auth_tokens WHERE company_id=? AND purpose='invite' AND created_at>UTC_TIMESTAMP()-INTERVAL 1 HOUR",[companyId]);
 if(recent.total>=20)throw new HttpError(429,'Se alcanzó el límite de invitaciones por hora');
 const company=await one('SELECT name FROM companies WHERE id=?',[companyId]);
 await issue({companyId,email,name,role,purpose:'invite',companyName:company.name},deliver);
}
export async function accessTokenInfo(token,purpose){
 const row=await one('SELECT email,name FROM auth_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP()',[tokenHash(token),purpose]);
 if(!row)throw new HttpError(400,'El enlace venció o ya fue utilizado');return row;
}
export async function consumeAccessToken(token,purpose,password){
 const candidate=await one('SELECT user_id,company_id FROM auth_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP()',[tokenHash(token),purpose]);
 if(!candidate)throw new HttpError(400,'El enlace venció o ya fue utilizado');
 const hash=await bcrypt.hash(password,12);
 await transaction(async cx=>{
  // Serializa cambios de una misma cuenta antes de bloquear sus distintos enlaces.
  if(purpose==='reset')await cx.execute('SELECT id FROM users WHERE id=? AND company_id=? FOR UPDATE',[candidate.user_id,candidate.company_id]);
  const [rows]=await cx.execute('SELECT * FROM auth_tokens WHERE token_hash=? AND purpose=? AND used_at IS NULL AND expires_at>UTC_TIMESTAMP() FOR UPDATE',[tokenHash(token),purpose]);
  const item=rows[0];if(!item)throw new HttpError(400,'El enlace venció o ya fue utilizado');
  if(purpose==='reset'){
   const [updated]=await cx.execute('UPDATE users SET password_hash=?,session_version=session_version+1 WHERE id=? AND company_id=?',[hash,item.user_id,item.company_id]);
   if(!updated.affectedRows)throw new HttpError(400,'La cuenta ya no está disponible');
   await cx.execute("UPDATE auth_tokens SET used_at=UTC_TIMESTAMP() WHERE user_id=? AND purpose='reset' AND used_at IS NULL",[item.user_id]);
  }else{
   await cx.execute('INSERT INTO users(id,company_id,email,name,password_hash,role) VALUES (?,?,?,?,?,?)',[randomUUID(),item.company_id,item.email,item.name,hash,item.role]);
   await cx.execute("UPDATE auth_tokens SET used_at=UTC_TIMESTAMP() WHERE email=? AND purpose='invite' AND used_at IS NULL",[item.email]);
  }
 });
}
