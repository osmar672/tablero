import cron from 'node-cron';
import {env} from '../config/env.js';
import {many} from '../db/pool.js';
import {syncDrive} from '../services/drive.service.js';
export function startDriveJob(){
  if(!cron.validate(env.syncCron))throw new Error('SYNC_CRON inválido');
  cron.schedule(env.syncCron,async()=>{
    try{
      const companies=await many('SELECT id FROM companies WHERE drive_folder_id IS NOT NULL');
      for(const company of companies){try{await syncDrive(company.id);}catch(e){console.error(`Drive empresa ${company.id}:`,e.message);}}
    }catch(error){console.error('Job Drive:',error.message);}
  },{timezone:'UTC',noOverlap:true});
}
