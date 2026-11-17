import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const target=new URL('../backend/.env',import.meta.url);
try{
 const template=await fs.readFile(new URL('../backend/.env.example',import.meta.url),'utf8');
 const config=template.replace(/^JWT_SECRET=.*$/m,'JWT_SECRET='+randomBytes(48).toString('hex')).replace(/^BACKUP_ENCRYPTION_KEY=.*$/m,'BACKUP_ENCRYPTION_KEY='+randomBytes(48).toString('hex'));
 await fs.writeFile(target,config,{flag:'wx',mode:0o600});
 console.log('backend/.env creado con secretos independientes para sesiones y copias. Conserva la clave de copias en un lugar seguro separado del servidor.');
}catch(error){if(error.code==='EEXIST')console.log('backend/.env ya existe; se conserva su contenido.');else throw error;}
