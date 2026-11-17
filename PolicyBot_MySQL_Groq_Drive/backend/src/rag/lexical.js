// Comparación léxica española para complementar el hashing local sin reindexar.
const ignored=new Set('a al ante como con cual cuales cuando cuanto cuanta cuantos cuantas de del desde donde el ella ellos en entre es esta estan este estos hay la las le lo los me mi mis no nos o para pero por porque que quien se si sin sobre su sus te tiene tu tus un una unos unas y ya puedo puedes podria quiero necesito saber favor empresa politica politicas'.split(' '));
export function searchTerms(text){
  const words=String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{2,}/g)||[];
  return new Set(words.filter(w=>!ignored.has(w)).map(word=>{
    if(word.length>5&&word.endsWith('iones'))return word.slice(0,-2);
    if(word.length>4&&/[aeiou]s$/.test(word))return word.slice(0,-1);
    return word;
  }));
}
export function lexicalMatch(question,content,title=''){
  const query=searchTerms(question),body=searchTerms(content),heading=searchTerms(title.replace(/[_\-.]/g,' '));
  if(!query.size)return {coverage:0,titleCoverage:0};
  let matched=0,titled=0;
  for(const term of query){if(body.has(term)||heading.has(term))matched++;if(heading.has(term))titled++;}
  return {coverage:matched/query.size,titleCoverage:titled/query.size};
}
