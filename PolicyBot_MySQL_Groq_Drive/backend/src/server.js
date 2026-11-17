import app from './app.js';
import {env,assertConfig} from './config/env.js';
import {pool} from './db/pool.js';
import {startDriveJob} from './jobs/drive.job.js';
import {startBackupJob} from './jobs/backup.job.js';
try{
  assertConfig();
  await pool.query('SELECT 1');
  const server=app.listen(env.port,()=>console.log(`PolicyBot API http://127.0.0.1:${env.port}`));
  startDriveJob();
  startBackupJob();
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0);}));
}catch(e){console.error('No se pudo iniciar:',e.message);process.exitCode=1;await pool.end();}
