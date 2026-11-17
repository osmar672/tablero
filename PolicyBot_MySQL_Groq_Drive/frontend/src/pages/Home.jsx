import {useCallback,useEffect,useState} from 'react';
import {ArrowRight,BookOpen,CheckCircle2,FileText,MessageSquareText,RefreshCw} from 'lucide-react';
import {api} from '../services/api.js';
import {useAuth} from '../context/AuthContext.jsx';
import {Empty,Notice,Progress,Spinner} from '../components/UI.jsx';
const states={indexado:'Indexado',indexando:'Indexando',pendiente:'Pendiente',error:'Necesita revisión'};
export default function Home({onNavigate}){
 const {session}=useAuth(),admin=session.user.role==='admin';
 const [documents,setDocuments]=useState(null),[usage,setUsage]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async(signal)=>{
  setLoading(true);setError('');
  const results=await Promise.allSettled([api('/documents',{signal}),api('/usage',{signal})]);
  if(signal?.aborted)return;
  setDocuments(results[0].status==='fulfilled'?results[0].value.documents:null);
  setUsage(results[1].status==='fulfilled'?results[1].value.usage:null);
  const failed=results.map((r,i)=>r.status==='rejected'?(i===0?'los documentos':'el consumo'):null).filter(Boolean);
  if(failed.length)setError(`No pudimos cargar ${failed.join(' y ')}. Puedes volver a intentarlo.`);
  setLoading(false);
 },[]);
 useEffect(()=>{const controller=new AbortController();load(controller.signal);return()=>controller.abort();},[load]);
 const indexed=documents?.filter(d=>d.state==='indexado').length??0,issues=documents?.filter(d=>d.state==='error').length??0;
 const remaining=usage?Math.max(0,Number(usage.max_questions_month)-Number(usage.questions_used)):null;
 const title=documents===null?'Tu espacio de conocimiento':issues?'Hay documentos por revisar':indexed?'Tu conocimiento, a mano':'Comienza con tu primera fuente';
 const description=documents===null?'Consulta las fuentes y el consumo de tu organización.':issues?`${issues} ${issues===1?'documento no terminó':'documentos no terminaron'} de indexarse. Revisa los errores en la biblioteca.`:indexed?`${indexed} ${indexed===1?'documento indexado':'documentos indexados'} para consultar. Haz una pregunta concreta y comprueba las fuentes.`:admin?'Sube una política para que tu equipo pueda consultarla desde el asistente.':'Pide al administrador que suba las políticas de tu empresa para comenzar.';
 return <div className="page page-home"><div className="page-heading"><div><div className="eyebrow">ESPACIO DE CONOCIMIENTO</div><h1>Inicio</h1><p>{session.company.name} · Bienvenido, {session.user.name}.</p></div><button className="btn btn-secondary" disabled={loading} onClick={()=>load()} aria-label="Actualizar resumen"><RefreshCw size={16} className={loading?'spin':''}/> Actualizar</button></div>
 <Notice error={error}/>{error&&<button className="text-button home-retry" disabled={loading} onClick={()=>load()}>Reintentar carga</button>}
 {loading?<Spinner label="Cargando resumen…"/>:<>
 <section className="home-overview" aria-labelledby="overview-title"><div className="home-overview-copy"><span className="home-kicker"><BookOpen size={16}/> DOCUMENTACIÓN DE TU EMPRESA</span><h2 id="overview-title">{title}</h2><p>{description}</p><div className="home-actions"><button className="btn btn-primary" onClick={()=>onNavigate(issues||!indexed?'documents':'chat')}>{issues||!indexed?<FileText size={17}/>:<MessageSquareText size={17}/>} {issues?'Revisar documentos':indexed?'Consultar al asistente':'Ver biblioteca'}<ArrowRight size={16}/></button><button className="text-button" onClick={()=>onNavigate('help')}>Cómo funciona</button></div></div><dl className="home-totals"><div><dt>Fuentes indexadas</dt><dd>{documents===null?'—':indexed}<span>{documents===null?'Datos no disponibles':`de ${documents.length} documentos`}</span></dd></div><div><dt>Preguntas disponibles</dt><dd>{remaining??'—'}<span>{usage?'en el mes actual':'Datos no disponibles'}</span></dd></div></dl></section>
 <div className="home-columns"><section className="home-library" aria-labelledby="recent-title"><div className="section-heading"><div><h2 id="recent-title">Últimos documentos</h2><p>Las fuentes más recientes de tu organización.</p></div><button className="text-button" onClick={()=>onNavigate('documents')}>Ver todos <ArrowRight size={14}/></button></div>
 {documents===null?<Empty icon={FileText} title="Biblioteca no disponible" description="Reintenta la carga para consultar tus documentos."/>:!documents.length?<Empty icon={FileText} title="Tu biblioteca está vacía" description={admin?'Sube el primer archivo desde Documentos.':'El administrador puede agregar las primeras políticas.'} action={<button className="btn btn-secondary" onClick={()=>onNavigate('documents')}>Abrir documentos</button>}/>:<ul className="home-document-list">{documents.slice(0,5).map(d=><li key={d.id}><span className="home-file-icon"><FileText size={18}/></span><div><strong title={d.name}>{d.name}</strong><small>{d.source==='drive'?'Google Drive':'Archivo subido'} · {d.chunk_count} {Number(d.chunk_count)===1?'fragmento':'fragmentos'}</small></div><span className={'home-doc-state '+(d.state==='error'?'home-doc-error':'')}>{d.state==='indexado'&&<CheckCircle2 size={13}/>} {states[d.state]||d.state}</span></li>)}</ul>}</section>
 <aside className="home-plan" aria-labelledby="home-plan-title"><span className="eyebrow">PLAN Y CONSUMO</span><h2 id="home-plan-title">{usage?(usage.plan_id==='pro'?'PolicyBot Pro':'PolicyBot Gratis'):'Consumo no disponible'}</h2>{usage?<><div className="home-plan-row"><span>Documentos</span><strong>{usage.documents_used} / {usage.max_documents}</strong></div><Progress label="Documentos utilizados" value={Number(usage.documents_used)} max={Number(usage.max_documents)}/><div className="home-plan-row"><span>Preguntas del mes</span><strong>{usage.questions_used} / {usage.max_questions_month}</strong></div><Progress label="Preguntas utilizadas este mes" value={Number(usage.questions_used)} max={Number(usage.max_questions_month)}/><p>El consumo se comparte entre los miembros de tu empresa. Las preguntas se cuentan por mes UTC.</p></>:<p>Reintenta la carga para consultar los límites y las preguntas disponibles.</p>}<button className="btn btn-secondary" onClick={()=>onNavigate('usage')}>Consultar consumo <ArrowRight size={15}/></button></aside></div>
 </>}
 </div>;
}
