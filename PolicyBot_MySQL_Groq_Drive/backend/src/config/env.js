import cron from 'node-cron';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../');
dotenv.config({path:path.join(backendDir,'.env')});
export const env = {
  backendDir,
  port: Number(process.env.PORT||4000),
  nodeEnv: process.env.NODE_ENV||'development',
  db: {host:process.env.MYSQL_HOST||'127.0.0.1',port:Number(process.env.MYSQL_PORT||3307),user:process.env.MYSQL_USER||'policybot',password:process.env.MYSQL_PASSWORD||'',database:process.env.MYSQL_DATABASE||'policybot'},
  jwtSecret:process.env.JWT_SECRET||'',
  groqKey:process.env.GROQ_API_KEY||'',
  groqModel:process.env.GROQ_MODEL||'openai/gpt-oss-120b',
  embeddingProvider:process.env.EMBEDDING_PROVIDER||'local',
  voyageKey:process.env.VOYAGE_API_KEY||'',
  voyageModel:process.env.VOYAGE_MODEL||'voyage-4-lite',
  googleCredentials:process.env.GOOGLE_APPLICATION_CREDENTIALS||'./credentials/service-account.json',
  syncCron:process.env.SYNC_CRON||'0 * * * *',
  uploadLimit:Math.max(1,Math.min(25,Number(process.env.MAX_UPLOAD_MB||10)))*1024*1024
};
export function assertConfig(){
  for(const [name,value] of [['PORT',env.port],['MYSQL_PORT',env.db.port]])if(!Number.isInteger(value)||value<1||value>65535)throw new Error(`${name} debe ser un puerto entre 1 y 65535`);
  if(!Number.isFinite(env.uploadLimit)||env.uploadLimit<1)throw new Error('MAX_UPLOAD_MB debe ser un número válido');
  if(!cron.validate(env.syncCron))throw new Error('SYNC_CRON inválido');
  if(!['development','test','production'].includes(env.nodeEnv))throw new Error('NODE_ENV debe ser development, test o production');
  if(env.jwtSecret.length<32 || env.jwtSecret.startsWith('REEMPLAZA')) throw new Error('Configura JWT_SECRET aleatorio (mínimo 32 caracteres) en backend/.env');
  if(!['local','voyage'].includes(env.embeddingProvider)) throw new Error('EMBEDDING_PROVIDER debe ser local o voyage');
  if(env.embeddingProvider==='voyage'&&!env.voyageKey) throw new Error('Falta VOYAGE_API_KEY para embeddings Voyage');
}
