import axios from 'axios';
export const api=axios.create({baseURL:'/api',timeout:10000});
api.interceptors.request.use(config=>{const token=sessionStorage.getItem('jungle-token');if(token)config.headers.Authorization=`Bearer ${token}`;return config});
export function errorMessage(err:unknown){return axios.isAxiosError(err)?String(err.response?.data?.message??err.message):err instanceof Error?err.message:'Ocorreu um erro inesperado'}
