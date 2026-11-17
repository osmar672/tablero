import cron from 'node-cron';
import {env} from '../config/env.js';
import {createBackup,pruneBackups} from '../services/backup.service.js';
export function startBackupJob(){
 if(!env.backupCron||!env.backupKey)return null;
 return cron.schedule(env.backupCron,async()=>{
  try{const result=await createBackup();await pruneBackups();console.log('Copia de seguridad completada:',{bytes:result.bytes,at:result.createdAt});}
  catch{console.error('No se pudo completar la copia de seguridad. Revisa el almacenamiento y la configuración.');}
 },{timezone:'UTC',noOverlap:true});
}
