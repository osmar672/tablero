export function splitText(text,size=1400,overlap=180){
  if(!Number.isInteger(size)||!Number.isInteger(overlap)||overlap>=size||overlap<0)throw new Error('Tamaño de fragmento inválido');
  const value=String(text||'').replace(/\s+/g,' ').trim(); if(!value)return [];
  const result=[];
  let position=0;
  while(position<value.length){
    let end=Math.min(value.length,position+size);
    if(end<value.length){const at=value.lastIndexOf(' ',end);if(at>position+size*.75)end=at;}
    const part=value.slice(position,end).trim();if(part)result.push(part);
    if(end>=value.length)break;
    position=Math.max(position+1,end-overlap);
  }
  return result;
}
