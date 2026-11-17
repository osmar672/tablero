import {useEffect,useState} from 'react';
import {api} from '../services/api.js';
import {Notice,Spinner} from '../components/UI.jsx';
export function ForgotPassword({onBack}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
 async function submit(e){e.preventDefault();const email=new FormData(e.currentTarget).get('email');setBusy(true);setError('');try{const data=await api('/auth/forgot-password',{method:'POST',body:{email}});setSuccess(data.message);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="boot"><section className="card access-card"><h1>Recupera tu contraseña</h1><p>Te enviaremos un enlace de un solo uso, válido durante 30 minutos.</p><Notice error={error} success={success}/><form className="auth-form" onSubmit={submit}><label>Correo electrónico<input type="email" name="email" required maxLength={190} autoComplete="email"/></label><button className="btn btn-primary" disabled={busy}>{busy?'Enviando…':'Enviar enlace'}</button></form><button className="text-button" disabled={busy} onClick={onBack}>Volver al acceso</button></section></div>;
}
export default function AccountAccess({token,purpose,onDone}){
 const [info,setInfo]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState(false);
 useEffect(()=>{
  // Evita dejar el enlace en el historial o enviarlo como referencia al navegar.
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  const controller=new AbortController();
  api('/auth/token-info',{method:'POST',body:{token,purpose},signal:controller.signal}).then(setInfo).catch(e=>{if(e.name!=='AbortError')setError(e.message);}).finally(()=>!controller.signal.aborted&&setLoading(false));
  return()=>controller.abort();
 },[token,purpose]);
 async function submit(e){e.preventDefault();const values=new FormData(e.currentTarget);if(values.get('password')!==values.get('confirm')){setError('Las contraseñas no coinciden');return;}setBusy(true);setError('');try{await api('/auth/set-password',{method:'POST',body:{token,purpose,password:values.get('password')}});setDone(true);}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="boot"><section className="card access-card"><h1>{done?'Acceso preparado':purpose==='invite'?'Acepta tu invitación':'Elige una contraseña nueva'}</h1><Notice error={error}/>{loading?<Spinner/>:done?<><p>Ya puedes iniciar sesión con tu contraseña. Los enlaces utilizados dejan de funcionar.</p><button className="btn btn-primary" onClick={onDone}>Ir al acceso</button></>:info?<><p>{info.name?`${info.name} · `:''}{info.email}</p><form onSubmit={submit} className="auth-form"><label>Contraseña nueva<input name="password" type="password" autoComplete="new-password" required minLength={10} maxLength={72}/></label><label>Repite la contraseña<input name="confirm" type="password" autoComplete="new-password" required minLength={10} maxLength={72}/></label><button className="btn btn-primary" disabled={busy}>{busy?'Guardando…':purpose==='invite'?'Aceptar invitación':'Cambiar contraseña'}</button></form></>:<button className="btn btn-secondary" onClick={onDone}>Volver al acceso</button>}</section></div>;
}
