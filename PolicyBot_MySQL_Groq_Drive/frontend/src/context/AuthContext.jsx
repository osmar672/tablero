import {createContext,useCallback,useContext,useEffect,useMemo,useState} from 'react';
import {api} from '../services/api.js';
const Context=createContext(null);
export function AuthProvider({children}){
 const [session,setSession]=useState(null),[loading,setLoading]=useState(true),[connectionError,setConnectionError]=useState(''),[sessionNotice,setSessionNotice]=useState('');
 const restore=useCallback(async()=>{
  setLoading(true);setConnectionError('');
  try{setSession(await api('/auth/me'));}
  catch(e){if(e.status===401)setSession(null);else setConnectionError('No se pudo comprobar tu sesión. Revisa la conexión e intenta de nuevo.');}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{restore();const expired=()=>{setSession(null);setSessionNotice('Tu sesión terminó. Inicia sesión para continuar.');};window.addEventListener('policybot:session-expired',expired);return()=>window.removeEventListener('policybot:session-expired',expired);},[restore]);
 const value=useMemo(()=>({session,loading,connectionError,sessionNotice,retry:restore,
  async login(data){await api('/auth/login',{method:'POST',body:data});setSession(await api('/auth/me'));setSessionNotice('');},
  async register(data){await api('/auth/register',{method:'POST',body:data});setSession(await api('/auth/me'));setSessionNotice('');},
  async logout(){await api('/auth/logout',{method:'POST'});setSession(null);setSessionNotice('');}
 }),[session,loading,connectionError,sessionNotice,restore]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider requerido');return value;}
