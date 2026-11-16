/** Diagnóstico seguro, sin mostrar contraseñas ni claves API. */
import net from 'node:net';
import mysql from 'mysql2/promise';
import fs from 'node:fs';
import path from 'node:path';
import {env} from '../config/env.js';

const tcp=(port)=>new Promise(resolve=>{
  const socket=net.createConnection({host:env.db.host,port});
  socket.setTimeout(2500);
  socket.once('connect',()=>{socket.destroy();resolve(true);});
  socket.once('error',()=>resolve(false));
  socket.once('timeout',()=>{socket.destroy();resolve(false);});
});
console.log(`Base configurada: ${env.db.database}`);
console.log(`Servidor: ${env.db.host}:${env.db.port}; usuario: ${env.db.user} (contraseña oculta)`);
console.log(`JWT_SECRET: ${env.jwtSecret.length>=32?'configurado':'FALTA o es demasiado corto'}`);
console.log(`GROQ_API_KEY: ${env.groqKey?'configurada':'sin configurar'}`);
const credentials=path.resolve(env.backendDir,env.googleCredentials);
const driveExists=fs.existsSync(credentials);
console.log(`Drive: ${driveExists?'JSON encontrado':'archivo JSON NO encontrado'} (${path.relative(env.backendDir,credentials)})`);
if(driveExists){try{const json=JSON.parse(fs.readFileSync(credentials,'utf8'));if(json.type!=='service_account'||!json.client_email||!json.private_key)console.warn('Drive: el JSON no contiene datos de una cuenta de servicio');}catch{console.warn('Drive: el archivo no es un JSON válido');}}
const portWorks=await tcp(env.db.port);
if(!portWorks){
  console.error(`ERROR: no hay MySQL escuchando en ${env.db.host}:${env.db.port}.`);
  const other=env.db.port===3307?3306:3307;
  if(await tcp(other))console.log(`Se detectó un servicio en el puerto ${other}. Comprueba si es tu MySQL y, si corresponde, cambia MYSQL_PORT=${other}.`);
  console.log('Si usas Docker, abre Docker Desktop y ejecuta desde la raíz: docker compose up -d db');
  process.exitCode=1;
}else{
  let connection;
  try{
    connection=await mysql.createConnection({...env.db,connectTimeout:5000});
    const [rows]=await connection.query("SELECT COUNT(*) AS total FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'pb_%'");
    console.log(`Conexión a MySQL: OK. Tablas PolicyBot detectadas: ${rows[0].total}.`);
    if(rows[0].total===0)console.log('Ejecuta npm run db:migrate para crear las tablas.');
  }catch(error){
    console.error(`Conexión TCP disponible, pero MySQL rechazó la conexión: ${error.code||error.message}.`);
    if(error.code==='ER_ACCESS_DENIED_ERROR')console.log('Verifica MYSQL_USER y MYSQL_PASSWORD.');
    if(error.code==='ER_BAD_DB_ERROR')console.log('La base no existe. Usa npm run db:migrate (requiere permisos CREATE DATABASE).');
    process.exitCode=1;
  }finally{await connection?.end();}
}
