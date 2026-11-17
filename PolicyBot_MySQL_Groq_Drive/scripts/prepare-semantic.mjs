import {localSemantic} from '../backend/src/services/embedding.service.js';
const vectors=await localSemantic(['vacaciones anuales','días libres para descansar']);
if(vectors.length!==2||vectors[0].length<100)throw new Error('Modelo semántico inválido');
console.log('Modelo semántico local preparado. Dimensiones:',vectors[0].length);
console.log('Para activarlo: EMBEDDING_PROVIDER=transformers; después reinicia la API y reindexa los documentos.');
