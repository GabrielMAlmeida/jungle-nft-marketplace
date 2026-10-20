import {Input} from '../components/ui/input';
import {useState} from 'react';
import type {FormEvent} from 'react';
import {Link,useNavigate} from '@tanstack/react-router';
import {useQueryClient} from '@tanstack/react-query';
import {Eye,EyeOff,X,ArrowRight} from 'lucide-react';
import {api,errorMessage} from '../lib/api';
import type {CartLine,NFT} from '../types';

type Mode='login'|'register';
const homeSearch={q:'',category:'All',sort:'featured',page:1};
const art=['nft-emerald-ape.png','nft-golden-beat.png','nft-neon-vessel.png','nft-sage-nomad.png'];

export function AuthExperience({mode}:{mode:Mode}){
 const navigate=useNavigate();const qc=useQueryClient();
 const [name,setName]=useState('');const [email,setEmail]=useState('');
 const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');
 const [showPassword,setShowPassword]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 const register=mode==='register';
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setError('');
  if(register&&password!==confirm){setError('A confirmação de senha não corresponde.');return}
  if(password.length<8){setError('Use pelo menos oito caracteres na senha.');return}
  setBusy(true);
  try{
   if(register)await api.post('/auth/register',{name,email:email.trim(),password});
   const {data}=await api.post<{token:string}>('/auth/login',{email:email.trim(),password});
   sessionStorage.setItem('jungle-token',data.token);
   let guest:CartLine[]=[];
   try{const raw=JSON.parse(localStorage.getItem('jungle-guest-cart')||'[]');guest=Array.isArray(raw)?raw:[]}catch{guest=[]}
   if(guest.length){
    try{
     const remote=(await api.get<{items:CartLine[]}>('/cart')).data.items;
     const merged=new Map<string,number>();
     for(const line of [...remote,...guest])merged.set(line.nftId,(merged.get(line.nftId)??0)+line.quantity);
     const valid=await Promise.all([...merged].map(async([nftId,quantity])=>{
      try{const nft=(await api.get<NFT>(`/nfts/${nftId}`)).data;return{nftId,quantity:Math.min(nft.stock,quantity)}}catch{return{nftId,quantity:0}}
     }));
     await api.put('/cart',{items:valid.filter(x=>x.quantity>0)});
     localStorage.removeItem('jungle-guest-cart');
    }catch{sessionStorage.setItem('kurio-cart-merge-warning','Não foi possível transferir todo o carrinho. Confira seus itens.');}
   }
   qc.clear();
   const after=sessionStorage.getItem('kurio-after-login');sessionStorage.removeItem('kurio-after-login');
   await navigate({to:after==='/checkout'?'/checkout':register?'/account':'/cart'});
  }catch(e){setError(errorMessage(e))}finally{setBusy(false)}
 };
 return <div className="kurio-auth-page">
  <div className="kurio-auth-preview" aria-hidden="true">
   <div className="kurio-auth-preview-hero"><div><span>Bem-vindo à Kurio</span><h2>SEJA DONO DO FUTURO DA ARTE DIGITAL</h2><p>Descubra NFTs selecionados de criadores da cultura digital.</p><span className="kurio-auth-preview-button">EXPLORAR <ArrowRight size={12}/></span></div><img src="/images/nft-emerald-ape.png" alt=""/></div>
   <div className="kurio-auth-preview-gallery">{art.map((file,i)=><div key={file}><img src={`/images/${file}`} alt=""/><strong>{['Emerald Ape #042','Golden Beat #207','Neon Vessel #552','Sage Nomad #009'][i]}</strong><span>1.19 ETH</span></div>)}</div>
  </div>
  <section className="kurio-auth-panel" role="region" aria-labelledby="kurio-auth-title">
   <Link to="/" search={homeSearch} className="kurio-auth-close" aria-label="Fechar e voltar ao catálogo"><X size={21}/></Link>
   <div className="kurio-auth-mobile-brand">KURIO</div>
   <h1 id="kurio-auth-title">{register?'Criar conta':'Entrar'} <span>|</span> <Link to={register?'/login':'/register'}>{register?'Entrar':'Criar conta'}</Link></h1>
   <p className="kurio-auth-subtitle">{register?'Crie seu perfil de colecionador e conecte sua carteira quando quiser.':'Entre para gerenciar sua carteira, coleção e perfil de criador.'}</p>
   <form onSubmit={submit} className="kurio-auth-form">
    {register&&<label>Nome do usuário<Input required autoComplete="name" minLength={2} maxLength={70} value={name} onChange={e=>setName(e.target.value)} placeholder="Nome do usuário"/></label>}
    <label>E-mail<Input aria-label="E-mail" required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="contato@email.com"/></label>
    <label>Senha<div className="kurio-auth-password"><Input aria-label="Senha" required minLength={8} type={showPassword?'text':'password'} autoComplete={register?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de oito caracteres"/><button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></div></label>
    {register&&<label>Confirmar senha<Input aria-label="Confirmar senha" required minLength={8} type={showPassword?'text':'password'} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="Repita sua senha"/></label>}
    {!register&&<p className="kurio-auth-help">A recuperação de senha não faz parte da simulação.</p>}
    {error&&<p role="alert" className="kurio-auth-error">{error}</p>}
    <button className="kurio-auth-submit" type="submit" disabled={busy}>{busy?'Aguarde...':register?'Criar conta':'Entrar'}</button>
   </form>
   <p className="kurio-auth-divider">Ou continue com</p>
   <button className="kurio-auth-social" type="button" disabled title="Integração fora do escopo">🌐 Continuar com Google — indisponível</button>
   <button className="kurio-auth-social" type="button" disabled title="Integração fora do escopo">Continuar com Facebook — indisponível</button>
   <p className="kurio-auth-demo">Acesso fictício: <strong>alex@demo.com</strong> / <strong>Demo123!</strong></p>
  </section>
 </div>
}
