import nodemailer from 'nodemailer';
import {env} from '../config/env.js';
import {HttpError} from '../utils/errors.js';
export function mailConfigured(){return Boolean(env.smtp.host&&env.smtp.from);}
export function mailTransport(){
 if(!mailConfigured())throw new HttpError(503,'El correo no está configurado. Contacta al administrador.');
 return nodemailer.createTransport({host:env.smtp.host,port:env.smtp.port,secure:env.smtp.secure,requireTLS:env.nodeEnv==='production'&&!env.smtp.secure,auth:env.smtp.user?{user:env.smtp.user,pass:env.smtp.password}:undefined,connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000});
}
export async function sendAccessEmail({email,purpose,token,companyName=''}){
 const link=new URL(env.appUrl);link.hash=`${purpose}=${token}`;
 const invite=purpose==='invite';
 try{await mailTransport().sendMail({from:env.smtp.from,to:email,subject:invite?'Invitación a PolicyBot':'Recupera tu acceso a PolicyBot',text:`${invite?`Te invitaron al espacio ${companyName}. Elige tu contraseña para aceptar.`:'Recibimos una solicitud para cambiar tu contraseña.'}\n\n${link.href}\n\nEl enlace es de un solo uso y vence ${invite?'en 48 horas':'en 30 minutos'}. Si no lo solicitaste, puedes ignorar este correo.`});}
 catch(error){if(error instanceof HttpError)throw error;throw new HttpError(503,'No se pudo enviar el correo. Intenta de nuevo más tarde.');}
}
