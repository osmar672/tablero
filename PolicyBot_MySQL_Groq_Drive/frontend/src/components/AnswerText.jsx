// Render the small set of formatting used by policy answers as React text nodes.
// Provider/user HTML remains literal text; no HTML is evaluated.
function inline(text){return text.split(/(\*\*[^*]+\*\*)/g).map((part,i)=>part.startsWith('**')&&part.endsWith('**')?<strong key={i}>{part.slice(2,-2)}</strong>:part);}
export default function AnswerText({text}){
 const blocks=[],lines=String(text).split('\n');let items=[],kind=null;
 function flush(){if(!items.length)return;const Tag=kind==='number'?'ol':'ul';blocks.push(<Tag key={'list-'+blocks.length}>{items.map((item,i)=><li key={i}>{inline(item)}</li>)}</Tag>);items=[];kind=null;}
 for(const line of lines){
  const bullet=line.match(/^\s*[-*]\s+(.+)$/),number=line.match(/^\s*\d+[.)]\s+(.+)$/);
  if(bullet||number){const next=number?'number':'bullet';if(kind&&kind!==next)flush();kind=next;items.push((number||bullet)[1]);continue;}
  flush();if(!line.trim())continue;
  const heading=line.match(/^#{1,4}\s+(.+)$/);
  blocks.push(heading?<p className="answer-subheading" key={'p-'+blocks.length}><strong>{inline(heading[1])}</strong></p>:<p key={'p-'+blocks.length}>{inline(line)}</p>);
 }
 flush();return <div className="answer-text">{blocks}</div>;
}
