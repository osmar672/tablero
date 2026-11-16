import {useState} from 'react';
import {useAuth} from '../context/AuthContext.jsx';
import {Spinner} from '../components/UI.jsx';
import Shell from '../components/Shell.jsx';
import Login from '../pages/Login.jsx';
import Chat from '../pages/Chat.jsx';
import Documents from '../pages/Documents.jsx';
import Users from '../pages/Users.jsx';
import Usage from '../pages/Usage.jsx';
export default function App(){const {loading,session}=useAuth(),[tab,setTab]=useState('chat');
 if(loading)return <div className="boot"><Spinner label="Preparando tu espacio…"/></div>;
 if(!session)return <Login/>;
 const page=tab==='documents'?<Documents/>:tab==='users'&&session.user.role==='admin'?<Users/>:tab==='usage'?<Usage/>:<Chat onDocuments={()=>setTab('documents')}/>;
 return <Shell tab={tab} setTab={setTab}>{page}</Shell>;
}
