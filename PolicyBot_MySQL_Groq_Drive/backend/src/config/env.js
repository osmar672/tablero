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
  localModel:process.env.LOCAL_EMBEDDING_MODEL||'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
  modelCache:process.env.MODEL_CACHE_DIR||path.join(backendDir,'.cache','models'),
  appUrl:process.env.APP_URL||'http://localhost:5173',
  smtp:{host:process.env.SMTP_HOST||'',port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='true',user:process.env.SMTP_USER||'',password:process.env.SMTP_PASSWORD||'',from:process.env.SMTP_FROM||''},
  ocrEnabled:process.env.OCR_ENABLED!=='false',
  ocrLang:process.env.OCR_LANG||'eng',
  ocrData:process.env.OCR_TESSDATA_DIR||'',
  backupKey:process.env.BACKUP_ENCRYPTION_KEY||'',
  backupDir:process.env.BACKUP_DIR||path.join(backendDir,'backups'),
  backupCron:process.env.BACKUP_CRON||'',
  backupRetention:Number(process.env.BACKUP_RETENTION_DAYS||14),
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
  if(!['local','voyage','transformers'].includes(env.embeddingProvider)) throw new Error('EMBEDDING_PROVIDER debe ser local, transformers o voyage');
  if(env.embeddingProvider==='voyage'&&!env.voyageKey) throw new Error('Falta VOYAGE_API_KEY para embeddings Voyage');
  const appUrl=new URL(env.appUrl);
  if(!['http:','https:'].includes(appUrl.protocol)||appUrl.username||appUrl.password||appUrl.search||appUrl.hash)throw new Error('APP_URL inválida');
  if(env.nodeEnv==='production'&&appUrl.protocol!=='https:')throw new Error('APP_URL debe usar HTTPS en producción');
  if(env.backupCron&&!cron.validate(env.backupCron))throw new Error('BACKUP_CRON inválido');
  if(env.backupCron&&env.backupKey.length<32)throw new Error('Configura BACKUP_ENCRYPTION_KEY de al menos 32 caracteres');
  if(!Number.isInteger(env.backupRetention)||env.backupRetention<1||env.backupRetention>365)throw new Error('BACKUP_RETENTION_DAYS debe estar entre 1 y 365');
  if(!/^[a-z_+]+$/i.test(env.ocrLang))throw new Error('OCR_LANG inválido');
  if(!Number.isInteger(env.smtp.port)||env.smtp.port<1||env.smtp.port>65535)throw new Error('SMTP_PORT inválido');
  if(env.localModel.length<1||env.localModel.length>80)throw new Error('LOCAL_EMBEDDING_MODEL debe tener entre 1 y 80 caracteres');
}
