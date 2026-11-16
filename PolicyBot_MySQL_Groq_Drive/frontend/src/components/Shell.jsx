import {useEffect,useState} from 'react';
import {BookOpen,ChevronRight,FileText,LogOut,Menu,MessageSquareText,ShieldCheck,Users,X} from 'lucide-react';
import {useAuth} from '../context/AuthContext.jsx';
const tabs=[{id:'chat',label:'Asistente',icon:MessageSquareText},{id:'documents',label:'Documentos',icon:FileText},{id:'users',label:'Colaboradores',icon:Users},{id:'usage',label:'Plan y consumo',icon:ShieldCheck}];
export default function Shell({tab,setTab,children}){
 const {session,logout}=useAuth();const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[tab]);
 const first=session?.user?.name?.charAt(0)?.toUpperCase()||'U';
 return <div className="layout">
  {open&&<button className="mobile-scrim" aria-label="Cerrar menú" onClick={()=>setOpen(false)}/>}
  <aside className={'sidebar '+(open?'sidebar-open':'')}>
   <div className="side-top"><div className="brand-mark">P<span>•</span></div><div className="brand-copy"><strong>PolicyBot</strong><span>Asistente documental</span></div><button className="icon-button close-side" onClick={()=>setOpen(false)} aria-label="Cerrar menú"><X size={19}/></button></div>
   <div className="side-divider"/><div className="side-heading">ESPACIO DE TRABAJO</div>
   <nav className="side-nav" aria-label="Navegación principal">{tabs.filter(t=>t.id!=='users'||session?.user?.role==='admin').map(({id,label,icon:Icon})=><button key={id} className={'nav-item '+(tab===id?'nav-selected':'')} onClick={()=>setTab(id)}><Icon size={19} strokeWidth={1.9}/><span>{label}</span>{tab===id&&<span className="nav-indicator"/>}</button>)}</nav>
   <div className="sidebar-spacer"/>
   <a className="guide-link" href="/guia-practica.pdf" target="_blank" rel="noreferrer"><BookOpen size={17}/> Guía de la práctica <ChevronRight size={15}/></a>
   <div className="profile-card"><div className="avatar">{first}</div><div className="profile-copy"><strong title={session?.user?.name}>{session?.user?.name}</strong><span>{session?.company?.name}</span></div><button className="icon-button" title="Cerrar sesión" onClick={logout}><LogOut size={18}/></button></div>
  </aside>
  <main className="main-area"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Abrir menú" onClick={()=>setOpen(true)}><Menu size={21}/></button><div className="breadcrumbs">ESPACIO DE TRABAJO <ChevronRight size={13}/> <strong>{tabs.find(t=>t.id===tab)?.label}</strong></div><div className="topbar-right"><span className="role-tag">{session?.user?.role==='admin'?'Administrador':'Colaborador'}</span><div className="tiny-avatar">{first}</div></div></header><div className="main-scroll">{children}</div></main>
 </div>;
}
