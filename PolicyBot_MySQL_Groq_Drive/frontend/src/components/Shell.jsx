import {useEffect,useRef,useState} from 'react';
import {House,BookOpen,ChevronRight,FileText,LogOut,Menu,MessageSquareText,ShieldCheck,Users,X,Plug} from 'lucide-react';
import {Notice} from './UI.jsx';
import {useAuth} from '../context/AuthContext.jsx';
const tabs=[{id:'home',label:'Inicio',icon:House},{id:'chat',label:'Asistente',icon:MessageSquareText},{id:'documents',label:'Documentos',icon:FileText},{id:'users',label:'Colaboradores',icon:Users},{id:'usage',label:'Plan y consumo',icon:ShieldCheck},{id:'integrations',label:'Integraciones',icon:Plug},{id:'help',label:'Ayuda',icon:BookOpen}];
export default function Shell({tab,setTab,children}){
 const {session,logout}=useAuth();const [open,setOpen]=useState(false),[mobile,setMobile]=useState(()=>window.matchMedia('(max-width:800px)').matches),[logoutError,setLogoutError]=useState(''),[leaving,setLeaving]=useState(false);
 const sidebar=useRef(null),menu=useRef(null),main=useRef(null),returnToMenu=useRef(false);
 useEffect(()=>{const media=window.matchMedia('(max-width:800px)');const update=()=>{setMobile(media.matches);setOpen(false);};media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{
  if(document.querySelector('dialog[open]'))return;
  if(mobile&&open){sidebar.current?.querySelector('.close-side')?.focus();return;}
  if(returnToMenu.current){returnToMenu.current=false;menu.current?.focus();return;}
  const heading=main.current?.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 },[tab,mobile,open]);
 function closeMenu(){returnToMenu.current=true;setOpen(false);}
 function handleMenuKey(e){
  if(!mobile||!open)return;
  if(e.key==='Escape'){e.preventDefault();closeMenu();}
  if(e.key==='Tab'){
   const nodes=Array.from(sidebar.current.querySelectorAll('button:not(:disabled),a[href]')).filter(n=>n.getClientRects().length);
   const first=nodes[0],last=nodes.at(-1);
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
  }
 }
 async function signOut(){if(leaving)return;setLeaving(true);setLogoutError('');try{await logout();}catch{closeMenu();setLogoutError('No se pudo cerrar la sesión. Revisa la conexión y vuelve a intentarlo.');}finally{setLeaving(false);}}

 useEffect(()=>setOpen(false),[tab]);
 const first=session?.user?.name?.charAt(0)?.toUpperCase()||'U';
 return <div className="layout"><a className="skip-link" href="#main-content">Saltar al contenido</a>
  {open&&<button className="mobile-scrim" aria-label="Cerrar menú" onClick={closeMenu} tabIndex={-1}/>}
  <aside id="main-navigation" ref={sidebar} inert={mobile&&!open} onKeyDown={handleMenuKey} className={'sidebar '+(open?'sidebar-open':'')}>
   <div className="side-top"><div className="brand-mark">P<span>•</span></div><div className="brand-copy"><strong>PolicyBot</strong><span>Asistente documental</span></div><button className="icon-button close-side" onClick={closeMenu} aria-label="Cerrar menú"><X size={19}/></button></div>
   <div className="side-divider"/><div className="side-heading">ESPACIO DE TRABAJO</div>
   <nav className="side-nav" aria-label="Navegación principal">{tabs.filter(t=>!['users','integrations'].includes(t.id)||session?.user?.role==='admin').map(({id,label,icon:Icon})=><button key={id} aria-current={tab===id?'page':undefined} className={'nav-item '+(tab===id?'nav-selected':'')} onClick={()=>setTab(id)}><Icon size={19} strokeWidth={1.9}/><span>{label}</span>{tab===id&&<span className="nav-indicator"/>}</button>)}</nav>
   <div className="sidebar-spacer"/>

   <div className="profile-card"><div className="avatar">{first}</div><div className="profile-copy"><strong title={session?.user?.name}>{session?.user?.name}</strong><span>{session?.company?.name}</span></div><button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" disabled={leaving} onClick={signOut}><LogOut size={18}/></button></div>
  </aside>
  <main className="main-area" inert={mobile&&open}><header className="topbar"><button className="icon-button mobile-menu" ref={menu} aria-label="Abrir menú" aria-expanded={open} aria-controls="main-navigation" onClick={()=>setOpen(true)}><Menu size={21}/></button><div className="breadcrumbs">ESPACIO DE TRABAJO <ChevronRight size={13}/> <strong>{tabs.find(t=>t.id===tab)?.label}</strong></div><div className="topbar-right"><span className="role-tag">{session?.user?.role==='admin'?'Administrador':'Colaborador'}</span><div className="tiny-avatar">{first}</div></div></header><div id="main-content" ref={main} tabIndex={-1} className="main-scroll"><Notice error={logoutError} onClose={()=>setLogoutError('')}/>{children}</div></main>
 </div>;
}
