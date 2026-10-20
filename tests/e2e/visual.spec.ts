import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';

/** Referências visuais estáveis, geradas no Windows onde a suíte E2E é executada.
 * Primeiro: --update-snapshots. Depois: sem essa flag para verificar regressões.
 * Não mascaramos erros nem pulamos screenshots em ambiente CI.
 */
test.beforeEach(async({page})=>{
  test.setTimeout(100_000);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:20000});
});

async function ready(page:Page){
  await page.evaluate(async()=>{await document.fonts.ready;});
  await expect.poll(()=>page.locator('main img:visible').evaluateAll(imgs=>imgs.every(i=>(i as HTMLImageElement).complete&&(i as HTMLImageElement).naturalWidth>0)),{timeout:15000}).toBe(true);
}
async function capture(page:Page,file:string){
  await ready(page);
  await expect(page.locator('main')).toHaveScreenshot(file,{
    animations:'disabled',caret:'hide',scale:'css',timeout:20000,
    // Cores e imagens reais são verificadas; não mascarar elementos visuais.
  });
}

async function addOne(page:Page){
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
}

test('visual: início e catálogo',async({page})=>{
  await capture(page,'home.png');
});

test('visual: detalhe do NFT',async({page})=>{
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await expect(page.getByRole('heading',{name:'Emerald Ape #042'})).toBeVisible();
  await capture(page,'details.png');
});

test('visual: carrinho com produto',async({page})=>{
  await addOne(page);
  await page.goto('/cart',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.cart-item-row')).toHaveCount(1);
  await expect(page.getByText('1.193 ETH')).toBeVisible();
  await capture(page,'cart.png');
});

test('visual: pagamento com produto e sessão',async({page})=>{
  await addOne(page);
  await page.goto('/cart',{waitUntil:'domcontentloaded'});
  await page.getByRole('link',{name:'Conectar e finalizar'}).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator('.checkout-review-items')).toContainText('Emerald Ape #042');
  await expect(page.getByRole('button',{name:'Confirmar compra'})).toBeVisible();
  await capture(page,'checkout.png');
});
