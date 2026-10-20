import type {NFT,Order} from '../types';

/** Envelope compartilhado entre a API REST simulada, os mocks de Socket.IO e a UI. */
export type NftUpdatedEvent={eventId:string;resource:'nft';resourceId:string;version:number;nft:NFT};
export type OrderUpdatedEvent={eventId:string;resource:'order';resourceId:string;ownerId:string;version:number;order:Order};
