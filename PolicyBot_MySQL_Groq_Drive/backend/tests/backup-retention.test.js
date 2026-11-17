import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {pruneBackups} from '../src/services/backup.service.js';
test('la retención elimina solo copias antiguas con el nombre propio de la aplicación',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'policybot-retention-'));
 try{
  const old='policybot-2026-01-01T08-00-00-000Z-abcdef.pbb',recent='policybot-2026-01-02T08-00-00-000Z-123456.pbb',unrelated='otro-archivo.pbb';
  for(const name of [old,recent,unrelated])await fs.writeFile(path.join(dir,name),'temporary');
  const past=new Date(Date.now()-30*86400000);
  for(const name of [old,unrelated])await fs.utimes(path.join(dir,name),past,past);
  await pruneBackups(dir,14);
  assert.deepEqual((await fs.readdir(dir)).sort(),[unrelated,recent].sort());
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
