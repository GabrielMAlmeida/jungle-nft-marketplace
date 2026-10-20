import {http,HttpResponse,delay} from 'msw';
import Decimal from 'decimal.js';
import {readDB,saveDB} from './data';
import type {CartLine,Quote,Order,CollectorProfile,CollectorWallet} from '../types';
import {hashPassword,verifyPassword} from './password';
import {publishNft,publishOrder,replayLastNftEvent} from './realtime';
import {applyNetworkScenario,configureScenario,currentScenario,resetScenario} from './scenarios';
function auth(request:Request,db:ReturnType<typeof readDB>){const token=request.headers.get('Authorization')?.replace('Bearer ','')??'';return db.users.find(u=>u.id===db.sessions[token])}
const fail=(message:string,status=400)=>HttpResponse.json({message},{status});
const sleep=()=>delay(180);
function quote(lines:CartLine[],coupon:string|null,db:ReturnType<typeof readDB>):Quote{let sub=new Decimal(0);for(const line of lines){const nft=db.nfts.find(n=>n.id===line.nftId);if(!nft||!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>nft.stock)throw Error(`Estoque insuficiente para ${nft?.name??line.nftId}`);sub=sub.plus(new Decimal(nft.priceEth).times(line.quantity))}if(coupon&&coupon!=='JUNGLE10')throw Error('Cupom inválido ou expirado');const discount=coupon?sub.mul('0.10'):new Decimal(0);const fee=lines.length?new Decimal('0.003'):new Decimal(0);return {subtotalEth:sub.toFixed(4),discountEth:discount.toFixed(4),feeEth:fee.toFixed(4),totalEth:sub.minus(discount).plus(fee).toFixed(4),coupon}}
// Account resources: every request is authorized and scoped to the signed-in collector.
function profileOf(db:ReturnType<typeof readDB>,user:{id:string;name:string;email:string}):CollectorProfile{
 return db.profiles[user.id]??{name:user.name,email:user.email,username:user.email.split('@')[0].replace(/[^a-z0-9_]/gi,''),ens:'',walletNickname:'',avatar:null};
}
const validWalletAddress=(value:string,network:string)=>network==='Solana'? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value):/^0x[a-fA-F0-9]{40}$/.test(value);

// Transição feita no mock (não em componentes React): estado, estoque e eventos compartilham o mesmo DB.
function settleOrder(ownerId:string,orderId:string){
  const db=readDB();
  const order=db.orders[ownerId]?.find(item=>item.id===orderId);
  if(!order||order.status!=='pending')return;
  order.status=order.outcome==='rejected'?'rejected':'confirmed';
  order.version=(order.version??1)+1;
  if(order.status==='confirmed'){
    const current=db.cart[ownerId]?.items??[];
    db.cart[ownerId]={items:current.map(line=>({
      ...line,quantity:line.quantity-(order.items.find(item=>item.nftId===line.nftId)?.quantity??0)
    })).filter(line=>line.quantity>0)};
    for(const item of order.items){
      const nft=db.nfts.find(n=>n.id===item.nftId);
      if(nft){nft.stock=Math.max(0,nft.stock-item.quantity);nft.version+=1;}
    }
  }else{order.failureReason='Pagamento recusado na simulação';}
  for(const record of Object.values(db.idempotency)){
    if(record.order.id===order.id)record.order=structuredClone(order);
  }
  saveDB(db);
  if(order.status==='confirmed')for(const item of order.items){
    const nft=db.nfts.find(n=>n.id===item.nftId);if(nft)publishNft(nft);
  }
  publishOrder(ownerId,order);
}

export const handlers=[
// Reproduzir uma falha: POST /api/demo/network {"scope":"catalog","mode":"http500"}
// mode: normal, slow, stagger, http500, offline, expire (expire: session/orders).
http.get('/api/demo/network',()=>HttpResponse.json({scenario:currentScenario()})),
http.post('/api/demo/network',async({request})=>{
  const scenario=configureScenario(await request.json());
  return scenario?HttpResponse.json({scenario}):fail('Cenário de rede inválido',422);
}),
http.delete('/api/demo/network',()=>{resetScenario();return HttpResponse.json({ok:true})}),
// Cenários de teste determinísticos: REST muda o banco; MSW publica o evento Socket.IO.
http.post('/api/demo/nft-event',async({request})=>{
  const input=await request.json() as {id?:string;action?:'price_up'|'stock_zero'|'restore'|'replay'};
  if(input.action==='replay')return HttpResponse.json({replayed:replayLastNftEvent()});
  const db=readDB();const nft=db.nfts.find(n=>n.id===input.id);
  if(!nft)return fail('NFT de demonstração não encontrado',404);
  if(input.action==='price_up')nft.priceEth=new Decimal(nft.priceEth).plus('0.10').toFixed(2);
  else if(input.action==='stock_zero')nft.stock=0;
  else if(input.action==='restore'){const seed=(await import('./data')).seeds.find(item=>item.id===nft.id);if(seed){nft.stock=seed.stock;nft.priceEth=seed.priceEth}}
  else return fail('Cenário de teste inválido',422);
  nft.version+=1;saveDB(db);publishNft(nft);
  return HttpResponse.json(nft);
}),
http.get('/api/nfts',async({request})=>{const injected=await applyNetworkScenario('catalog',request);if(injected)return injected;await sleep();const db=readDB();const url=new URL(request.url);const term=(url.searchParams.get('q')??'').toLowerCase();const category=url.searchParams.get('category')??'All';const sort=url.searchParams.get('sort')??'featured';const page=Math.max(1,Number(url.searchParams.get('page')||1));const filtered=db.nfts.filter(n=>(n.name+' '+n.creator+' '+n.collection).toLowerCase().includes(term)&&(category==='All'||n.category===category));filtered.sort((a,b)=>sort==='price-asc'?Number(a.priceEth)-Number(b.priceEth):sort==='price-desc'?Number(b.priceEth)-Number(a.priceEth):sort==='name'?a.name.localeCompare(b.name):sort==='newest'?Number(b.id.split('-')[1])-Number(a.id.split('-')[1]):Number(Boolean(b.featured))-Number(Boolean(a.featured)));return HttpResponse.json({items:filtered.slice((page-1)*8,page*8),total:filtered.length,page,pages:Math.max(1,Math.ceil(filtered.length/8))})}),
http.get('/api/nfts/:id',async({params,request})=>{const injected=await applyNetworkScenario('detail',request);if(injected)return injected;await sleep();const nft=readDB().nfts.find(n=>n.id===params.id);return nft?HttpResponse.json(nft):fail('NFT não encontrado',404)}),
http.post('/api/auth/login',async({request})=>{await sleep();const {email,password}=await request.json() as {email:string;password:string};const db=readDB();const u=db.users.find(x=>x.email.toLowerCase()===email.toLowerCase());if(!u||!u.passwordHash||!(await verifyPassword(password,u.passwordHash)))return fail('E-mail ou senha incorretos',401);const token=crypto.randomUUID();db.sessions[token]=u.id;saveDB(db);return HttpResponse.json({token,user:{id:u.id,name:u.name,email:u.email}})}),
http.post('/api/auth/register',async({request})=>{await sleep();const {name,email,password}=await request.json() as {name:string;email:string;password:string};const db=readDB();if(!name||!email.includes('@')||password.length<8)return fail('Confira os campos. Senha mínima: 8 caracteres');if(db.users.some(u=>u.email.toLowerCase()===email.trim().toLowerCase()))return fail('Este e-mail já está cadastrado',409);const user={id:crypto.randomUUID(),name:name.trim(),email:email.trim(),passwordHash:await hashPassword(password)};db.users.push(user);saveDB(db);return HttpResponse.json({id:user.id,name:user.name,email:user.email},{status:201})}),
http.get('/api/auth/me',async({request})=>{const injected=await applyNetworkScenario('session',request);if(injected)return injected;const u=auth(request,readDB());return u?HttpResponse.json({id:u.id,name:u.name,email:u.email}):fail('Sessão inválida',401)}),
http.post('/api/auth/logout',({request})=>{const db=readDB();const token=request.headers.get('Authorization')?.replace('Bearer ','')??'';delete db.sessions[token];saveDB(db);return HttpResponse.json({ok:true})}),
http.get('/api/cart',({request})=>{const db=readDB();const u=auth(request,db);if(!u)return fail('Não autorizado',401);return HttpResponse.json(db.cart[u.id]??{items:[]})}),
http.put('/api/cart',async({request})=>{const db=readDB();const u=auth(request,db);if(!u)return fail('Não autorizado',401);const body=await request.json() as {items:CartLine[]};const lines=body.items.filter(x=>x.quantity>0);try{quote(lines,null,db)}catch(e){return fail((e as Error).message,409)}db.cart[u.id]={items:lines};saveDB(db);return HttpResponse.json(db.cart[u.id])}),
http.post('/api/quote',async({request})=>{const injected=await applyNetworkScenario('quote',request);if(injected)return injected;const db=readDB();const body=await request.json() as {items:CartLine[];coupon:string|null};try{return HttpResponse.json(quote(body.items,body.coupon,db))}catch(e){return fail((e as Error).message,409)}}),
http.get('/api/favorites',({request})=>{const db=readDB();const u=auth(request,db);return u?HttpResponse.json(db.favorites[u.id]??[]):fail('Não autorizado',401)}),
http.put('/api/favorites',async({request})=>{const db=readDB();const u=auth(request,db);if(!u)return fail('Não autorizado',401);const body=await request.json() as {ids:string[]};db.favorites[u.id]=body.ids;saveDB(db);return HttpResponse.json(body.ids)}),
http.post('/api/orders',async({request})=>{
  const injected=await applyNetworkScenario('orders',request);if(injected)return injected;
  const db=readDB();
  const u=auth(request,db);
  if(!u)return fail('Sessão expirada ou inválida',401);
  const key=request.headers.get('Idempotency-Key');
  if(!key)return fail('Chave de idempotência obrigatória');
  const body=await request.json() as {
    items:CartLine[];coupon:string|null;expectedQuote:Quote;
    paymentMethod:string;network:string;walletAddress:string;mode?:'success'|'decline'|'timeout'
  };
  const fingerprint=JSON.stringify({items:body.items,coupon:body.coupon,expectedQuote:body.expectedQuote,paymentMethod:body.paymentMethod,network:body.network,walletAddress:body.walletAddress,mode:body.mode??'success'});
  const storageKey=`${u.id}:${key}`;
  const existing=db.idempotency[storageKey];
  if(existing)return existing.fingerprint===fingerprint?HttpResponse.json(existing.order):fail('Chave idempotente reutilizada com conteúdo diferente',409);
  if(!Array.isArray(body.items)||!body.items.length)return fail('Carrinho vazio',400);
  if(!body.paymentMethod||!body.network||!validWalletAddress(body.walletAddress,body.network))return fail('Dados da carteira inválidos',400);
  let live:Quote;
  try{live=quote(body.items,body.coupon,db)}catch(e){return fail((e as Error).message,409)}
  const matches=!!body.expectedQuote&&['subtotalEth','discountEth','feeEth','totalEth','coupon'].every(field=>String(live[field as keyof Quote]??'')===String(body.expectedQuote[field as keyof Quote]??''));
  if(!matches)return fail('Cotação desatualizada. Confira os novos valores antes de concluir.',409);
  const order:Order={
    version:1,
    id:`ORD-${Date.now()}-${crypto.randomUUID().slice(0,6).toUpperCase()}`,
    status:'pending',
    quote:live,
    items:body.items.map(line=>{const nft=db.nfts.find(n=>n.id===line.nftId)!;return {nftId:nft.id,name:nft.name,quantity:line.quantity,unitPriceEth:nft.priceEth,image:nft.image}}),
    outcome:body.mode==='decline'?'rejected':'confirmed',
    transactionId:`0x${crypto.randomUUID().replaceAll('-','')}`,
    paymentMethod:body.paymentMethod,network:body.network,
    createdAt:new Date().toISOString()
  };
  db.orders[u.id]??=[];
  db.orders[u.id].push(order);
  db.idempotency[storageKey]={fingerprint,order};
  saveDB(db);
  // A confirmação é assíncrona e emite order.updated independentemente de polling.
  setTimeout(()=>settleOrder(u.id,order.id),2400);
  if(body.mode==='timeout'){
    // A API demora mais que o timeout do Axios mesmo após gravar o pedido.
    // Um segundo POST com a MESMA chave retorna o pedido existente.
    await delay(11_000);
  }
  return HttpResponse.json(order,{status:202});
}),
// Recuperação segura de tentativa idempotente após timeout, refresh ou reconexão.
// O identificador é sempre resolvido no escopo do usuário autenticado.
http.get('/api/orders/by-key/:key',async({request,params})=>{
  const db=readDB();
  const u=auth(request,db);
  if(!u)return fail('Sessão expirada ou inválida',401);
  const order=db.idempotency[`${u.id}:${String(params.key)}`]?.order;
  if(!order)return fail('Nenhum pedido encontrado para esta tentativa',404);
  if(order.status==='pending'&&Date.now()-new Date(order.createdAt).getTime()>=2400){
    settleOrder(u.id,order.id);
    const updated=readDB().idempotency[`${u.id}:${String(params.key)}`]?.order;
    return HttpResponse.json(updated??order);
  }
  return HttpResponse.json(order);
}),
http.get('/api/orders/:id',async({request,params})=>{
  await sleep();
  const db=readDB();
  const u=auth(request,db);
  if(!u)return fail('Sessão expirada',401);
  const order=db.orders[u.id]?.find(o=>o.id===params.id);
  if(!order)return fail('Pedido não encontrado',404);
  if(order.status==='pending'&&Date.now()-new Date(order.createdAt).getTime()>=2400){
    settleOrder(u.id,order.id);return HttpResponse.json(readDB().orders[u.id].find(entry=>entry.id===params.id));
  }
  return HttpResponse.json(order);
}),

http.get('/api/profile',({request})=>{
 const db=readDB(),user=auth(request,db);return user?HttpResponse.json(profileOf(db,user)):fail('Sessão inválida',401);
}),
http.put('/api/profile',async({request})=>{
 const db=readDB(),user=auth(request,db);if(!user)return fail('Sessão inválida',401);
 const next=await request.json() as CollectorProfile;
 if(typeof next.name!=='string'||next.name.trim().length<2||next.name.trim().length>70)return fail('O nome precisa ter entre 2 e 70 caracteres.',422);
 if(typeof next.username!=='string'||! /^[a-zA-Z0-9_]{3,24}$/.test(next.username))return fail('O usuário deve ter de 3 a 24 caracteres: letras, números ou _.',422);
 if(typeof next.email!=='string'||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email))return fail('Informe um e-mail válido.',422);
 if(db.users.some(x=>x.id!==user.id&&x.email.toLowerCase()===next.email.toLowerCase()))return fail('E-mail já cadastrado.',409);
 if(Object.entries(db.profiles).some(([id,v])=>id!==user.id&&v.username.toLowerCase()===next.username.toLowerCase()))return fail('Nome de usuário indisponível.',409);
 if(next.avatar!==null&&next.avatar!==undefined&&(typeof next.avatar!=='string'||!next.avatar.startsWith('data:image/')||next.avatar.length>850_000))return fail('Avatar inválido ou grande demais.',422);
 const profile:CollectorProfile={name:next.name.trim(),email:next.email.trim(),username:next.username.trim(),ens:String(next.ens??'').slice(0,70),walletNickname:String(next.walletNickname??'').slice(0,50),avatar:next.avatar??null};
 user.name=profile.name;user.email=profile.email;db.profiles[user.id]=profile;saveDB(db);return HttpResponse.json(profile);
}),
http.put('/api/profile/password',async({request})=>{
 const db=readDB(),user=auth(request,db);if(!user)return fail('Sessão inválida',401);
 const {currentPassword,newPassword}=await request.json() as {currentPassword:string;newPassword:string};
 if(!user.passwordHash||!(await verifyPassword(currentPassword,user.passwordHash)))return fail('Senha atual incorreta.',422);
 if(typeof newPassword!=='string'||newPassword.length<8||newPassword.length>128)return fail('A nova senha deve ter de 8 a 128 caracteres.',422);
 if(currentPassword===newPassword)return fail('Escolha uma senha diferente da atual.',422);
 user.passwordHash=await hashPassword(newPassword);saveDB(db);return HttpResponse.json({ok:true});
}),
http.get('/api/wallets',({request})=>{
 const db=readDB(),user=auth(request,db);return user?HttpResponse.json(db.wallets[user.id]??[]):fail('Sessão inválida',401);
}),
http.post('/api/wallets',async({request})=>{
 const db=readDB(),user=auth(request,db);if(!user)return fail('Sessão inválida',401);
 const body=await request.json() as CollectorWallet;const wallets=db.wallets[user.id]??[];
 if(wallets.length>=2)return fail('Você já cadastrou duas carteiras.',409);
 if(typeof body.label!=='string'||body.label.trim().length<2||body.label.length>60||typeof body.alias!=='string'||body.alias.length<2)return fail('Informe nome e apelido da carteira.',422);
 if(!['Ethereum','Polygon','Solana'].includes(body.network)||!validWalletAddress(body.address,body.network))return fail('Endereço incompatível com a rede escolhida.',422);
 if(!['MetaMask','Coinbase Wallet','WalletConnect'].includes(body.provider))return fail('Selecione um provedor válido.',422);
 if(wallets.some(x=>x.address.toLowerCase()===body.address.toLowerCase()))return fail('Esta carteira já está cadastrada.',409);
 const record:CollectorWallet={id:crypto.randomUUID(),label:body.label.trim(),alias:body.alias.trim(),network:body.network,address:body.address,provider:body.provider,primary:!wallets.length,ens:String(body.ens??'').trim()};
 db.wallets[user.id]=[...wallets,record];saveDB(db);return HttpResponse.json(record,{status:201});
}),
http.put('/api/wallets/:id',async({request,params})=>{
 const db=readDB(),user=auth(request,db);if(!user)return fail('Sessão inválida',401);
 const wallets=db.wallets[user.id]??[],target=wallets.find(x=>x.id===params.id);if(!target)return fail('Carteira não encontrada.',404);
 const next=await request.json() as CollectorWallet;
 if(typeof next.label!=='string'||next.label.trim().length<2||typeof next.alias!=='string'||next.alias.trim().length<2)return fail('Informe nome e apelido da carteira.',422);
 if(!['Ethereum','Polygon','Solana'].includes(next.network)||!validWalletAddress(next.address,next.network))return fail('Endereço inválido para a rede.',422);
 if(!['MetaMask','Coinbase Wallet','WalletConnect'].includes(next.provider))return fail('Tipo de carteira inválido.',422);
 if(wallets.some(x=>x.id!==target.id&&x.address.toLowerCase()===next.address.toLowerCase()))return fail('Endereço já cadastrado.',409);
 Object.assign(target,{label:next.label.trim(),alias:next.alias.trim(),network:next.network,address:next.address,provider:next.provider,ens:String(next.ens??''),primary:!!next.primary});
 if(target.primary)for(const wallet of wallets)if(wallet.id!==target.id)wallet.primary=false;
 if(!wallets.some(x=>x.primary))wallets[0].primary=true;
 saveDB(db);return HttpResponse.json(target);
}),

];
