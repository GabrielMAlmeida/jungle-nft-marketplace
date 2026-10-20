import {Input} from '../components/ui/input';
import {Textarea} from '../components/ui/textarea';
import {useEffect,useRef,useState} from 'react';
import type {FormEvent} from 'react';
import {Link,useNavigate,useParams} from '@tanstack/react-router';
import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {ArrowLeft,CheckCircle2,Clock3,RefreshCw,ShieldCheck,Wallet,XCircle} from 'lucide-react';
import Decimal from 'decimal.js';
import {api,errorMessage} from '../lib/api';
import type {CartLine,NFT,Order,Quote,User,CollectorWallet} from '../types';

const formatETH=(value:string)=>`${new Decimal(value).toString()} ETH`;
const homeSearch={q:'',category:'All',sort:'featured',page:1};
const quoteSignature=(quote:Quote)=>[quote.subtotalEth,quote.discountEth,quote.feeEth,quote.totalEth,quote.coupon??''].join('|');
type CartBridge={items:CartLine[];busy:boolean;loading?:boolean;user:User|null};
type Props={user:User|null;sessionLoading:boolean;cart:CartBridge};
type Mode='success'|'decline'|'timeout';
type CheckoutRequest={items:CartLine[];coupon:string|null;expectedQuote:Quote;paymentMethod:string;network:string;walletAddress:string;mode:Mode};
type Attempt={fingerprint:string;key:string};

export function CheckoutExperience({user,sessionLoading,cart}:Props){
  const navigate=useNavigate();
  const queryClient=useQueryClient();
  const lock=useRef(false);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [address,setAddress]=useState('0x1111111111111111111111111111111111111111');
  const [network,setNetwork]=useState('Ethereum');
  const [paymentMethod,setPaymentMethod]=useState('Coinbase Wallet');
  const [walletConnected,setWalletConnected]=useState(true);
  const [note,setNote]=useState('');
  const [accepted,setAccepted]=useState(false);
  const savedWallets=useQuery({queryKey:['collector-wallets',user?.id],queryFn:async():Promise<CollectorWallet[]>=>(await api.get('/wallets')).data,enabled:!!user,retry:false});
  const [selectedWalletId,setSelectedWalletId]=useState('');
  useEffect(()=>{if(!selectedWalletId&&savedWallets.data?.length){const initial=savedWallets.data.find(w=>w.primary)??savedWallets.data[0];setSelectedWalletId(initial.id);setAddress(initial.address);setNetwork(initial.network);setPaymentMethod(initial.provider);}},[savedWallets.data,selectedWalletId]);
  const [mode,setMode]=useState<Mode>('success');
  const [feedback,setFeedback]=useState('');
  const [busy,setBusy]=useState(false);
  const [coupon]=useState<string|null>(()=>sessionStorage.getItem('kurio-coupon')||null);
  useEffect(()=>{if(user){setName(current=>current||user.name);setEmail(current=>current||user.email)}},[user]);
  const queryKey=['checkout-quote',user?.id,cart.items,coupon];
  const quote=useQuery({queryKey,queryFn:async():Promise<Quote>=>(await api.post('/quote',{items:cart.items,coupon})).data,enabled:!!user&&cart.items.length>0,retry:false,staleTime:0});
  const lastDisplayedQuote=useRef<string|null>(null);
  useEffect(()=>{
    if(!quote.data)return;
    const now=quoteSignature(quote.data);
    if(lastDisplayedQuote.current&&lastDisplayedQuote.current!==now){
      setAccepted(false);
      setFeedback('A cotação foi atualizada. Revise os valores e confirme novamente.');
    }
    lastDisplayedQuote.current=now;
  },[quote.data]);
  const nftIds=cart.items.map(x=>x.nftId);
  const details=useQuery({queryKey:['checkout-nft-details',...nftIds],queryFn:async():Promise<NFT[]>=>Promise.all(nftIds.map(id=>api.get<NFT>(`/nfts/${id}`).then(r=>r.data))),enabled:!!user&&nftIds.length>0,retry:false});
  const createOrder=useMutation({mutationFn:async({body,key}:{body:CheckoutRequest;key:string}):Promise<Order>=>(await api.post('/orders',body,{headers:{'Idempotency-Key':key},timeout:10_000})).data,retry:0});
  const items=cart.items.map(line=>({line,nft:details.data?.find(x=>x.id===line.nftId)}));
  const totalUnits=cart.items.reduce((sum,line)=>sum+line.quantity,0);

  const submit=async(event:FormEvent)=>{
    event.preventDefault();
    if(lock.current||busy||createOrder.isPending)return;
    setFeedback('');
    if(!user){setFeedback('Entre para concluir a compra.');return}
    if(!name.trim()||!email.includes('@')){setFeedback('Preencha seu nome e um e-mail válido.');return}
    if(!(network==='Solana'?/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address):/^0x[a-fA-F0-9]{40}$/.test(address))){setFeedback('Informe um endereço de carteira compatível com a rede escolhida.');return}
    if(!walletConnected){setFeedback('Conecte a carteira simulada antes de confirmar.');return}
    if(!accepted){setFeedback('Confirme os dados e os valores da compra.');return}
    if(!quote.data||!cart.items.length){setFeedback('Aguarde a cotação atualizada.');return}
    lock.current=true;setBusy(true);
    const body:CheckoutRequest={items:cart.items,coupon,expectedQuote:quote.data,paymentMethod,network,walletAddress:address,mode};
    const fingerprint=JSON.stringify({userId:user.id,items:body.items,coupon,expectedQuote:body.expectedQuote,network,paymentMethod,address,mode});
    try{
      // A tentativa persiste após refresh. Repetir a mesma chave recupera o mesmo pedido.
      let attempt:Attempt|null=null;
      try{attempt=JSON.parse(sessionStorage.getItem('kurio-order-attempt')||'null') as Attempt|null}catch{attempt=null}
      const repeating=attempt?.fingerprint===fingerprint;
      if(!repeating){
        const fresh=(await api.post<Quote>('/quote',{items:cart.items,coupon})).data;
        if(quoteSignature(fresh)!==quoteSignature(quote.data)){
          queryClient.setQueryData(queryKey,fresh);
          setFeedback('Preço, taxa ou desconto mudou. Confira o novo total e pressione Confirmar compra novamente.');
          return;
        }
        attempt={fingerprint,key:crypto.randomUUID()};
        sessionStorage.setItem('kurio-order-attempt',JSON.stringify(attempt));
      }
      const result=await createOrder.mutateAsync({body,key:attempt!.key});
      sessionStorage.removeItem('kurio-order-attempt');
      sessionStorage.removeItem('kurio-coupon');
      await queryClient.invalidateQueries({queryKey:['cart',user.id]});
      await navigate({to:'/orders/$id',params:{id:result.id}});
    }catch(error){
      const msg=errorMessage(error);
      setFeedback(`${msg}. Se o pedido já tiver sido registrado, tente novamente: a mesma chave recuperará a compra, sem duplicá-la.`);
    }finally{lock.current=false;setBusy(false)}
  };

  if(sessionLoading||cart.loading)return <div className="kurio-checkout-page"><div className="shimmer h-80 rounded-xl" aria-label="Carregando checkout"/></div>;
  if(!user)return <div className="kurio-checkout-locked"><h1>Entre para finalizar sua coleção</h1><p>Seu carrinho será preservado durante o login.</p><Link to="/login" className="cart-solid-action" onClick={()=>sessionStorage.setItem('kurio-after-login','/checkout')}>Fazer login</Link></div>;
  if(!cart.items.length)return <div className="kurio-checkout-locked"><h1>Seu carrinho está vazio</h1><Link to="/" search={homeSearch} className="cart-solid-action">Explorar NFTs</Link></div>;
  return <div className="kurio-checkout-page">
    <div className="checkout-desktop-crumb"><Link to="/" search={homeSearch}>Início</Link> / Mercado / Pagamento</div>
    <div className="checkout-mobile-heading"><Link to="/cart" aria-label="Voltar ao carrinho"><ArrowLeft size={20}/></Link><h1>Pagamento com carteira</h1></div>
    <form onSubmit={submit} className="checkout-grid">
      <section className="checkout-collector" aria-labelledby="collector-title">
        <h2 id="collector-title">Perfil do colecionador</h2>
        <div className="checkout-form-grid">
          {!!savedWallets.data?.length&&<label className="checkout-wide">Carteira cadastrada<select value={selectedWalletId} onChange={e=>{const selected=savedWallets.data?.find(w=>w.id===e.target.value);setSelectedWalletId(e.target.value);if(selected){setAddress(selected.address);setNetwork(selected.network);setPaymentMethod(selected.provider)}}}><option value="">Endereço manual</option>{savedWallets.data.map(w=><option key={w.id} value={w.id}>{w.label} — {w.network}</option>)}</select></label>}
          <label>Nome de exibição <span>*</span><Input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)} /></label>
          <label>E-mail <span>*</span><Input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
          <label>Rede <span>*</span><select value={network} onChange={e=>setNetwork(e.target.value)}><option>Ethereum</option><option>Polygon</option><option>Solana</option></select></label>
          <label>Tipo de carteira <span>*</span><select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}><option>Coinbase Wallet</option><option>MetaMask</option><option>WalletConnect</option></select></label>
          <label className="checkout-wide">Endereço da carteira <span>*</span><Input required spellCheck={false} value={address} onChange={e=>setAddress(e.target.value)} aria-describedby="wallet-example"/><small id="wallet-example">Endereço fictício de demonstração. Não use uma carteira real.</small></label>
          <label className="checkout-wide">Observações (opcional)<Textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} placeholder="Observações do colecionador"/></label>
        </div>
        <div className="checkout-safe-note"><ShieldCheck size={17}/> Pagamento simulado. Nenhum ativo ou valor será transferido.</div>
      </section>
      <aside className="checkout-review" aria-label="Resumo do pagamento">
        <h2 className="checkout-desktop-only">Seus NFTs</h2>
        <div className="checkout-desktop-only checkout-line-head"><span>NFTs</span><span>Subtotal</span></div>
        <div className="checkout-review-items">{items.map(({line,nft})=><article className="checkout-review-item" key={line.nftId}>{nft&&<img src={nft.image} alt=""/>}<div><strong>{nft?.name??line.nftId}</strong><small>Edição: {nft?.edition??'—'} · {line.quantity} un.</small></div><b>{nft?formatETH(new Decimal(nft.priceEth).mul(line.quantity).toString()):'...'}</b></article>)}</div>
        <div className="checkout-totals">
          <div><span>Subtotal</span><span>{quote.data?formatETH(quote.data.subtotalEth):'Calculando...'}</span></div>
          <div><span>Desconto {coupon&&`(${coupon})`}</span><span>− {quote.data?formatETH(quote.data.discountEth):'—'}</span></div>
          <div><span>Taxa de rede</span><span>{quote.data?formatETH(quote.data.feeEth):'—'}</span></div>
          <div className="checkout-grand-total"><strong>Total</strong><strong>{quote.data?formatETH(quote.data.totalEth):'...'}</strong></div>
          {quote.isFetching&&<p role="status">Atualizando cotação pela API...</p>}
          {quote.isError&&<p role="alert" className="checkout-error">{errorMessage(quote.error)} <button type="button" onClick={()=>quote.refetch()}>Recalcular</button></p>}
        </div>
        <h2>Carteira e rede</h2>
        <div className="checkout-wallet-status"><div><Wallet size={19}/><strong>{paymentMethod}</strong><small>{network}</small></div><button type="button" onClick={()=>setWalletConnected(x=>!x)}>{walletConnected?'Desconectar':'Conectar carteira'}</button></div>
        <div className="checkout-wallet-options" role="group" aria-label="Escolha o provedor da carteira">
          {(['WalletConnect','MetaMask','Coinbase Wallet'] as const).map(method=><label key={method} className={paymentMethod===method?'selected':''}><input type="radio" name="provider" value={method} checked={paymentMethod===method} onChange={()=>setPaymentMethod(method)}/>{method}</label>)}
        </div>
        <label className="checkout-confirmation"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/> Conferi os NFTs, as quantidades, a carteira e os valores da cotação.</label>
        {feedback&&<div role="alert" className="checkout-error">{feedback}</div>}
        <button type="submit" className="checkout-submit" disabled={busy||cart.busy||!quote.data||quote.isFetching||!walletConnected||!accepted}>{busy?'Processando pedido...':'Confirmar compra'}</button>
        <p className="checkout-fineprint">{totalUnits} NFT(s) · Pedido protegido contra duplicação · Operação simulada</p>
        <details className="checkout-scenarios"><summary>Cenários de teste (MSW)</summary><label>Resultado simulado <select value={mode} onChange={e=>setMode(e.target.value as Mode)}><option value="success">Aprovado</option><option value="decline">Recusado</option><option value="timeout">Timeout após criação</option></select></label><small>O modo timeout aguarda 11 segundos. Uma segunda tentativa recupera o mesmo pedido.</small></details>
        <Link to="/cart" className="checkout-back">Voltar ao carrinho</Link>
      </aside>
    </form>
  </div>;
}

export function OrderReceipt(){
  const {id}=useParams({from:'/orders/$id'});
  const queryClient=useQueryClient();
  const order=useQuery({queryKey:['order',id],queryFn:async():Promise<Order>=>(await api.get(`/orders/${id}`)).data,retry:false,refetchInterval:query=>query.state.data?.status==='pending'?1500:false});
  useEffect(()=>{if(order.data?.status==='confirmed')queryClient.invalidateQueries({queryKey:['cart']})},[order.data?.status,queryClient]);
  if(order.isPending)return <div className="kurio-receipt-page"><div className="shimmer h-80 rounded-xl" aria-label="Carregando pedido"/></div>;
  if(order.isError)return <div className="kurio-receipt-page"><div className="receipt-panel"><h1>Pedido indisponível</h1><p>Verifique sua sessão e tente novamente.</p><button className="checkout-submit" onClick={()=>order.refetch()}>Tentar novamente</button><Link to="/login">Entrar na conta</Link></div></div>;
  const current=order.data;
  const confirmed=current.status==='confirmed',rejected=current.status==='rejected';
  return <div className="kurio-receipt-page"><article className="receipt-panel" aria-live="polite">
    <div className="receipt-heading">{confirmed?<CheckCircle2 size={39}/>:rejected?<XCircle size={39}/>:<Clock3 size={39}/>}
      <div><h1>{confirmed?'Compra confirmada!':rejected?'Pagamento recusado':'Pedido em processamento'}</h1><p>{confirmed?'Sua compra foi confirmada pela API simulada.':rejected?'A compra não foi concluída. Os itens permanecem no carrinho.':'Aguardando resultado do pagamento simulado. Você pode atualizar a página.'}</p></div>
    </div>
    <div className="receipt-meta"><div><span>Número do pedido</span><strong>{current.id}</strong></div><div><span>Status</span><strong>{current.status}</strong></div><div><span>Data</span><strong>{new Date(current.createdAt).toLocaleString('pt-BR')}</strong></div></div>
    <h2>Detalhes da transação</h2><div className="receipt-items">{current.items.map(item=><div className="receipt-item" key={item.nftId}>{item.image&&<img src={item.image} alt=""/>}<div><strong>{item.name}</strong><small>{item.quantity} × {formatETH(item.unitPriceEth)}</small></div><strong>{formatETH(new Decimal(item.unitPriceEth).mul(item.quantity).toString())}</strong></div>)}</div>
    <div className="receipt-totals"><div><span>Subtotal</span><span>{formatETH(current.quote.subtotalEth)}</span></div><div><span>Desconto</span><span>− {formatETH(current.quote.discountEth)}</span></div><div><span>Taxa de rede</span><span>{formatETH(current.quote.feeEth)}</span></div><div><strong>Total</strong><strong>{formatETH(current.quote.totalEth)}</strong></div></div>
    {current.transactionId&&<p className="receipt-tx">Identificador da transação simulada: <code>{current.transactionId}</code></p>}
    {current.status==='pending'&&<button className="checkout-retry" type="button" onClick={()=>order.refetch()}><RefreshCw size={16}/> Atualizar status</button>}
    {confirmed?<Link to="/" search={homeSearch} className="checkout-submit">Voltar ao catálogo</Link>:rejected?<Link to="/cart" className="checkout-submit">Revisar carrinho</Link>:<Link to="/account" className="checkout-back">Minha conta</Link>}
    <p className="receipt-disclaimer">Comprovante de demonstração. Não representa uma transação blockchain real.</p>
  </article></div>;
}
