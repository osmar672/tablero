import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const target=new URL('../backend/.env',import.meta.url);
try{
 const template=await fs.readFile(new URL('../backend/.env.example',import.meta.url),'utf8');
 await fs.writeFile(target,template.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+randomBytes(48).toString('hex')),{flag:'wx',mode:0o600});
 console.log('backend/.env creado con JWT aleatorio. Configura las integraciones externas mediante un canal seguro.');
}catch(error){if(error.code==='EEXIST')console.log('backend/.env ya existe; se conserva su contenido.');else throw error;}
