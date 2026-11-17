import {test} from 'node:test';
import assert from 'node:assert/strict';
import {uploadFilename} from '../src/utils/filename.js';
test('conserva acentos y emoji al decodificar nombres multipart',()=>{
 const expected='política-éxito-🌳.txt';
 assert.equal(uploadFilename(Buffer.from(expected).toString('latin1')),expected);
 assert.equal(uploadFilename(expected),expected);
 assert.equal(uploadFilename('café.txt'),'café.txt');
});
test('elimina rutas y caracteres de control sin perder la extensión',()=>{
 assert.equal(uploadFilename('C:\\carpeta\\documento.pdf'),'documento.pdf');
 assert.equal(uploadFilename('../../archivo\u0000.txt'),'archivo.txt');
 assert.throws(()=>uploadFilename('..'),e=>e.status===400);
});
