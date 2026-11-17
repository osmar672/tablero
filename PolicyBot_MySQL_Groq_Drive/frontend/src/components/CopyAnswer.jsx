import {useEffect,useRef,useState} from 'react';
import {Check,Copy} from 'lucide-react';
export default function CopyAnswer({text}){
 const [state,setState]=useState('idle'),timer=useRef(null);
 useEffect(()=>()=>clearTimeout(timer.current),[]);
 async function copy(){
  clearTimeout(timer.current);
  try{await navigator.clipboard.writeText(text);setState('copied');timer.current=setTimeout(()=>setState('idle'),2500);}
  catch{setState('error');}
 }
 return <span className="copy-answer"><button type="button" className="text-button" onClick={copy} aria-label="Copiar respuesta">{state==='copied'?<Check size={14}/>:<Copy size={14}/>} {state==='copied'?'Copiada':'Copiar respuesta'}</button><span role="status">{state==='error'?'No se pudo copiar. Selecciona el texto y cópialo manualmente.':state==='copied'?'Respuesta copiada al portapapeles.':''}</span></span>;
}
