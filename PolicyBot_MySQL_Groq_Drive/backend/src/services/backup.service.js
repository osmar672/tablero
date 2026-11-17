import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,scrypt,createCipheriv,createDecipheriv} from 'node:crypto';
import {promisify} from 'node:util';
import mysql from 'mysql2/promise';
import {env} from '../config/env.js';
const derive=promisify(scrypt);
const tables=['plans','companies','users','conversations','documents','chunks','messages','sync_runs','auth_tokens'];
const migrationsDir=new URL('../../../database/migrations/',import.meta.url);
const files=async()=> (await fs.readdir(migrationsDir)).filter(f=>f.endsWith('.sql')).sort();
let active=false;
export async function encryptBackup(snapshot,password){
 if(password.length<32)throw new Error('BACKUP_ENCRYPTION_KEY debe tener al menos 32 caracteres');
 const salt=randomBytes(16),iv=randomBytes(12),key=await derive(password,salt,32);
 const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from('PolicyBot backup v1'));
 const encrypted=Buffer.concat([cipher.update(JSON.stringify(snapshot),'utf8'),cipher.final()]);
 return Buffer.concat([Buffer.from('PBB1'),salt,iv,cipher.getAuthTag(),encrypted]);
}
export async function decryptBackup(buffer,password){
 if(buffer.length<49||buffer.subarray(0,4).toString()!=='PBB1')throw new Error('Formato de copia inválido');
 const key=await derive(password,buffer.subarray(4,20),32),cipher=createDecipheriv('aes-256-gcm',key,buffer.subarray(20,32));
 cipher.setAAD(Buffer.from('PolicyBot backup v1'));cipher.setAuthTag(buffer.subarray(32,48));
 try{return JSON.parse(Buffer.concat([cipher.update(buffer.subarray(48)),cipher.final()]).toString('utf8'));}
 catch{throw new Error('No se pudo abrir la copia: clave incorrecta o archivo alterado');}
}
export async function createBackup({key=env.backupKey,directory=env.backupDir,db=env.db}={}){
 if(active)throw new Error('Ya hay una copia en curso');
 if(key.length<32)throw new Error('Configura BACKUP_ENCRYPTION_KEY de al menos 32 caracteres');
 active=true;let cx,temp;
 try{
  cx=await mysql.createConnection({...db,dateStrings:true});
  await cx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');await cx.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
  const snapshot={format:1,createdAt:new Date().toISOString(),migrations:await files(),tables:{}};
  for(const table of tables){
   // No se restauran enlaces de acceso pendientes.
   snapshot.tables[table]=table==='auth_tokens'?[]:(await cx.query('SELECT * FROM `'+table+'`'))[0];
  }
  await cx.commit();
  const data=await encryptBackup(snapshot,key);
  if(data.length>256*1024*1024)throw new Error('La copia supera el límite de 256 MB de este formato; configura una copia externa de MySQL para este volumen');
  await fs.mkdir(directory,{recursive:true,mode:0o700});
  const name='policybot-'+new Date().toISOString().replace(/[:.]/g,'-')+'-'+randomBytes(3).toString('hex')+'.pbb';
  const target=path.join(directory,name);temp=target+'.tmp';
  await fs.writeFile(temp,data,{mode:0o600,flag:'wx'});await fs.rename(temp,target);temp=null;
  return {file:target,bytes:data.length,createdAt:snapshot.createdAt};
 }finally{if(temp)await fs.unlink(temp).catch(()=>{});await cx?.end();active=false;}
}
export async function pruneBackups(directory=env.backupDir,days=env.backupRetention){
 const entries=await fs.readdir(directory).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
 for(const name of entries){
  if(!/^policybot-\d{4}-\d{2}-\d{2}T[\d-]+Z-[a-f0-9]{6}\.pbb$/.test(name))continue;
  const file=path.join(directory,name),stat=await fs.lstat(file);
  if(stat.isFile()&&stat.mtimeMs<Date.now()-days*86400000)await fs.unlink(file);
 }
}
export async function restoreBackup({file,key=env.backupKey,database,db=env.db}){
 if(!/^[a-zA-Z0-9_]{1,64}$/.test(database||'')||database.toLowerCase()===env.db.database.toLowerCase())throw new Error('La restauración exige una base de destino distinta de la activa');
 if(key.length<32)throw new Error('Configura la clave de cifrado de la copia');
 if((await fs.stat(file)).size>256*1024*1024)throw new Error('Copia superior al límite de restauración de 256 MB');
 const snapshot=await decryptBackup(await fs.readFile(file),key),migrationFiles=await files();
 if(snapshot.format!==1||JSON.stringify(snapshot.migrations)!==JSON.stringify(migrationFiles)||!snapshot.tables||tables.some(t=>!Array.isArray(snapshot.tables[t])))throw new Error('La copia no coincide con esta versión del esquema');
 const cx=await mysql.createConnection({...db,database,multipleStatements:true});
 try{
  const [existing]=await cx.query('SHOW TABLES');if(existing.length)throw new Error('La base de destino debe estar vacía; no se sobrescriben tablas existentes');
  await cx.query('CREATE TABLE schema_migrations (filename VARCHAR(200) PRIMARY KEY,applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB');
  for(const name of migrationFiles){await cx.query(await fs.readFile(new URL(name,migrationsDir),'utf8'));await cx.execute('INSERT INTO schema_migrations(filename) VALUES (?)',[name]);}
  await cx.beginTransaction();
  try{
   await cx.execute('DELETE FROM plans');
   for(const table of tables){
    const [columns]=await cx.query('SHOW COLUMNS FROM `'+table+'`'),allowed=new Set(columns.map(c=>c.Field));
    for(const row of snapshot.tables[table]){
     if(table==='auth_tokens')continue;
     const names=Object.keys(row);if(!names.length||names.some(n=>!allowed.has(n)))throw new Error('Columnas inválidas en la copia');
     const values=names.map(n=>n==='session_version'?Number(row[n])+1:row[n]!==null&&typeof row[n]==='object'?JSON.stringify(row[n]):row[n]);
     await cx.execute('INSERT INTO `'+table+'` ('+names.map(n=>'`'+n+'`').join(',')+') VALUES ('+names.map(()=>'?').join(',')+')',values);
    }
   }
   await cx.commit();
  }catch(error){await cx.rollback();throw error;}
  return {database,rows:Object.fromEntries(tables.map(t=>[t,snapshot.tables[t].length]))};
 }finally{await cx.end();}
}
