import type {NFT,User,Cart,Order,CollectorProfile,CollectorWallet} from '../types';
import {hashPassword} from './password';
// Arte, nomes e precos aproximados do arquivo Figma 'Frontend Challenge — Copy'.
// Apenas 4 PNGs originais sao reutilizados nas telas do design.
type SeedRow = [
  name: string,
  creator: string,
  collection: string,
  category: NFT['category'],
  priceEth: string,
  stock: number,
  image: string
];

const seedRows: SeedRow[] = [
  ['Emerald Ape #042','Nova Sato','Kurio Apes','Art','1.19',8,'nft-emerald-ape.png'],
  ['Sage Nomad #009','Kurio Editions','Kurio Apes','Art','1.69',12,'nft-sage-nomad.png'],
  ['Neon Vessel #552','Kurio Studio','Kurio Apes','Art','1.99',5,'nft-neon-vessel.png'],
  ['Cosmic Bloom #118','Nova Sato','Kurio Apes','Art','1.29',15,'nft-sage-nomad.png'],
  ['Violet Nomad #314','Kurio Editions','Kurio Apes','Art','1.39',7,'nft-sage-nomad.png'],
  ['Ivory Baron #088','Kurio Studio','Kurio Apes','Art','1.79',9,'nft-neon-vessel.png'],
  ['Golden Beat #207','Kurio Studio','Kurio Apes','Art','0.99',18,'nft-golden-beat.png'],
  ['Sage Beat #020','Kurio Editions','Kurio Apes','Photography','0.79',7,'nft-golden-beat.png'],
  ['Golden Signal #160','Kurio Studio','Kurio Apes','Music','0.39',25,'nft-golden-beat.png'],
  ['Emerald Echo #071','Nova Sato','Kurio Apes','Art','0.89',11,'nft-emerald-ape.png'],
  ['Neon Archive #032','Kurio Studio','Kurio Apes','Gaming','1.49',13,'nft-neon-vessel.png'],
  ['Nomad Legend #029','Kurio Editions','Kurio Apes','Photography','1.09',17,'nft-sage-nomad.png'],
];

export const seeds: NFT[] = seedRows.map(([name,creator,collection,category,priceEth,stock,image],i)=>({
  id:`nft-${i+1}`,name,creator,collection,category,
  priceEth,stock,image:`/images/${image}`,
  description:`${name} e uma obra digital da colecao Kurio Apes, com arte digital exclusiva para colecionadores.`,
  edition:'Standard Edition',featured:i<3,version:1
}));

type DemoUser=User&{passwordHash?:string;password?:string};
export type DemoDB={nfts:NFT[];users:DemoUser[];cart:Record<string,Cart>;favorites:Record<string,string[]>;orders:Record<string,Order[]>;coupons:Record<string,string>;sessions:Record<string,string>;idempotency:Record<string,{fingerprint:string;order:Order}>;profiles:Record<string,CollectorProfile>;wallets:Record<string,CollectorWallet[]>};
const key='jungle-marketplace-demo-v1';
export function initialDB():DemoDB{return {
 nfts:structuredClone(seeds),
 users:[
   {id:'u1',name:'Alex Morgan',email:'alex@demo.com',passwordHash:'pbkdf2$75312d6b7572696f2d64656d6f000000$0d3b02ed2f47f6b3225c2c8fd405323c1fcfeaf45ba74a8ca504cb5f6510a31e'},
   {id:'u2',name:'Sam Taylor',email:'sam@demo.com',passwordHash:'pbkdf2$75322d6b7572696f2d64656d6f000000$d36dde8da84a54de877e8e42e2a2767e3838192848cf9e71a36a2c43c8e879d7'}],
 cart:{},favorites:{},orders:{},coupons:{},sessions:{},idempotency:{},profiles:{},wallets:{}
}}
export function readDB():DemoDB{
 try{
  const raw=localStorage.getItem(key);
  if(!raw)return initialDB();
  const parsed=JSON.parse(raw) as DemoDB;
  return {...parsed,profiles:parsed.profiles??{},wallets:parsed.wallets??{},idempotency:parsed.idempotency??{}};
 }catch{return initialDB()}
}
export function saveDB(db:DemoDB){localStorage.setItem(key,JSON.stringify(db))}
export async function migratePasswords(){
  const db=readDB();let changed=false;
  for(const user of db.users){if(user.password){user.passwordHash=await hashPassword(user.password);delete user.password;changed=true}}
  if(changed)saveDB(db);
}
export function resetDB(){localStorage.removeItem(key);sessionStorage.removeItem('jungle-token');location.reload()}
