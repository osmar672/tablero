const formats=/\.(pdf|docx|txt|md|csv)$/i;
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function filterDocuments(documents,{query='',state='',source=''}={}){
 const terms=normalize(query).trim().split(/\s+/).filter(Boolean);
 return documents.filter(d=>(!state||d.state===state)&&(!source||d.source===source)&&terms.every(term=>normalize(d.name).includes(term)));
}
export async function uploadDocuments(files,{upload,maxBytes,onProgress=()=>{}}){
 const results=[];
 for(const [index,file] of Array.from(files).entries()){
  onProgress({current:index+1,total:files.length,name:file.name});
  try{
   if(!formats.test(file.name))throw new Error('Formato no admitido: usa PDF, DOCX, TXT, MD o CSV.');
   if(!file.size)throw new Error('El archivo está vacío.');
   if(file.size>maxBytes)throw new Error(`Supera el límite de ${Math.round(maxBytes/1024/1024)} MB.`);
   await upload(file);
   results.push({name:file.name,ok:true});
  }catch(error){results.push({name:file.name,ok:false,error:error.message||'No se pudo subir el archivo.'});}
 }
 return results;
}
