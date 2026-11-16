// Vector de hashing lexical, NO representa un modelo semántico entrenado.
// Permite un MVP local que almacena y compara vectores sin una segunda API key.
const SIZE=384;
const stopwords=new Set('a al algo algunas algunos ante antes como con contra cual cuando de del desde donde dos el ella ellas ellos en entre era eres es esa esas ese esos esta estan estar estas este esto estos fue ha han hacia hay la las le les lo los mas me mi mis no nos o para pero por porque que quien se ser si sin sobre su sus te tiene tu tus un una unas unos y ya'.split(' '));
function hash(s){let v=2166136261;for(const c of s){v^=c.charCodeAt(0);v=Math.imul(v,16777619);}return v>>>0;}
export function localEmbedding(text){
  const vector=new Array(SIZE).fill(0);
  const words=String(text).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[a-z0-9]{2,}/g)||[];
  for(const word of words){if(stopwords.has(word))continue;
    const n=Math.min(2,1+Math.log2(word.length)/4);
    const h=hash(word);vector[h%SIZE]+=n*(h&2?-1:1);
  }
  const length=Math.hypot(...vector)||1;return vector.map(x=>x/length);
}
export function cosine(a,b){if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length)return -1;let s=0,aa=0,bb=0;for(let i=0;i<a.length;i++){s+=a[i]*b[i];aa+=a[i]**2;bb+=b[i]**2;}return aa&&bb?s/Math.sqrt(aa*bb):0;}
