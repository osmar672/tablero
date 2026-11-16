import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {api} from '../services/api.js';
const Context=createContext(null);
export function AuthProvider({children}){
  const [session,setSession]=useState(null);const [loading,setLoading]=useState(true);
  useEffect(()=>{api('/auth/me').then(setSession).catch(()=>setSession(null)).finally(()=>setLoading(false));},[]);
  const value=useMemo(()=>({session,loading,async login(data){await api('/auth/login',{method:'POST',body:data});setSession(await api('/auth/me'));},async register(data){await api('/auth/register',{method:'POST',body:data});setSession(await api('/auth/me'));},async logout(){try{await api('/auth/logout',{method:'POST'});}finally{setSession(null);}}}),[session,loading]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAuth(){const value=useContext(Context);if(!value)throw new Error('AuthProvider requerido');return value;}
