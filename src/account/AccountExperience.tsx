import {Input} from '../components/ui/input';
import {useEffect,useState} from 'react';
import type {FormEvent,ChangeEvent,ReactNode} from 'react';
import {Link} from '@tanstack/react-router';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {UserRound,Wallet,Heart,LogOut,Upload,ArrowLeft,ShieldCheck} from 'lucide-react';
import {api,errorMessage} from '../lib/api';
import type {CollectorProfile,CollectorWallet,User} from '../types';

const emptyProfile:CollectorProfile={name:'',username:'',email:'',ens:'',walletNickname:'',avatar:null};
const emptyWallet:CollectorWallet={id:'',label:'',alias:'',network:'Ethereum',address:'',provider:'MetaMask',ens:'',primary:false};
type Props={user:User|null;loading:boolean;logout:()=>Promise<void>};

function AccountLayout({user,loading,logout,page,children}:{user:User|null;loading:boolean;logout:()=>Promise<void>;page:'profile'|'wallets';children:ReactNode}){
 if(loading)return <div className="kurio-account-loading shimmer" aria-label="Carregando sessão"/>;
 if(!user)return <div className="kurio-account-locked"><h1>Área do colecionador</h1><p>Faça login para acessar seus dados privados.</p><Link to="/login" className="btn-primary">Entrar</Link></div>;
 return <div className="kurio-account-page"><aside className="kurio-account-sidebar"><h2>Meu perfil</h2><Link to="/account" className={page==='profile'?'active':''}><UserRound size={17}/> Dados do perfil</Link><Link to="/account/wallets" className={page==='wallets'?'active':''}><Wallet size={17}/> Carteiras</Link><Link to="/favorites"><Heart size={17}/> Lista de interesse</Link><button type="button" onClick={()=>void logout()}><LogOut size={17}/> Sair</button></aside><div className="kurio-account-main"><div className="kurio-account-mobile-back"><Link to="/account" aria-label="Voltar ao perfil"><ArrowLeft size={18}/></Link><span>{page==='wallets'?'Minhas carteiras':'Meu perfil'}</span></div>{children}</div></div>
}

export function ProfileExperience(props:Props){
 const qc=useQueryClient();const [form,setForm]=useState<CollectorProfile>(emptyProfile),[message,setMessage]=useState(''),[password,setPassword]=useState({current:'',newPass:'',confirm:''}),[pwMsg,setPwMsg]=useState('');
 const profile=useQuery({queryKey:['collector-profile',props.user?.id],queryFn:async():Promise<CollectorProfile>=>(await api.get('/profile')).data,enabled:!!props.user,retry:false});
 useEffect(()=>{if(profile.data)setForm(profile.data)},[profile.data]);
 const save=useMutation({mutationFn:async(v:CollectorProfile)=>(await api.put<CollectorProfile>('/profile',v)).data,onSuccess:async(v)=>{setMessage('Perfil atualizado com sucesso.');setForm(v);await qc.invalidateQueries({queryKey:['collector-profile']});await qc.invalidateQueries({queryKey:['session']})},onError:e=>setMessage(errorMessage(e))});
 const updatePass=useMutation({mutationFn:async()=>{if(password.newPass!==password.confirm)throw Error('As novas senhas não correspondem.');return (await api.put('/profile/password',{currentPassword:password.current,newPassword:password.newPass})).data},onSuccess:()=>{setPwMsg('Senha alterada com sucesso.');setPassword({current:'',newPass:'',confirm:''})},onError:e=>setPwMsg(errorMessage(e))});
 const filePicked=(e:ChangeEvent<HTMLInputElement>)=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>450_000){setMessage('Use PNG, JPG ou WebP de até 450 KB.');return}
  const reader=new FileReader();reader.onload=()=>{if(typeof reader.result==='string'){setForm(x=>({...x,avatar:reader.result as string}));setMessage('Avatar selecionado. Clique em Salvar para confirmar.')}};reader.readAsDataURL(file);
 };
 return <AccountLayout {...props} page="profile"><h1>Perfil do colecionador</h1>
  {profile.isPending?<div className="shimmer h-72" aria-label="Carregando perfil"/>:profile.isError?<div role="alert">{errorMessage(profile.error)} <button onClick={()=>profile.refetch()}>Tentar novamente</button></div>:<>
   <form onSubmit={(e:FormEvent)=>{e.preventDefault();setMessage('');save.mutate(form)}} className="kurio-account-form">
    <div className="kurio-account-fields">
     <label>Nome de exibição *<Input required minLength={2} maxLength={70} value={form.name} onChange={e=>setForm(x=>({...x,name:e.target.value}))}/></label>
     <label>Nome de usuário *<Input required minLength={3} maxLength={24} value={form.username} onChange={e=>setForm(x=>({...x,username:e.target.value}))}/></label>
     <label>E-mail *<Input required type="email" value={form.email} onChange={e=>setForm(x=>({...x,email:e.target.value}))}/></label>
     <label>Nome ENS (opcional)<div className="kurio-ens-field"><span>.eth</span><Input value={form.ens} onChange={e=>setForm(x=>({...x,ens:e.target.value}))} placeholder="seunome"/></div></label>
     <label>Apelido da carteira<Input value={form.walletNickname} onChange={e=>setForm(x=>({...x,walletNickname:e.target.value}))} maxLength={50}/></label>
     <div className="kurio-avatar-field"><span>Avatar</span><div><span className="kurio-avatar-preview">{form.avatar?<img src={form.avatar} alt="Prévia do avatar"/>:<UserRound size={20}/>}</span><label className="kurio-upload-button"><Upload size={15}/> Alterar<input type="file" accept="image/png,image/jpeg,image/webp" onChange={filePicked} className="sr-only"/></label><button type="button" className="kurio-remove-avatar" onClick={()=>setForm(x=>({...x,avatar:null}))}>Remover</button></div></div>
    </div>
    {message&&<p role="status" className={save.isError?'kurio-form-error':'kurio-form-success'}>{message}</p>}
    <button disabled={save.isPending} type="submit" className="kurio-form-submit">{save.isPending?'Salvando...':'Salvar perfil'}</button>
   </form>
   <form className="kurio-password-form" onSubmit={e=>{e.preventDefault();setPwMsg('');updatePass.mutate()}}><h2>Alterar senha</h2><label>Senha atual<Input type="password" required autoComplete="current-password" value={password.current} onChange={e=>setPassword(x=>({...x,current:e.target.value}))}/></label><label>Nova senha<Input type="password" required minLength={8} autoComplete="new-password" value={password.newPass} onChange={e=>setPassword(x=>({...x,newPass:e.target.value}))}/></label><label>Confirmar nova senha<Input type="password" required minLength={8} autoComplete="new-password" value={password.confirm} onChange={e=>setPassword(x=>({...x,confirm:e.target.value}))}/></label>{pwMsg&&<p role="status" className={updatePass.isError?'kurio-form-error':'kurio-form-success'}>{pwMsg}</p>}<button type="submit" disabled={updatePass.isPending} className="kurio-form-submit">{updatePass.isPending?'Atualizando...':'Alterar senha'}</button></form>
  </>}
 </AccountLayout>
}

function WalletEditor({value,onChange,onSubmit,busy,error,success}:{value:CollectorWallet;onChange:(v:CollectorWallet)=>void;onSubmit:(e:FormEvent)=>void;busy:boolean;error:string;success:string}){
 return <form onSubmit={onSubmit} className="kurio-wallet-form"><div className="kurio-account-fields">
  <label>Nome de exibição *<Input required value={value.label} minLength={2} onChange={e=>onChange({...value,label:e.target.value})} placeholder="Carteira principal"/></label>
  <label>Apelido da carteira *<Input required value={value.alias} minLength={2} onChange={e=>onChange({...value,alias:e.target.value})} placeholder="Minha carteira"/></label>
  <label>Rede *<select value={value.network} onChange={e=>onChange({...value,network:e.target.value as CollectorWallet['network']})}><option>Ethereum</option><option>Polygon</option><option>Solana</option></select></label>
  <label>Tipo de carteira *<select value={value.provider} onChange={e=>onChange({...value,provider:e.target.value as CollectorWallet['provider']})}><option>MetaMask</option><option>Coinbase Wallet</option><option>WalletConnect</option></select></label>
  <label>Endereço da carteira *<Input required value={value.address} onChange={e=>onChange({...value,address:e.target.value})} placeholder="0x..." spellCheck={false}/></label>
  <label>ENS (opcional)<Input value={value.ens} onChange={e=>onChange({...value,ens:e.target.value})} placeholder="nome.eth"/></label>
 </div><label className="kurio-wallet-primary"><input type="checkbox" checked={value.primary} onChange={e=>onChange({...value,primary:e.target.checked})}/> Utilizar como carteira principal</label><p className="kurio-wallet-note"><ShieldCheck size={16}/> Apenas endereços fictícios; não conecte ou envie ativos reais.</p>{error&&<p role="alert" className="kurio-form-error">{error}</p>}{success&&<p role="status" className="kurio-form-success">{success}</p>}<button className="kurio-form-submit" type="submit" disabled={busy}>{busy?'Salvando...':value.id?'Salvar alterações':'Salvar carteira'}</button></form>
}

export function WalletsExperience(props:Props){
 const qc=useQueryClient();const [form,setForm]=useState<CollectorWallet>(emptyWallet),[message,setMessage]=useState(''),[error,setError]=useState('');
 const wallets=useQuery({queryKey:['collector-wallets',props.user?.id],queryFn:async():Promise<CollectorWallet[]>=>(await api.get('/wallets')).data,enabled:!!props.user,retry:false});
 const mutation=useMutation({mutationFn:async(v:CollectorWallet):Promise<CollectorWallet>=>(await (v.id?api.put(`/wallets/${v.id}`,v):api.post('/wallets',v))).data,onSuccess:async result=>{setMessage(`${result.label} salva com sucesso.`);setError('');setForm(emptyWallet);await qc.invalidateQueries({queryKey:['collector-wallets',props.user?.id]})},onError:e=>{setMessage('');setError(errorMessage(e))}});
 const submit=(e:FormEvent)=>{e.preventDefault();setMessage('');setError('');mutation.mutate(form)};
 return <AccountLayout {...props} page="wallets"><div className="kurio-wallet-header"><div><h1>Minhas carteiras</h1><p>Cadastre até duas carteiras fictícias para escolher durante o checkout.</p></div><button type="button" onClick={()=>{setForm(emptyWallet);setMessage('');setError('')}}>+ Adicionar</button></div>
  {wallets.isPending?<div className="shimmer h-32" aria-label="Carregando carteiras"/>:wallets.isError?<p role="alert">{errorMessage(wallets.error)}</p>:<div className="kurio-wallet-cards">{wallets.data?.map(v=><article key={v.id}><div><strong>{v.label}</strong><small>{v.alias} · {v.network} · {v.provider}</small><code>{v.address}</code></div><div>{v.primary&&<span>Principal</span>}<button type="button" onClick={()=>{setForm({...v});setMessage('');setError('')}}>Editar</button></div></article>)}{wallets.data?.length===0&&<p>Você ainda não adicionou uma carteira.</p>}</div>}
  {(!!form.id||!wallets.data||wallets.data.length<2)&&<><h2 className="kurio-wallet-form-title">{form.id?'Editar carteira':'Adicionar carteira'}</h2><WalletEditor value={form} onChange={setForm} onSubmit={submit} busy={mutation.isPending} error={error} success={message}/></>}
 </AccountLayout>
}
