import {test,expect} from '@playwright/test';

// Testes verificam respostas reais do MSW via fetch e comportamento do checkout.
test.beforeEach(async({page})=>{
  test.setTimeout(100_000);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:20_000});
});

async function login(page:import('@playwright/test').Page){
  await page.goto('/login',{waitUntil:'domcontentloaded'});
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart/);
}

test('idempotência REST: reenvio mantém o pedido e chave alterada gera HTTP 409',async({page})=>{
  await login(page);
  const result=await page.evaluate(async()=>{
    const token=sessionStorage.getItem('jungle-token');
    const headers={'Content-Type':'application/json','Authorization':`Bearer ${token}`};
    const items=[{nftId:'nft-1',quantity:1}];
    const quoteResponse=await fetch('/api/quote',{method:'POST',headers,body:JSON.stringify({items,coupon:null})});
    const quote=await quoteResponse.json();
    const key=crypto.randomUUID();
    const body={items,coupon:null,expectedQuote:quote,paymentMethod:'MetaMask',network:'Ethereum',walletAddress:'0x1111111111111111111111111111111111111111',mode:'success'};
    const post=async(payload:typeof body)=>{
      const response=await fetch('/api/orders',{method:'POST',headers:{...headers,'Idempotency-Key':key},body:JSON.stringify(payload)});
      return {status:response.status,data:await response.json()};
    };
    const first=await post(body);
    const repeated=await post(body);
    const conflict=await post({...body,mode:'decline'});
    return {firstStatus:first.status,repeatedStatus:repeated.status,conflictStatus:conflict.status,firstId:first.data.id,repeatedId:repeated.data.id};
  });
  expect(result.firstStatus).toBe(202);
  expect(result.repeatedStatus).toBe(200);
  expect(result.firstId).toMatch(/^ORD-/);
  expect(result.repeatedId).toBe(result.firstId);
  expect(result.conflictStatus).toBe(409);
});

test('timeout após criação: recupera a mesma compra mesmo depois de refresh',async({page})=>{
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'Conectar e finalizar'}).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout/);
  const scenarios=page.locator('details.checkout-scenarios');
  await scenarios.locator('summary').click();
  await scenarios.getByLabel('Resultado simulado').selectOption('timeout');
  await page.getByRole('checkbox',{name:/Conferi os NFTs/}).check();
  await page.getByRole('button',{name:'Confirmar compra'}).click();
  // Axios atinge timeout após 10 s, embora o MSW tenha salvo o pedido.
  await expect(page.getByRole('button',{name:'Recuperar pedido anterior'})).toBeVisible({timeout:23_000});
  const before=await page.evaluate(()=>{
    const db=JSON.parse(localStorage.getItem('jungle-marketplace-demo-v1')||'{}');
    return {ids:(db.orders?.u1||[]).map((o:{id:string})=>o.id),key:JSON.parse(sessionStorage.getItem('kurio-order-attempt')||'null')?.key};
  });
  expect(before.ids).toHaveLength(1);
  expect(before.key).toBeTruthy();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.getByRole('button',{name:'Recuperar pedido anterior'}).click();
  await expect(page).toHaveURL(/\/orders\/ORD-/,{timeout:20_000});
  await expect(page.getByRole('heading',{name:'Compra confirmada!'})).toBeVisible({timeout:20_000});
  const after=await page.evaluate(()=>{
    const db=JSON.parse(localStorage.getItem('jungle-marketplace-demo-v1')||'{}');
    return {ids:(db.orders?.u1||[]).map((o:{id:string})=>o.id),pendingAttempt:sessionStorage.getItem('kurio-order-attempt')};
  });
  expect(after.ids).toEqual(before.ids);
  expect(after.pendingAttempt).toBeNull();
});
