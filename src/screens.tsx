import {useRealtimeSync} from './realtime/useRealtimeSync';
import{useEffect,useRef,useState}from'react';import{Link,useNavigate,useParams,useSearch,useRouterState}from'@tanstack/react-router';import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';import{Search,ShoppingBag,Heart,UserRound,ArrowRight,X,ChevronLeft,ChevronRight,ShieldCheck,Trash2,ArrowLeft,SlidersHorizontal,Home as HomeIcon,ArrowUpRight}from'lucide-react';import{api,errorMessage}from'./lib/api';import type{NFT,NftList,CartLine,Quote,User}from'./types';import Decimal from'decimal.js';import{CheckoutExperience,OrderReceipt}from'./checkout/CheckoutExperience';
import{AuthExperience}from'./account/AuthExperience';
import{ProfileExperience,WalletsExperience}from'./account/AccountExperience';
const eth=(v:string)=>`${new Decimal(v).toString()} ETH`;
const fetchNfts=async(p:{q:string;category:string;sort:string;page:number}):Promise<NftList>=> (await api.get('/nfts',{params:p})).data;
const getNft=async(id:string):Promise<NFT>=>(await api.get(`/nfts/${id}`)).data;
function useSession(){const qc=useQueryClient();const query=useQuery({queryKey:['session'],queryFn:async():Promise<User>=>(await api.get('/auth/me')).data,retry:false,enabled:!!sessionStorage.getItem('jungle-token')});return{user:query.data??null,loading:query.isPending&&query.fetchStatus==='fetching',logout:async()=>{try{await api.post('/auth/logout')}finally{sessionStorage.removeItem('jungle-token');qc.clear();location.assign('/')}}}}
function useLocalCart(){const[items,setItems]=useState<CartLine[]>(()=>{try{return JSON.parse(localStorage.getItem('jungle-guest-cart')||'[]')}catch{return []}});const update=(next:CartLine[])=>{localStorage.setItem('jungle-guest-cart',JSON.stringify(next));setItems(next)};return{items,update}}
function useCart(){const guest=useLocalCart();const session=useSession();const qc=useQueryClient();const remote=useQuery({queryKey:['cart',session.user?.id],queryFn:async()=> (await api.get<{items:CartLine[]}>('/cart')).data.items,enabled:!!session.user});const items=session.user?remote.data??[]:guest.items;const mutation=useMutation({mutationFn:async(next:CartLine[])=>{if(session.user){await api.put('/cart',{items:next})}else guest.update(next)},onSuccess:()=>qc.invalidateQueries({queryKey:['cart']})});return{items,update:(next:CartLine[])=>mutation.mutateAsync(next),busy:mutation.isPending,loading:!!session.user&&remote.isPending,error:mutation.error?errorMessage(mutation.error):null,user:session.user}}
function useCartCount(){const c=useCart();return c.items.reduce((sum,x)=>sum+x.quantity,0)}
export function AppShell({children}:{children:React.ReactNode}){
  const session=useSession(); const count=useCartCount();
  const realtime=useRealtimeSync(session.user?.id??null);
  const pathname=useRouterState({select:s=>s.location.pathname});
  const [menuOpen,setMenuOpen]=useState(false);
  return <div className="app-frame min-h-screen">
    <header className="site-header">
      <div className="site-header-inner">
        <Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} className="brand-mark" aria-label="Kurio, página inicial">KURIO</Link>
        <nav className="desktop-links" aria-label="Navegação principal">
          <Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} className={pathname==='/'?'is-active':''}>Início</Link>
          <Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} hash="explorar">Mercado</Link>
          <a href="/#sobre">Criadores</a>
          <a href="/#diario">Aprenda</a>
        </nav>
        <div className="desktop-actions">
          <Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} hash="explorar" aria-label="Buscar no catálogo"><Search size={18}/></Link>
          <Link to="/cart" aria-label={`Carrinho com ${count} itens`} className="nav-bag"><ShoppingBag size={18}/>{count>0&&<span className="bag-count">{count}</span>}</Link>
          <Link to={session.user?'/account':'/login'} className="btn-primary nav-login">{session.user?'Minha conta':'Entrar'} <ArrowUpRight size={14}/></Link>
        </div>
      </div>
    </header>
    {pathname==='/cart'&&import.meta.env.VITE_ENABLE_MOCKS!=='false'&&<div className="realtime-connection-diagnostic" role="status" aria-live="polite">Socket.IO: {realtime.connected?'conectado':'desconectado'}{realtime.connectionError?` — ${realtime.connectionError}`:''}</div>}
    {realtime.notice&&<div className="realtime-notice" role="status" aria-live="polite">{realtime.notice}</div>}
    <main id="conteudo">{children}</main>
    <footer className="site-footer" id="sobre">
      <div className="footer-inner">
        <div className="footer-main">
          <div><div className="footer-monogram">K</div><h3>Segurança de sua arte.</h3><p>Explore NFTs e construa sua coleção em uma experiência demonstrativa, sem transações reais.</p></div>
          <div><div className="footer-monogram">C</div><h3>Criadores em destaque.</h3><p>Descubra obras e artistas digitais que transformam ideias em coleções únicas.</p></div>
          <div><div className="footer-monogram">D</div><h3>Alertas de lançamentos.</h3><p>Novas obras e oportunidades para explorar no marketplace.</p></div>
          <div className="newsletter"><h3>Antecipe-se ao próximo lançamento</h3><p>Receba novidades sobre o desenvolvimento deste desafio.</p><form onSubmit={e=>{e.preventDefault();setMenuOpen(true)}}><label className="sr-only" htmlFor="newsletter-mail">Seu e-mail</label><input id="newsletter-mail" type="email" required placeholder="Seu e-mail"/><button type="submit">Enviar</button></form>{menuOpen&&<p role="status">Newsletter apenas demonstrativa. Nenhum e-mail foi enviado.</p>}</div>
        </div>
        <div className="footer-divider">KURIO</div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Kurio • Projeto demonstrativo para Jungle Gaming</span><span>Desafio Frontend — Marketplace de NFTs</span></div>
      </div>
    </footer>
    <nav className="mobile-bottom-nav" aria-label="Navegação mobile">
      <Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} aria-label="Início" className={pathname==='/'?'active':''}><HomeIcon size={23}/><span>Início</span></Link>
      <Link to="/favorites" aria-label="Favoritos" className={pathname==='/favorites'?'active':''}><Heart size={23}/><span>Favoritos</span></Link>
      <Link to="/cart" aria-label="Carrinho" className={pathname==='/cart'?'active':''}><ShoppingBag size={23}/><span>Carrinho</span>{count>0&&<i className="mobile-count">{count}</i>}</Link>
      <Link to={session.user?'/account':'/login'} aria-label="Perfil" className={pathname==='/account'||pathname==='/login'?'active':''}><UserRound size={23}/><span>Perfil</span></Link>
    </nav>
  </div>
}
function NFTCard({nft}:{nft:NFT}){
  const session=useSession(); const nav=useNavigate(); const qc=useQueryClient();
  const favorites=useQuery({queryKey:['favorites',session.user?.id],queryFn:async():Promise<string[]> =>(await api.get('/favorites')).data,enabled:!!session.user});
  const liked=!!favorites.data?.includes(nft.id);
  const updateFavorite=useMutation({
    mutationFn:async()=>{
      if(!session.user)throw Error('Entre na sua conta para favoritar NFTs');
      const previous=favorites.data??[];
      const ids=liked?previous.filter(id=>id!==nft.id):[...previous,nft.id];
      await api.put('/favorites',{ids});return ids;
    },
    onMutate:async()=>{
      if(!session.user)return;
      await qc.cancelQueries({queryKey:['favorites',session.user.id]});
      const previous=qc.getQueryData<string[]>(['favorites',session.user.id]);
      qc.setQueryData<string[]>(['favorites',session.user.id],old=>old?.includes(nft.id)?old.filter(x=>x!==nft.id):[...(old??[]),nft.id]);
      return {previous};
    },
    onError:(_error,_vars,context)=>{if(session.user)qc.setQueryData(['favorites',session.user.id],context?.previous)},
    onSettled:()=>qc.invalidateQueries({queryKey:['favorites',session.user?.id]})
  });
  const toggleFavorite=(e:React.MouseEvent<HTMLButtonElement>)=>{e.preventDefault();e.stopPropagation();if(!session.user){nav({to:'/login'});return}updateFavorite.mutate()};
  return <article className="nft-card">
    <div className="nft-picture-wrap">
      <Link className="nft-picture-link" to="/nft/$id" params={{id:nft.id}} aria-label={`Ver ${nft.name}`}><img className="nft-picture" loading="lazy" src={nft.image} alt={`Imagem do NFT ${nft.name}`}/></Link>
      <button type="button" className={`nft-like ${liked?'is-liked':''}`} aria-label={liked?`Remover ${nft.name} dos favoritos`:`Adicionar ${nft.name} aos favoritos`} aria-pressed={liked} onClick={toggleFavorite} disabled={updateFavorite.isPending}><Heart size={19} fill={liked?'currentColor':'none'}/></button>
      {nft.stock<=4&&<span className="nft-badge">RARO</span>}
    </div>
    <div className="nft-card-info">
      <Link to="/nft/$id" params={{id:nft.id}} className="nft-title">{nft.name}</Link>
      <div className="nft-eth">{eth(nft.priceEth)}</div>
      <div className="nft-meta">{nft.creator} <span>·</span> {nft.stock} disponíveis</div>
      {updateFavorite.isError&&<p className="text-xs mt-2" role="alert">Não foi possível atualizar. Tente novamente.</p>}
    </div>
  </article>
}
function Skeletons(){return <div className="nft-grid" aria-label="Carregando NFTs">{Array.from({length:8},(_,i)=><div key={i} className="nft-card"><div className="shimmer aspect-square rounded-2xl"/><div className="space-y-2 pt-3"><div className="shimmer h-4 w-2/3 rounded"/><div className="shimmer h-4 w-1/3 rounded"/></div></div>)}</div>}
export function Home(){
  const navigate=useNavigate({from:'/'}); const params=useSearch({from:'/'});
  const [text,setText]=useState(params.q); const [filtersOpen,setFiltersOpen]=useState(false);
  useEffect(()=>setText(params.q),[params.q]);
  const {data,isPending,isError,refetch}=useQuery({queryKey:['nfts',params],queryFn:()=>fetchNfts(params),placeholderData:previous=>previous});
  const change=(patch:Partial<typeof params>)=>navigate({search:prev=>({...prev,...patch,page:patch.page??1}),hash:undefined});
  const items=data?.items??[];
  const categories=[{name:'Todas as coleções',value:'All'},{name:'Arte digital',value:'Art'},{name:'Fotografia',value:'Photography'},{name:'Música',value:'Music'},{name:'Arte de jogos',value:'Gaming'}];
  const tabs=[{label:'Todos os NFTs',value:'featured'},{label:'Novos lançamentos',value:'newest'},{label:'Em alta',value:'price-desc'}];
  const reset=()=>{setText('');change({q:'',category:'All',sort:'featured',page:1})};
  return <div className="kurio-home">
    <div className="mobile-top-search">
      <form onSubmit={e=>{e.preventDefault();change({q:text})}} className="mobile-search-form"><Search size={22}/><label className="sr-only" htmlFor="mobile-nft-search">Explorar coleções</label><input id="mobile-nft-search" placeholder="Explorar coleções" value={text} onChange={e=>setText(e.target.value)}/></form>
      <button className="mobile-filter-trigger" type="button" aria-label={filtersOpen?'Fechar filtros':'Abrir filtros'} aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)}><SlidersHorizontal size={22}/></button>
    </div>
    {filtersOpen&&<div className="mobile-filter-panel"><div className="flex items-center justify-between"><strong>Filtrar NFTs</strong><button aria-label="Fechar filtros" onClick={()=>setFiltersOpen(false)}><X size={19}/></button></div><label>Categoria<select className="field mt-2" value={params.category} onChange={e=>change({category:e.target.value})}>{categories.map(c=><option key={c.value} value={c.value}>{c.name}</option>)}</select></label><label>Ordenar por<select className="field mt-2" value={params.sort} onChange={e=>change({sort:e.target.value})}><option value="featured">Destaques</option><option value="newest">Novidades</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome A–Z</option></select></label><button className="btn-primary" onClick={()=>setFiltersOpen(false)}>Ver resultados</button></div>}
    <section className="kurio-hero" aria-label="Destaque principal"><div className="hero-panel">
      <div className="hero-copy"><span className="hero-overline">Bem-vindo à Kurio</span><h1><span className="hero-title-desktop">SEJA DONO DO FUTURO<br/>DA ARTE DIGITAL</span><span className="hero-title-mobile">SEJA DONO DA<br/>CULTURA DIGITAL</span></h1><p>Descubra NFTs selecionados de criadores do mundo todo.</p><a href="#explorar" className="hero-cta">EXPLORAR <ArrowRight size={17}/></a></div>
      <div className="hero-art" aria-label="Imagem ilustrativa da coleção"><div className="hero-art-caption">COLEÇÃO EM DESTAQUE</div>{items[0]&&<img className="hero-primary-image" src={items[0].image} alt={`NFT em destaque: ${items[0].name}`}/>}<img className="hero-mobile-overlay" src="/images/nft-sage-nomad.png" alt="" aria-hidden="true"/><span className="hero-art-counter">01 / 03</span></div>
    </div><div className="hero-dots" aria-hidden="true"><span className="selected"/><span/><span/></div></section>
    <section id="explorar" className="marketplace-section">
      <aside className="marketplace-sidebar"><div className="sidebar-block"><h2>Coleções</h2>{categories.map(c=><button key={c.value} type="button" className={params.category===c.value?'selected':''} onClick={()=>change({category:c.value})}>{c.name}<span>{c.value==='All'?'12':c.value==='Art'?'3':c.value==='Photography'?'4':c.value==='Music'?'2':'3'}</span></button>)}</div><div className="sidebar-block"><h3>Faixa de preço</h3><p>Ordenar por valor dos NFTs</p><button type="button" className="sidebar-action" onClick={()=>change({sort:'price-asc'})}>Menor preço <ArrowRight size={13}/></button></div><div className="sidebar-block"><h3>Rede</h3><p>Ethereum (demonstração)</p></div><div className="sidebar-block"><h3>NFT EM DESTAQUE</h3>{items[0]&&<Link to="/nft/$id" params={{id:items[0].id}} className="sidebar-featured"><img src={items[0].image} alt={items[0].name}/><span>OFERTA LIMITADA</span></Link>}</div></aside>
      <div className="marketplace-content"><div className="marketplace-toolbar"><div className="marketplace-tabs" role="group" aria-label="Filtrar catálogo">{tabs.map(tab=><button type="button" key={tab.value} className={params.sort===tab.value?'selected':''} onClick={()=>change({sort:tab.value})}>{tab.label}</button>)}</div><label className="marketplace-sort"><span>Ordenar por</span><select aria-label="Ordenar por" value={params.sort} onChange={e=>change({sort:e.target.value})}><option value="featured">Destaques</option><option value="newest">Mais recentes</option><option value="price-asc">Menor preço</option><option value="price-desc">Maior preço</option><option value="name">Nome</option></select></label></div>
      <div className="desktop-search-row"><form onSubmit={e=>{e.preventDefault();change({q:text})}}><Search size={16}/><label className="sr-only" htmlFor="desktop-nft-search">Buscar NFTs</label><input id="desktop-nft-search" placeholder="Buscar NFTs, artistas ou coleções..." value={text} onChange={e=>setText(e.target.value)}/><button type="submit">Buscar</button></form><span>{data?.total??'...'} NFTs encontrados</span></div>
      {isPending?<Skeletons/>:isError?<div className="panel p-10 text-center"><h3>Não foi possível carregar o catálogo.</h3><button className="btn-primary mt-4" onClick={()=>refetch()}>Tentar novamente</button></div>:items.length?<div className="nft-grid">{items.map(n=><NFTCard key={n.id} nft={n}/>)}</div>:<div className="panel p-10 text-center"><Search size={29} className="mx-auto"/><h3 className="mt-4 text-xl font-semibold">Nenhum NFT encontrado</h3><p className="muted mt-2">Tente alterar a busca ou os filtros.</p><button className="btn-outline mt-5" onClick={reset}>Limpar filtros</button></div>}
      <div className="catalog-pagination"><button type="button" aria-label="Página anterior" disabled={params.page<=1} onClick={()=>change({page:params.page-1})}><ChevronLeft size={18}/></button>{Array.from({length:Math.min(data?.pages??1,5)},(_,i)=><button type="button" key={i} aria-current={params.page===i+1?'page':undefined} className={params.page===i+1?'selected':''} onClick={()=>change({page:i+1})}>{i+1}</button>)}<button type="button" aria-label="Próxima página" disabled={params.page>=(data?.pages??1)} onClick={()=>change({page:params.page+1})}><ChevronRight size={18}/></button></div>
      </div>
    </section>
    <section className="promo-strips" aria-label="Mais sobre o marketplace"><div className="promo-strip"><div className="promo-image">{items[0]&&<img src={items[0].image} alt="Arte digital de destaque"/>}</div><div><h2>Lançamentos especiais<br/>da coleção limitada</h2><p>Explore novas obras digitais e descubra o que há de novo no marketplace.</p><a href="#explorar">Explorar <ArrowUpRight size={14}/></a></div></div><div className="promo-strip"><div className="promo-image">{items[1]&&<img src={items[1].image} alt="Obra digital selecionada"/>}</div><div><h2>Arte digital selecionada<br/>a muito mais</h2><p>Coleções que conectam criatividade, arte e tecnologia.</p><a href="#explorar">Explorar <ArrowUpRight size={14}/></a></div></div></section>
    <section className="kurio-journal" id="diario"><div className="journal-intro"><h2>Diário da Cunhagem</h2><p>Histórias, arte digital e novidades sobre o universo dos colecionáveis.</p></div><div className="journal-grid">{(items.length?items:[]).slice(0,4).map((n,i)=><article className="journal-post" key={n.id}><Link to="/nft/$id" params={{id:n.id}}><img src={n.image} alt={`Arte de ${n.name}`}/><div className="journal-post-copy"><span>Arte & coleção · Leitura {i+2} min</span><h3>{['Como funciona a propriedade dos NFTs','Arte digital: novos caminhos','Por onde começar sua coleção','Uma coleção para descobrir'][i]}</h3><p>Conheça histórias, artistas e peças selecionadas do universo NFT.</p></div></Link></article>)}</div></section>
  </div>
}
export function Details(){
  const {id}=useParams({from:'/nft/$id'});
  const navigate=useNavigate();
  const session=useSession();
  const cart=useCart();
  const qc=useQueryClient();
  const nft=useQuery({queryKey:['nft',id],queryFn:()=>getNft(id),retry:false});
  const related=useQuery({queryKey:['related-nfts'],queryFn:()=>api.get<NftList>('/nfts',{params:{page:1}}).then(r=>r.data)});
  const favorites=useQuery({queryKey:['favorites',session.user?.id],queryFn:async():Promise<string[]> =>(await api.get('/favorites')).data,enabled:!!session.user});
  const [quantity,setQuantity]=useState(1);
  const [preview,setPreview]=useState(0);
  const [enlarged,setEnlarged]=useState(false);
  const zoomDialogRef=useRef<HTMLDialogElement|null>(null);
  const zoomButtonRef=useRef<HTMLButtonElement|null>(null);
  const [status,setStatus]=useState('');
  const [saving,setSaving]=useState(false);
  useEffect(()=>{setQuantity(1);setPreview(0);setEnlarged(false);setStatus('')},[id]);
  const liked=!!favorites.data?.includes(id);
  const favoriteMutation=useMutation({
    mutationFn:async()=>{
      if(!session.user)throw Error('Faça login para salvar seus favoritos.');
      const old=favorites.data??[];
      const ids=old.includes(id)?old.filter(x=>x!==id):[...old,id];
      await api.put('/favorites',{ids});return ids;
    },
    onMutate:async()=>{
      if(!session.user)return;
      const key=['favorites',session.user.id];
      await qc.cancelQueries({queryKey:key});
      const previous=qc.getQueryData<string[]>(key);
      qc.setQueryData<string[]>(key,old=>old?.includes(id)?old.filter(x=>x!==id):[...(old??[]),id]);
      return {previous};
    },
    onError:(e,_vars,context)=>{
      if(session.user)qc.setQueryData(['favorites',session.user.id],context?.previous);
      setStatus(errorMessage(e));
    },
    onSettled:()=>qc.invalidateQueries({queryKey:['favorites',session.user?.id]})
  });
  const toggleFavorite=()=>{
    if(!session.user){navigate({to:'/login'});return;}
    setStatus('');favoriteMutation.mutate();
  };
  const addToCart=async(goToCart:boolean)=>{
    if(!nft.data||saving||nft.data.stock===0)return;
    setStatus('');setSaving(true);
    try{
      const current=cart.items.find(line=>line.nftId===id)?.quantity??0;
      if(current+quantity>nft.data.stock){
        setStatus(`Limite disponível: ${nft.data.stock} unidade(s). Você já tem ${current} no carrinho.`);
        return;
      }
      await cart.update([...cart.items.filter(line=>line.nftId!==id),{nftId:id,quantity:current+quantity}]);
      if(goToCart){await navigate({to:'/cart'});}else setStatus('NFT adicionado ao carrinho.');
    }catch(e){setStatus(errorMessage(e));}finally{setSaving(false);}
  };
  const openZoom=()=>{zoomDialogRef.current?.showModal();setEnlarged(true)};
  const closeZoom=()=>zoomDialogRef.current?.close();
  const tokenId=id.replace(/^nft-/,'').padStart(4,'0');
  const back=<Link className="detail-back" to="/" search={{q:'',category:'All',sort:'featured',page:1}}><ArrowLeft size={18}/> <span>Voltar ao mercado</span></Link>;
  if(nft.isPending)return <div className="kurio-details detail-loading" aria-label="Carregando detalhes do NFT"><div className="shimmer detail-skeleton-art"/><div className="shimmer detail-skeleton-copy"/></div>;
  if(nft.isError||!nft.data)return <div className="kurio-details detail-notfound">{back}<h1>NFT não encontrado</h1><p>Não encontramos esta obra na coleção.</p><Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} className="btn-primary">Explorar NFTs</Link></div>;
  const item=nft.data;
  const remaining=Math.max(0,item.stock-(cart.items.find(line=>line.nftId===id)?.quantity??0));
  const suggestions=related.data?.items.filter(n=>n.id!==id).slice(0,5)??[];
  return <div className="kurio-details nft-details-page">
    <div className="detail-desktop-crumb">{back} <span>/ {item.name}</span></div>
    <div className="detail-core">
      <div className="detail-art-column">
        <div className="detail-mobile-actions">{back}<button type="button" aria-label={liked?'Remover dos favoritos':'Adicionar aos favoritos'} aria-pressed={liked} onClick={toggleFavorite}><Heart size={22} fill={liked?'currentColor':'none'}/></button></div>
        <div className="detail-art-layout">
          <div className="detail-thumbnails" aria-label="Prévia da arte digital">
            {[0,1,2,3].map(i=><button key={i} type="button" aria-label={`Visualização ${i+1}`} aria-pressed={preview===i} className={preview===i?'selected':''} onClick={()=>setPreview(i)}><img src={item.image} alt="" style={{objectPosition:['center','40% 50%','60% 50%','center 35%'][i]}}/></button>)}
          </div>
          <div className="detail-main-art"><img src={item.image} style={{objectPosition:['center','40% 50%','60% 50%','center 35%'][preview]}} alt={`Arte do NFT ${item.name}`}/><button ref={zoomButtonRef} type="button" className="detail-zoom" aria-label="Ampliar imagem" aria-haspopup="dialog" aria-expanded={enlarged} onClick={openZoom}><Search size={18}/></button></div>
          <dialog ref={zoomDialogRef} className="kurio-zoom-dialog" aria-label={`Visualização ampliada: ${item.name}`} onClose={()=>{setEnlarged(false);zoomButtonRef.current?.focus()}}>
            <button type="button" className="kurio-zoom-close" aria-label="Fechar visualização ampliada" onClick={closeZoom}><X size={20}/></button>
            <img src={item.image} alt={`Arte ampliada do NFT ${item.name}`}/>
            <p>{item.name} — visualização ampliada</p>
          </dialog>
        </div>
      </div>
      <section className="detail-info" aria-labelledby="detail-name">
        <div className="detail-heading"><h1 id="detail-name">{item.name}</h1><span className="detail-rating" aria-label="Avaliação ilustrativa do design: 4,8 de 5">★ 4.8 (19)</span></div>
        <div className="detail-desktop-price">{eth(item.priceEth)}</div>
        <div className="detail-desc-label">Sobre este NFT:</div>
        <p className="detail-desc">{item.description}</p>
        <div className="detail-editions"><h2>Edição:</h2><div className="detail-edition-pills" aria-label="Informações da edição"><span>{item.edition||'Edição padrão'}</span><span>{item.stock} disponíveis</span></div></div>
        <div className="detail-meta"><p>ID do token: #{tokenId}</p><p>Coleção: {item.collection}</p><p>Atributos: Colecionável digital, edição limitada</p></div>
        <div className="detail-buy-controls"><div className="detail-quantity"><span className="detail-qty-label">Qtd.</span><button type="button" aria-label="Diminuir quantidade" disabled={quantity<=1} onClick={()=>setQuantity(q=>Math.max(1,q-1))}>−</button><output aria-live="polite">{quantity}</output><button type="button" aria-label="Aumentar quantidade" disabled={quantity>=remaining} onClick={()=>setQuantity(q=>Math.min(remaining,q+1))}>+</button></div><span className="detail-mobile-price">{eth(item.priceEth)}</span><button className="detail-buy-button" type="button" disabled={remaining<=0||saving} onClick={()=>addToCart(true)}>{saving?'Adicionando...':<><span className="detail-buy-desktop-text">COMPRAR</span><span className="detail-buy-mobile-text">Comprar NFT</span></>}</button><button className="detail-cart-button" type="button" aria-label="Adicionar ao carrinho" disabled={remaining<=0||saving} onClick={()=>addToCart(false)}><ShoppingBag size={21}/><span>Adicionar</span></button><button className="detail-desktop-favorite" type="button" aria-pressed={liked} onClick={toggleFavorite}><Heart size={18} fill={liked?'currentColor':'none'}/>{liked?'Favoritado':'Favoritar'}</button></div>
        {remaining===0&&<p className="detail-warning" role="status">Quantidade indisponível. Confira os itens já adicionados ao carrinho.</p>}
        {status&&<p className="detail-feedback" role="status">{status}</p>}
        {cart.error&&<p className="detail-feedback" role="alert">{cart.error}</p>}
        <p className="detail-disclaimer"><ShieldCheck size={16}/> Compra simulada. Nenhuma criptomoeda será transferida.</p>
      </section>
    </div>
    <section className="detail-description"><div className="detail-section-tabs"><h2>Detalhes do NFT</h2><span>Avaliações de colecionadores (19)</span></div><p>{item.description} Esta obra integra o catálogo da Kurio, em uma experiência de demonstração de compras e colecionáveis digitais.</p><p>O recibo, a carteira e as referências de transação são simulados. Os preços e a disponibilidade são validados pela API antes da compra.</p><h3>Rede:</h3><p>Ethereum • Simulação local</p><h3>Contrato:</h3><p>Identificador e transação gerados pela API de demonstração.</p></section>
    <section className="detail-related"><h2>Mais desta coleção</h2>{related.isPending?<div className="shimmer h-40 rounded-lg"/>:<div className="detail-related-grid">{suggestions.map(n=><Link to="/nft/$id" params={{id:n.id}} className="detail-related-card" key={n.id}><img loading="lazy" src={n.image} alt={`Imagem do NFT ${n.name}`}/><strong>{n.name}</strong><span>{eth(n.priceEth)}</span></Link>)}</div>}</section>
  </div>;
}

export function CartPage(){
  const cart=useCart();
  const [couponInput,setCouponInput]=useState(()=>sessionStorage.getItem('kurio-coupon')??'');
  const [appliedCoupon,setAppliedCoupon]=useState<string|null>(()=>sessionStorage.getItem('kurio-coupon')||null);
  const [feedback,setFeedback]=useState('');
  const [changingDemo,setChangingDemo]=useState(false);
  const itemIds=cart.items.map(line=>line.nftId).sort();
  const nfts=useQuery({
    queryKey:['cart-item-details',...itemIds],
    queryFn:()=>Promise.all(itemIds.map(id=>getNft(id))),
    enabled:itemIds.length>0,
    retry:false,
  });
  const suggestions=useQuery({
    queryKey:['cart-related-nfts'],
    queryFn:()=>api.get<NftList>('/nfts',{params:{page:1}}).then(res=>res.data),
    retry:1,
  });
  const quote=useQuery({
    queryKey:['cart-quote',cart.items,appliedCoupon],
    queryFn:()=>api.post<Quote>('/quote',{items:cart.items,coupon:appliedCoupon}).then(res=>res.data),
    enabled:cart.items.length>0,
    retry:false,
  });
  useEffect(()=>{if(appliedCoupon&&quote.isSuccess)sessionStorage.setItem('kurio-coupon',appliedCoupon);if(!appliedCoupon)sessionStorage.removeItem('kurio-coupon')},[appliedCoupon,quote.isSuccess]);
  const byId=(id:string)=>nfts.data?.find(item=>item.id===id);
  const updateQuantity=async(id:string,next:number)=>{
    if(cart.busy)return;
    const item=byId(id);
    if(item&&next>item.stock){setFeedback(`Disponibilidade máxima para ${item.name}: ${item.stock}.`);return;}
    setFeedback('');
    try{await cart.update(cart.items.map(line=>line.nftId===id?{...line,quantity:next}:line).filter(line=>line.quantity>0));}
    catch(e){setFeedback(errorMessage(e));}
  };
  const demoEvent=async(action:'price_up'|'stock_zero'|'restore'|'replay')=>{
    setChangingDemo(true);setFeedback('');
    try{
      await api.post('/demo/nft-event',{id:cart.items[0]?.nftId,action});
      setFeedback(action==='replay'?'Evento anterior reenviado: uma versão repetida não deve alterar os totais.':'Cenário atualizado na API. Verifique se o evento Socket.IO alterou os valores sem recarregar.');
    }catch(e){setFeedback(errorMessage(e));}finally{setChangingDemo(false)}
  };
  const removeItem=async(id:string)=>{
    if(cart.busy)return;
    setFeedback('');
    try{await cart.update(cart.items.filter(line=>line.nftId!==id));}
    catch(e){setFeedback(errorMessage(e));}
  };
  const applyCoupon=(event:React.FormEvent)=>{
    event.preventDefault();
    setFeedback('');
    setAppliedCoupon(couponInput.trim().toUpperCase()||null);
  };
  const displayed=cart.items.map(line=>({line,nft:byId(line.nftId)}));
  const related=suggestions.data?.items.filter(n=>!itemIds.includes(n.id)).slice(0,5)??[];
  const homeSearch={q:'',category:'All',sort:'featured',page:1};
  const unitTotal=(price:string,qty:number)=>new Decimal(price).mul(qty).toString();
  return <div className="kurio-cart-page">
    <div className="cart-mobile-title"><Link to="/" search={homeSearch} aria-label="Voltar ao catálogo"><ArrowLeft size={21}/></Link><h1>Carrinho de NFTs</h1></div>
    <div className="cart-desktop-crumb"><Link to="/" search={homeSearch}>Início</Link> / Mercado / Carrinho</div>
    {!cart.items.length?<section className="cart-empty" aria-live="polite"><ShoppingBag size={43}/><h2>Seu carrinho está vazio</h2><p>Explore nossa coleção e escolha seus NFTs favoritos.</p><Link className="cart-solid-action" to="/" search={homeSearch}>Explorar NFTs <ArrowRight size={15}/></Link></section>:
    <div className="cart-main-layout">
      <section aria-label="NFTs no carrinho" className="cart-items-section">
        <div className="cart-table-header" aria-hidden="true"><span>NFTs</span><span>Preço</span><span>Edições</span><span>Total</span><span/></div>
        {nfts.isPending?<div className="cart-items-loading" aria-label="Carregando os NFTs"><div className="shimmer"/><div className="shimmer"/><div className="shimmer"/></div>:
        <div className="cart-rows">{displayed.map(({line,nft})=><article className="cart-item-row" key={line.nftId}>
          <div className="cart-item-identification">
            {nft?<Link to="/nft/$id" params={{id:nft.id}} className="cart-item-cover"><img src={nft.image} alt={`Arte digital ${nft.name}`}/></Link>:<div className="cart-item-cover shimmer"/>}
            <div className="cart-item-meta"><strong>{nft?.name??line.nftId}</strong><span className="cart-desktop-token">ID do token: #{(nft?.name.match(/#(\d+)/)?.[1])??line.nftId.replace('nft-','').padStart(4,'0')}</span><span className="cart-mobile-edition">Edição: {nft?.edition??'—'}</span><span className="cart-mobile-price">{nft?eth(unitTotal(nft.priceEth,line.quantity)):'...'}</span></div>
          </div>
          <div className="cart-price-cell">{nft?eth(nft.priceEth):'—'}</div>
          <div className="cart-quantity-cell"><button type="button" aria-label={`Diminuir quantidade de ${nft?.name??'NFT'}`} disabled={cart.busy} onClick={()=>updateQuantity(line.nftId,line.quantity-1)}>−</button><output aria-label="Quantidade">{line.quantity}</output><button type="button" aria-label={`Aumentar quantidade de ${nft?.name??'NFT'}`} disabled={cart.busy||!!nft&&line.quantity>=nft.stock} onClick={()=>updateQuantity(line.nftId,line.quantity+1)}>+</button></div>
          <div className="cart-total-cell">{nft?eth(unitTotal(nft.priceEth,line.quantity)):'...'}</div>
          <button type="button" className="cart-remove-cell" aria-label={`Remover ${nft?.name??'NFT'} do carrinho`} onClick={()=>removeItem(line.nftId)} disabled={cart.busy}><Trash2 size={19}/></button>
        </article>)}</div>}
        {nfts.isError&&<p className="cart-alert" role="alert">Não foi possível carregar algumas informações dos NFTs. <button onClick={()=>nfts.refetch()}>Tentar novamente</button></p>}
      </section>
      <aside className="cart-order-summary" aria-label="Resumo da carteira">
        <h2>Resumo da carteira</h2>
        <form className="cart-coupon-form" onSubmit={applyCoupon}><label htmlFor="cart-coupon">Código promocional</label><div><input id="cart-coupon" autoComplete="off" placeholder="Digite o código promocional..." value={couponInput} onChange={e=>setCouponInput(e.target.value)}/><button type="submit" disabled={quote.isFetching}>Aplicar</button></div></form>
        {appliedCoupon&&quote.isSuccess&&<div className="cart-coupon-applied" role="status">Cupom {appliedCoupon} aplicado. <button onClick={()=>{setAppliedCoupon(null);setCouponInput('')}}>Remover</button></div>}
        {(quote.isError||cart.error||feedback)&&<p role="alert" className="cart-alert">{quote.isError?errorMessage(quote.error):cart.error||feedback||''}</p>}
        <div className="cart-summary-line"><span>Subtotal</span><strong>{quote.data?eth(quote.data.subtotalEth):'—'}</strong></div>
        <div className="cart-summary-line"><span>Desconto do lançamento</span><strong>(−) {quote.data?eth(quote.data.discountEth):'—'}</strong></div>
        <div className="cart-summary-line"><span>Taxa de rede</span><strong>{quote.data?eth(quote.data.feeEth):'—'}</strong></div>
        <p className="cart-tax-note">Taxa estimada</p>
        <div className="cart-summary-line cart-summary-total"><span>Total</span><strong>{quote.data?eth(quote.data.totalEth):'Calculando...'}</strong></div>
        {quote.isFetching&&<p className="cart-tax-note" role="status">Atualizando cotação...</p>}
        {quote.isError?<button className="cart-retry" type="button" onClick={()=>quote.refetch()}>Recalcular valores</button>:null}
        {cart.items.length>0&&<details className="cart-realtime-tools"><summary>Testar tempo real (MSW + Socket.IO)</summary><p>Simule uma mudança no primeiro NFT do carrinho, sem atualizar o navegador.</p><div><button type="button" disabled={changingDemo} onClick={()=>demoEvent('price_up')}>Aumentar preço +0,10 ETH</button><button type="button" disabled={changingDemo} onClick={()=>demoEvent('stock_zero')}>Esgotar edição</button><button type="button" disabled={changingDemo} onClick={()=>demoEvent('restore')}>Restaurar preço e estoque</button><button type="button" disabled={changingDemo} onClick={()=>demoEvent('replay')}>Repetir evento antigo</button></div></details>}
        <Link to={cart.user?'/checkout':'/login'} aria-disabled={!quote.data||quote.isError||quote.isFetching||cart.busy} className={`cart-solid-action cart-checkout-action ${quote.data&&!quote.isError&&!quote.isFetching&&!cart.busy?'':'cart-action-disabled'}`} onClick={e=>{if(!quote.data||quote.isError||quote.isFetching||cart.busy)e.preventDefault();else if(!cart.user)sessionStorage.setItem('kurio-after-login','/checkout')}}>Conectar e finalizar</Link>
        <Link to="/" search={homeSearch} className="cart-continue">Continuar explorando</Link>
      </aside>
    </div>}
    {related.length>0&&<section className="cart-related" aria-label="Recomendações"><h2>Colecionadores também viram</h2><div className="cart-related-grid">{related.map(n=><Link key={n.id} to="/nft/$id" params={{id:n.id}} className="cart-related-card"><img src={n.image} alt={`NFT ${n.name}`}/><span>{n.name}</span><strong>{eth(n.priceEth)}</strong></Link>)}</div></section>}
  </div>;
}
export function LoginPage(){return <AuthExperience mode="login"/>}
export function RegisterPage(){return <AuthExperience mode="register"/>}
export function CheckoutPage(){const session=useSession();const cart=useCart();return <CheckoutExperience user={session.user} sessionLoading={session.loading} cart={cart}/>}
export function Confirmation(){return <OrderReceipt/>}
export function AccountPage(){const session=useSession();return <ProfileExperience {...session}/>}
export function WalletsPage(){const session=useSession();return <WalletsExperience {...session}/>}
export function FavoritesPage(){
 const session=useSession();const favorites=useQuery({queryKey:['favorites',session.user?.id],queryFn:async():Promise<string[]> =>(await api.get('/favorites')).data,enabled:!!session.user});
 const nfts=useQuery({queryKey:['all-nfts-favorites'],queryFn:async()=> (await api.get<NftList>('/nfts',{params:{page:1}})).data});
 const selected=nfts.data?.items.filter(item=>favorites.data?.includes(item.id))??[];
 return <div className="max-w-7xl mx-auto px-5 py-14 min-h-[60vh]"><h1 className="text-3xl sm:text-4xl font-bold">Meus favoritos</h1><p className="muted mt-3">Suas obras digitais salvas.</p>{!session.user?<div className="panel p-9 mt-7 text-center">Entre na sua conta para guardar seus NFTs favoritos.<br/><Link to="/login" className="btn-primary inline-flex mt-6">Entrar</Link></div>:favorites.isPending||nfts.isPending?<div className="mt-8"><Skeletons/></div>:favorites.isError||nfts.isError?<div className="panel p-8 mt-7">Não foi possível carregar seus favoritos.</div>:selected.length?<div className="nft-grid mt-8">{selected.map(n=><NFTCard nft={n} key={n.id}/>)}</div>:<div className="panel p-9 mt-7 text-center">Você ainda não tem NFTs favoritos. <Link className="text-accent underline" to="/" search={{q:'',category:'All',sort:'featured',page:1}}>Explorar coleção</Link></div>}</div>
}
export function NotFound(){return <div className="max-w-lg mx-auto px-5 py-24 text-center"><p className="text-accent font-black text-6xl">404</p><h1 className="text-3xl font-bold mt-5">Página não encontrada</h1><Link to="/" search={{q:'',category:'All',sort:'featured',page:1}} className="btn-primary inline-block mt-7">Voltar ao início</Link></div>}
