import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {one} from '../db/pool.js';
import {HttpError} from '../utils/errors.js';
const COOKIE='policybot_session';
export function getCookie(req,name=COOKIE){const value=String(req.headers.cookie||'').split(';').map(p=>p.trim()).find(p=>p.startsWith(name+'='));if(!value)return null;try{return decodeURIComponent(value.slice(name.length+1));}catch{throw new HttpError(401,'Sesión inválida. Inicia sesión de nuevo');}}
export function setSession(res,user){const token=jwt.sign({sub:user.id},env.jwtSecret,{expiresIn:'8h',issuer:'policybot'});res.cookie(COOKIE,token,{httpOnly:true,sameSite:'lax',secure:env.nodeEnv==='production',path:'/api',maxAge:8*60*60*1000});}
export function clearSession(res){res.clearCookie(COOKIE,{httpOnly:true,sameSite:'lax',secure:env.nodeEnv==='production',path:'/api'});}
export async function authenticate(req,_res,next){try{
  const cookie=getCookie(req);
  if(!cookie)throw new HttpError(401,'Inicia sesión para continuar');
  let decoded;try{decoded=jwt.verify(cookie,env.jwtSecret,{issuer:'policybot',algorithms:['HS256']});}catch{throw new HttpError(401,'Sesión expirada o inválida');}
  const user=await one(`SELECT u.id,u.company_id,u.name,u.email,u.role,c.name AS company_name,c.plan_id FROM users u JOIN companies c ON c.id=u.company_id WHERE u.id=?`,[decoded.sub]);
  if(!user)throw new HttpError(401,'Usuario no encontrado');
  req.user=user; req.companyId=user.company_id;next();
}catch(error){next(error);}}
export function adminOnly(req,_res,next){if(req.user?.role!=='admin')return next(new HttpError(403,'Acceso permitido solo a administradores'));next();}
