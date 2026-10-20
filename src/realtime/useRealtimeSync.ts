import {useEffect,useRef,useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import type {Socket} from 'socket.io-client';
import type {NFT,NftList,Order} from '../types';
import type {NftUpdatedEvent,OrderUpdatedEvent} from './events';

/** A única integração de UI com Socket.IO. Nenhum mock chama estados diretamente. */
export function useRealtimeSync(userId:string|null){
  const qc=useQueryClient();
  const [notice,setNotice]=useState('');
  const [connected,setConnected]=useState(false);
  const [connectionError,setConnectionError]=useState('');
  const versionByNft=useRef(new Map<string,number>());
  const versionByOrder=useRef(new Map<string,number>());
  useEffect(()=>{
    const currentOrderVersions=versionByOrder.current;
    if(import.meta.env.VITE_ENABLE_MOCKS==='false'&&!import.meta.env.VITE_SOCKET_URL)return;
    let socket:Socket|null=null;
    let disposed=false;
    const reconcile=()=>{
      // Em reconexão, o REST prevalece; reconsulta apenas os recursos ativos.
      for(const prefix of ['nfts','nft','cart-item-details','checkout-nft-details','cart-quote','checkout-quote']){
        void qc.invalidateQueries({queryKey:[prefix],refetchType:'active'});
      }
      if(userId){void qc.invalidateQueries({queryKey:['order'],refetchType:'active'});void qc.invalidateQueries({queryKey:['cart',userId],refetchType:'active'});}
    };
    const onConnect=()=>{
      if(disposed)return;
      setConnected(true);
      setConnectionError('');
      socket?.emit('subscribe',sessionStorage.getItem('jungle-token')??'');
      reconcile();
    };
    const onDisconnect=()=>{if(!disposed)setConnected(false)};
    const onConnectError=(error:Error)=>{
      if(disposed)return;
      setConnected(false);
      setConnectionError(error.message||'Falha ao conectar');
      console.warn('[Kurio WS] Falha Socket.IO:',error.message,'Causa:',error.cause??'não informada');
    };
    const onNft=(event:NftUpdatedEvent)=>{
      if(disposed||!event||event.resource!=='nft'||event.resourceId!==event.nft?.id||!Number.isInteger(event.version)||event.nft.version!==event.version)return;
      const previous=versionByNft.current.get(event.resourceId)??0;
      if(event.version<=previous)return;
      versionByNft.current.set(event.resourceId,event.version);
      const replace=(current:NFT):NFT=>current.id===event.resourceId&&current.version<event.version?event.nft:current;
      qc.setQueriesData<NFT>({queryKey:['nft']},current=>current?replace(current):current);
      qc.setQueriesData<NftList>({queryKey:['nfts']},current=>current?{...current,items:current.items.map(replace)}:current);
      void qc.invalidateQueries({queryKey:['nfts'],refetchType:'active'});
      for(const prefix of ['cart-item-details','checkout-nft-details']){
        qc.setQueriesData<NFT[]>({queryKey:[prefix]},current=>current?.map(replace));
      }
      void qc.invalidateQueries({queryKey:['cart-quote'],refetchType:'active'});
      void qc.invalidateQueries({queryKey:['checkout-quote'],refetchType:'active'});
      setNotice(`${event.nft.name}: preço ou disponibilidade atualizados. Confira os valores antes de comprar.`);
    };
    const onOrder=(event:OrderUpdatedEvent)=>{
      if(disposed||!userId||event.ownerId!==userId||event.resource!=='order'||event.resourceId!==event.order?.id)return;
      const previous=versionByOrder.current.get(event.resourceId)??0;
      if(event.version<=previous)return;
      versionByOrder.current.set(event.resourceId,event.version);
      qc.setQueryData<Order>(['order',event.resourceId],current=>!current||(current.version??0)<event.version?event.order:current);
      if(event.order.status==='confirmed'){
        void qc.invalidateQueries({queryKey:['cart',userId],refetchType:'active'});
        void qc.invalidateQueries({queryKey:['nfts'],refetchType:'active'});
      }
      setNotice(`Pedido ${event.order.id}: ${event.order.status==='confirmed'?'compra confirmada':event.order.status==='rejected'?'pagamento recusado':'em processamento'}.`);
    };
    // Importar a biblioteca após worker.start é obrigatório: Socket.IO salva uma
    // referência ao WebSocket global na importação, antes de o MSW interceptá-lo.
    void import('socket.io-client').then(({io})=>{
      if(disposed)return;
      // Caminho exclusivo: MSW não altera /kurio-realtime/, ao contrário de
      // /socket.io/. No modo não simulado, use o caminho padrão do servidor.
      const mockMode=import.meta.env.VITE_ENABLE_MOCKS!=='false';
      const baseUrl=mockMode?window.location.origin:import.meta.env.VITE_SOCKET_URL;
      if(!baseUrl){onConnectError(new Error('VITE_SOCKET_URL não configurada'));return}
      const path=mockMode?'/kurio-realtime/':'/socket.io/';
      console.info('[Kurio WS] Iniciando conexão em',`${baseUrl}${path}`);
      const active=io(baseUrl,{
        path,
        transports:['websocket'],reconnection:true,reconnectionDelay:800,reconnectionAttempts:5,autoConnect:false,
      });
      socket=active;
      active.on('connect',onConnect);
      active.on('disconnect',onDisconnect);
      active.on('connect_error',onConnectError);
      active.on('nft.updated',onNft);
      active.on('order.updated',onOrder);
      active.connect();
    }).catch(error=>onConnectError(error instanceof Error?error:new Error(String(error))));
    return()=>{
      disposed=true;
      if(socket){
        socket.emit('unsubscribe');
        socket.off('connect',onConnect);socket.off('disconnect',onDisconnect);
        socket.off('connect_error',onConnectError);
        socket.off('nft.updated',onNft);socket.off('order.updated',onOrder);
        socket.disconnect();
      }
      currentOrderVersions.clear();
    };
  },[qc,userId]);
  return {connected,notice,connectionError};
}
