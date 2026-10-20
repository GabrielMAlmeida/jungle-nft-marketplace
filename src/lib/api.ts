import axios from 'axios';
export const api=axios.create({baseURL:'/api',timeout:10000});
api.interceptors.request.use(config=>{const token=sessionStorage.getItem('jungle-token');if(token)config.headers.Authorization=`Bearer ${token}`;return config});
export function errorMessage(err:unknown){return axios.isAxiosError(err)?String(err.response?.data?.message??err.message):err instanceof Error?err.message:'Ocorreu um erro inesperado'}


// Uma resposta 401 da API autenticada encerra APENAS a sessão que fez a
// requisição. Respostas antigas nunca podem derrubar um login mais recente.
api.interceptors.response.use(response=>response,error=>{
  if(axios.isAxiosError(error)&&error.response?.status===401){
    const endpoint=String(error.config?.url??'');
    const requestToken=String(error.config?.headers?.Authorization??'');
    const currentToken=sessionStorage.getItem('jungle-token');
    if(currentToken&&requestToken===`Bearer ${currentToken}`&&!['/auth/login','/auth/register'].includes(endpoint)){
      const pathname=window.location.pathname;
      // Um 401 no POST /orders confirma que o backend REJEITOU a tentativa:
      // não há pedido associado àquela chave; uma nova autenticação pode criar outra.
      if(endpoint==='/orders'&&error.config?.method?.toLowerCase()==='post'){
        sessionStorage.removeItem('kurio-order-attempt');
      }
      if(pathname==='/checkout'||pathname==='/account'||pathname==='/account/wallets'||pathname==='/favorites'||/^\/orders\/ORD-[a-zA-Z0-9-]+$/.test(pathname)){
        sessionStorage.setItem('kurio-after-login',pathname);
      }
      sessionStorage.removeItem('jungle-token');
      sessionStorage.setItem('kurio-session-notice','Sua sessão expirou. Entre novamente para continuar de onde parou.');
      window.location.assign('/login');
    }
  }
  return Promise.reject(error);
});
