import {ws} from 'msw';
import {toSocketIo} from '@mswjs/socket.io-binding';
import {readDB} from './data';
import type {NFT,Order} from '../types';
import type {NftUpdatedEvent,OrderUpdatedEvent} from '../realtime/events';

// O cliente usa o protocolo Socket.IO real sobre WebSocket.
// A conexão é interceptada pelo MSW, sem precisar de um servidor hospedado.
// O MSW remove /socket.io/ antes de comparar o endereço WebSocket.
// Por isso, escolhemos um caminho exclusivo para os mocks, evitando conflito
// com o protocolo de atualização automática do Vite (HMR).
// A regex aceita localhost, outras portas e a origem do deploy.
const channel=ws.link(/\/kurio-realtime\//);
type Peer={send:(event:'nft.updated'|'order.updated',payload:NftUpdatedEvent|OrderUpdatedEvent)=>void;token:string|null};
const peers=new Set<Peer>();
let latestNftEvent:NftUpdatedEvent|null=null;

export const realtimeHandler=channel.addEventListener('connection',connection=>{
  // Diagnóstico temporário: aparecer no Console confirma que o MSW recebeu o handshake.
  console.info('[Kurio WS/MSW] Conexão interceptada em /kurio-realtime/');
  const io=toSocketIo(connection);
  const peer:Peer={token:null,send:(event,payload)=>io.client.emit(event,payload)};
  peers.add(peer);
  // Evento de subscrição autenticado: o token nunca é repassado a outro cliente.
  io.client.on('subscribe',(_event,token:unknown)=>{
    if(typeof token!=='string'){peer.token=null;return}
    const db=readDB();peer.token=db.sessions[token]?token:null;
  });
  io.client.on('unsubscribe',()=>{peer.token=null});
  connection.client.addEventListener('close',()=>peers.delete(peer));
});

export function publishNft(nft:NFT){
  const event:NftUpdatedEvent={eventId:crypto.randomUUID(),resource:'nft',resourceId:nft.id,version:nft.version,nft:structuredClone(nft)};
  latestNftEvent=event;
  for(const peer of peers)peer.send('nft.updated',event);
}
export function publishOrder(ownerId:string,order:Order){
  const event:OrderUpdatedEvent={eventId:crypto.randomUUID(),resource:'order',resourceId:order.id,ownerId,version:order.version??1,order:structuredClone(order)};
  for(const peer of peers){
    if(!peer.token)continue;
    const db=readDB();
    if(db.sessions[peer.token]===ownerId)peer.send('order.updated',event);
  }
}
/** Para verificar de forma determinística que o cliente ignora uma versão repetida. */
export function replayLastNftEvent(){
  if(!latestNftEvent)return false;
  for(const peer of peers)peer.send('nft.updated',latestNftEvent);
  return true;
}
