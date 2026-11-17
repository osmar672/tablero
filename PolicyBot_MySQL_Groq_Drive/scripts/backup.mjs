import {createBackup,pruneBackups,restoreBackup} from '../backend/src/services/backup.service.js';
try{
 if(process.argv[2]==='restore'){
  const args=process.argv.slice(3),file=args[args.indexOf('--file')+1],database=args[args.indexOf('--database')+1];
  if(!args.includes('--confirm-empty')||!args.includes('--file')||!args.includes('--database'))throw new Error('Uso: npm run backup:restore -- --file copia.pbb --database destino_vacio --confirm-empty');
  console.log(await restoreBackup({file,database}));
 }else{console.log(await createBackup());await pruneBackups();}
}catch(error){console.error('Copia/restauración:',error.message);process.exitCode=1;}
