import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
test('setup genera un JWT exclusivo y conserva el archivo de configuración existente',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'policybot-setup-'));
 try{
  await fs.mkdir(path.join(dir,'backend'));await fs.mkdir(path.join(dir,'scripts'));
  await fs.copyFile(new URL('../../scripts/setup-env.mjs',import.meta.url),path.join(dir,'scripts/setup-env.mjs'));
  await fs.copyFile(new URL('../.env.example',import.meta.url),path.join(dir,'backend/.env.example'));
  await exec(process.execPath,[path.join(dir,'scripts/setup-env.mjs')]);
  const target=path.join(dir,'backend/.env'),first=await fs.readFile(target,'utf8');
  assert.match(first,/^JWT_SECRET=[a-f0-9]{96}$/m);assert.match(first,/^BACKUP_ENCRYPTION_KEY=[a-f0-9]{96}$/m);assert.notEqual(first.match(/^JWT_SECRET=(.+)$/m)[1],first.match(/^BACKUP_ENCRYPTION_KEY=(.+)$/m)[1]);assert.match(first,/^GROQ_API_KEY=$/m);
  if(process.platform!=='win32')assert.equal((await fs.stat(target)).mode&0o777,0o600);
  await exec(process.execPath,[path.join(dir,'scripts/setup-env.mjs')]);assert.equal(await fs.readFile(target,'utf8'),first);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
