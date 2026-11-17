import {test} from 'node:test';
import assert from 'node:assert/strict';
import {env,assertConfig} from '../src/config/env.js';
function valid(t){const before={...env};t.after(()=>Object.assign(env,before));Object.assign(env,{port:4000,db:{...env.db,port:3307},uploadLimit:10485760,syncCron:'0 * * * *',nodeEnv:'test',jwtSecret:'x'.repeat(48),embeddingProvider:'local'});}
test('configuración válida permite iniciar sin credenciales externas opcionales',t=>{valid(t);assert.doesNotThrow(assertConfig);});
test('rechaza puertos inválidos antes de abrir el servidor',t=>{valid(t);env.port=NaN;assert.throws(assertConfig,/PORT/);});
test('rechaza tamaño no numérico',t=>{valid(t);env.uploadLimit=NaN;assert.throws(assertConfig,/MAX_UPLOAD_MB/);});
test('rechaza cron inválido antes del arranque',t=>{valid(t);env.syncCron='incorrecto';assert.throws(assertConfig,/SYNC_CRON/);});
