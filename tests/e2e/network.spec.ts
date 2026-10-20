import {test,expect} from '@playwright/test';
import type {Page} from '@playwright/test';

type Scope='catalog'|'detail'|'quote'|'session'|'orders';
type Mode='slow'|'stagger'|'http500'|'offline'|'expire';

async function scenario(page:Page,scope:Scope,mode:Mode,times?:number){
  const response=await page.evaluate(async cfg=>{
    const res=await fetch('/api/demo/network',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)});
    return {ok:res.ok,status:res.status};
  },{scope,mode,times});
  expect(response.ok).toBeTruthy();
}

test.beforeEach(async({page})=>{
  // O Service Worker e as imagens podem atrasar o evento load no primeiro teste.
  // Esperamos a UI estar pronta, sem bloquear no carregamento de recursos externos.
  test.setTimeout(60_000);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:20_000});
});

test('MSW simula HTTP 503 no catálogo e UI recupera ao tentar novamente',async({page})=>{
  // O catálogo usa uma chave de cache nova para q=Emerald: duas falhas 503
  // cobrem a requisição e o retry automático; o clique seguinte recupera.
  await scenario(page,'catalog','http500',2);
  await page.getByRole('textbox',{name:'Buscar NFTs'}).fill('Emerald');
  await page.getByRole('button',{name:'Buscar',exact:true}).click();
  await expect(page.getByText('Não foi possível carregar o catálogo.')).toBeVisible({timeout:20_000});
  await page.getByRole('button',{name:'Tentar novamente'}).click();
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:15000});
});

test('MSW simula interrupção da conexão na cotação e permite recalcular',async({page})=>{
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart');
  await expect(page.getByRole('link',{name:'Conectar e finalizar'})).toBeVisible();
  await scenario(page,'quote','offline',1);
  await page.getByRole('textbox',{name:'Código promocional'}).fill('JUNGLE10');
  await page.getByRole('button',{name:'Aplicar'}).click();
  await expect(page.getByRole('button',{name:'Recalcular valores'})).toBeVisible({timeout:12000});
  await expect(page.getByRole('link',{name:'Conectar e finalizar'})).toHaveAttribute('aria-disabled','true');
  await page.getByRole('button',{name:'Recalcular valores'}).click();
  await expect(page.getByText('Cupom JUNGLE10 aplicado.')).toBeVisible();
  await expect(page.getByRole('link',{name:'Conectar e finalizar'})).toHaveAttribute('aria-disabled','false');
});

test('MSW expira sessão, restringe dados da conta e permite login novamente',async({page})=>{
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart/);
  await scenario(page,'session','expire');
  await page.goto('/account');
  await expect(page).toHaveURL(/\/login/, {timeout:15000});
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible();
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByRole('heading',{name:'Perfil do colecionador'})).toBeVisible();
});

test('MSW expira sessão durante checkout, mantém carrinho e retoma após login',async({page})=>{
  // Fluxo equivalente ao checkout E2E já aprovado: catálogo → carrinho
  // → conectar e finalizar → login → checkout. Evita navegações completas
  // concorrentes com a migração do carrinho no fim da autenticação.
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.cart-item-row').first()).toContainText('Emerald Ape #042',{timeout:15000});
  await page.getByRole('link',{name:'Conectar e finalizar'}).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout/,{timeout:15000});
  await expect(page.getByRole('button',{name:'Confirmar compra'})).toBeVisible({timeout:15000});
  await expect(page.getByText('Emerald Ape #042')).toBeVisible();
  await scenario(page,'orders','expire',1);
  await page.getByRole('checkbox',{name:/Conferi os NFTs/}).check();
  await page.getByRole('button',{name:'Confirmar compra'}).click();
  await expect(page).toHaveURL(/\/login/, {timeout:15000});
  await expect(page.getByText('Sua sessão expirou. Entre novamente para continuar de onde parou.')).toBeVisible();
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole('button',{name:'Confirmar compra'})).toBeVisible();
  await expect(page.getByText('Emerald Ape #042')).toBeVisible();
});

test('link direto para NFT inexistente mostra estado de erro consistente',async({page})=>{
  await page.goto('/nft/nao-existe');
  await expect(page.getByRole('heading',{name:'NFT não encontrado'})).toBeVisible();
  await page.getByRole('link',{name:'Explorar NFTs'}).click();
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible();
});
