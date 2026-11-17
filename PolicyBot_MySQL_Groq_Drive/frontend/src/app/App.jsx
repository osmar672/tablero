import {useState} from 'react';
import {useAuth} from '../context/AuthContext.jsx';
import Home from '../pages/Home.jsx';
import Help from '../pages/Help.jsx';
import {Notice,Spinner} from '../components/UI.jsx';
import Shell from '../components/Shell.jsx';
import Login from '../pages/Login.jsx';
import Chat from '../pages/Chat.jsx';
import Documents from '../pages/Documents.jsx';
import Users from '../pages/Users.jsx';
import Usage from '../pages/Usage.jsx';
export default function App(){const {loading,session,connectionError,retry}=useAuth(),[tab,setTab]=useState('home');
 if(loading)return <div className="boot"><Spinner label="Preparando tu espacio…"/></div>;
 if(connectionError)return <div className="boot"><div className="connection-recovery"><h1>No pudimos conectar</h1><Notice error={connectionError}/><button className="btn btn-primary" onClick={retry}>Reintentar conexión</button></div></div>;
 if(!session)return <Login/>;
 const page=tab==='home'?<Home onNavigate={setTab}/>:tab==='help'?<Help onNavigate={setTab}/>:tab==='documents'?<Documents/>:tab==='users'&&session.user.role==='admin'?<Users/>:tab==='usage'?<Usage/>:<Chat onDocuments={()=>setTab('documents')}/>;
 return <Shell tab={tab} setTab={setTab}>{page}</Shell>;
}
