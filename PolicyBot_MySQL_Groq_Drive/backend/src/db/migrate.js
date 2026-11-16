import mysql from 'mysql2/promise';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {env} from '../config/env.js';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../database/migrations');
let connection;
for(let attempt=1;attempt<=30;attempt++){
  try{connection=await mysql.createConnection({...env.db,multipleStatements:true});break;}
  catch(e){if(attempt===30)throw e;await new Promise(resolve=>setTimeout(resolve,1000));}
}
try{
  await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (filename VARCHAR(200) PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
  const [applied]=await connection.query('SELECT filename FROM schema_migrations');
  const done=new Set(applied.map(x=>x.filename));
  for(const filename of (await fs.readdir(dir)).filter(x=>x.endsWith('.sql')).sort()){
    if(done.has(filename))continue;
    const sql=await fs.readFile(path.join(dir,filename),'utf8');
    await connection.query(sql);
    await connection.execute('INSERT INTO schema_migrations(filename) VALUES (?)',[filename]);
    console.log('Migración aplicada:',filename);
  }
  console.log('MySQL preparado.');
}finally{await connection.end();}
