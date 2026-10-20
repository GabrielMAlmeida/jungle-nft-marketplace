// Demo credentials live only in MSW's browser-side fake database. Not production authentication.
const toHex=(bytes:Uint8Array)=>[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
const fromHex=(hex:string)=>new Uint8Array((hex.match(/.{2}/g)??[]).map(x=>parseInt(x,16)));
const iterations=120_000;
async function derive(password:string,salt:Uint8Array){
  const raw=new TextEncoder().encode(password);
  const key=await crypto.subtle.importKey('raw',raw,'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:salt as BufferSource,iterations,hash:'SHA-256'},key,256);
  return toHex(new Uint8Array(bits));
}
export async function hashPassword(password:string){const salt=crypto.getRandomValues(new Uint8Array(16));return `pbkdf2$${toHex(salt)}$${await derive(password,salt)}`}
export async function verifyPassword(password:string,encoded:string){if(!encoded.startsWith('pbkdf2$'))return false;const [,salt,digest]=encoded.split('$');return (await derive(password,fromHex(salt)))===digest}
