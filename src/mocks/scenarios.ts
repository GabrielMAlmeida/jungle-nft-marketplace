import {HttpResponse,delay} from 'msw';
import {readDB,saveDB} from './data';

/** Cenários de rede determinísticos para auditoria. O padrão é sempre normal. */
export type NetworkScope='catalog'|'detail'|'quote'|'session'|'orders';
export type NetworkMode='normal'|'slow'|'stagger'|'http500'|'offline'|'expire';
export type NetworkScenario={scope:NetworkScope;mode:NetworkMode;requestNumber:number;times:number};
const storageKey='kurio-demo-network-scenario';
const scopes:NetworkScope[]=['catalog','detail','quote','session','orders'];
const modes:NetworkMode[]=['normal','slow','stagger','http500','offline','expire'];
export function currentScenario():NetworkScenario|null{
  try{
    const raw=sessionStorage.getItem(storageKey);
    if(!raw)return null;
    const parsed=JSON.parse(raw) as Partial<NetworkScenario>;
    if(!scopes.includes(parsed.scope as NetworkScope)||!modes.includes(parsed.mode as NetworkMode))return null;
    return {scope:parsed.scope as NetworkScope,mode:parsed.mode as NetworkMode,requestNumber:Math.max(0,Number(parsed.requestNumber)||0),times:Math.min(5,Math.max(1,Number(parsed.times)||1))};
  }catch{return null}
}
export function configureScenario(input:unknown):NetworkScenario|null{
  if(typeof input!=='object'||!input)return null;
  const data=input as Record<string,unknown>;
  if(typeof data.scope!=='string'||!scopes.includes(data.scope as NetworkScope)||typeof data.mode!=='string'||!modes.includes(data.mode as NetworkMode))return null;
  if(data.mode==='expire'&&!['session','orders'].includes(data.scope))return null;
  const defaultTimes=['http500','offline'].includes(data.mode)?2:1;
  const times=typeof data.times==='number'&&Number.isInteger(data.times)&&data.times>=1&&data.times<=5?data.times:defaultTimes;
  const config:NetworkScenario={scope:data.scope as NetworkScope,mode:data.mode as NetworkMode,requestNumber:0,times};
  if(config.mode==='normal')sessionStorage.removeItem(storageKey);
  else sessionStorage.setItem(storageKey,JSON.stringify(config));
  return config;
}
export function resetScenario(){sessionStorage.removeItem(storageKey)}

/** Injetado somente nos handlers MSW (nunca em componentes ou no Axios). */
export async function applyNetworkScenario(scope:NetworkScope,request:Request):Promise<Response|null>{
  const config=currentScenario();
  if(!config||config.scope!==scope)return null;
  const next={...config,requestNumber:config.requestNumber+1};
  const oneShot=['http500','offline','expire'].includes(config.mode);
  if(oneShot&&next.requestNumber>=config.times)resetScenario();
  else sessionStorage.setItem(storageKey,JSON.stringify(next));
  if(config.mode==='slow'){await delay(1250);return null}
  if(config.mode==='stagger'){await delay(config.requestNumber%2===0?1800:60);return null}
  if(config.mode==='http500')return HttpResponse.json({message:'Serviço temporariamente indisponível (cenário MSW).'}, {status:503});
  if(config.mode==='offline')return HttpResponse.error();
  if(config.mode==='expire'){
    const token=request.headers.get('Authorization')?.replace('Bearer ','')??'';
    const db=readDB();delete db.sessions[token];saveDB(db);
    return HttpResponse.json({message:'Sessão expirada (cenário MSW).'}, {status:401});
  }
  return null;
}
