import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encryptBackup,decryptBackup,restoreBackup} from '../src/services/backup.service.js';
import {env} from '../src/config/env.js';
const key='independent-backup-key-'.repeat(3);
test('las copias autentican y cifran el contenido con sal y vector únicos',async()=>{
 const source={format:1,tables:{users:[{email:'privado@example.test'}]}};
 const a=await encryptBackup(source,key),b=await encryptBackup(source,key);
 assert.notDeepEqual(a,b);assert.ok(!a.includes(Buffer.from('privado@example.test')));assert.deepEqual(await decryptBackup(a,key),source);
});
test('una clave incorrecta o un archivo alterado no se restauran',async()=>{
 const source=await encryptBackup({secret:true},key);
 await assert.rejects(decryptBackup(source,'wrong-key-'.repeat(5)),/clave incorrecta/);
 source[source.length-1]^=1;await assert.rejects(decryptBackup(source,key),/archivo alterado/);
 await assert.rejects(encryptBackup({},'short'),/32 caracteres/);
});
test('la restauración rechaza siempre la base activa y nombres de base arbitrarios',async()=>{
 await assert.rejects(restoreBackup({database:env.db.database,file:'unused',key}),/distinta de la activa/);
 await assert.rejects(restoreBackup({database:'x;DROP DATABASE tablero',file:'unused',key}),/distinta de la activa/);
});
