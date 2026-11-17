import {useEffect,useState} from 'react';
import {useAuth} from '../context/AuthContext.jsx';
import AccountAccess from '../pages/AccountAccess.jsx';
import Integrations from '../pages/Integrations.jsx';
import Home from '../pages/Home.jsx';
import Help from '../pages/Help.jsx';
import {Notice,Spinner} from '../components/UI.jsx';
import Shell from '../components/Shell.jsx';
import Login from '../pages/Login.jsx';
import Chat from '../pages/Chat.jsx';
import Documents from '../pages/Documents.jsx';
import Users from '../pages/Users.jsx';
import Usage from '../pages/Usage.jsx';
function accessFromHash(){const params=new URLSearchParams(window.location.hash.slice(1));for(const purpose of ['reset','invite'])if(params.has(purpose))return {purpose,token:params.get(purpose)};return null;}
export default function App(){const {loading,session,connectionError,retry}=useAuth(),[tab,setTab]=useState('home'),[access,setAccess]=useState(accessFromHash);
 useEffect(()=>{const update=()=>setAccess(accessFromHash());window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 useEffect(()=>{setTab('home');},[session?.user?.id]);
 if(access)return <AccountAccess key={access.purpose+access.token} {...access} onDone={()=>{setAccess(null);retry();}}/>;
 if(loading)return <div className="boot"><Spinner label="Preparando tu espacio…"/></div>;
 if(connectionError)return <div className="boot"><div className="connection-recovery"><h1>No pudimos conectar</h1><Notice error={connectionError}/><button className="btn btn-primary" onClick={retry}>Reintentar conexión</button></div></div>;
 if(!session)return <Login/>;
 const page=tab==='integrations'&&session.user.role==='admin'?<Integrations/>:tab==='home'?<Home onNavigate={setTab}/>:tab==='help'?<Help onNavigate={setTab}/>:tab==='documents'?<Documents/>:tab==='users'&&session.user.role==='admin'?<Users/>:tab==='usage'?<Usage/>:<Chat onDocuments={()=>setTab('documents')}/>;
 return <Shell tab={tab} setTab={setTab}>{page}</Shell>;
}
