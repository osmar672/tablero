import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recognizeBuffer,recognizePdfPages} from '../src/services/ocr.service.js';
test('OCR rechaza contenido que no es PNG/JPEG antes de iniciar un proceso',async()=>{
 await assert.rejects(recognizeBuffer(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')),e=>e.status===400);
 await assert.rejects(recognizeBuffer(Buffer.from('%PDF-not-an-image')),e=>e.status===400);
});
test('OCR limita el número de páginas escaneadas antes de convertir el archivo',async()=>{
 await assert.rejects(recognizePdfPages(Buffer.from('%PDF'),Array.from({length:21},(_,i)=>i+1)),e=>e.status===413);
});
