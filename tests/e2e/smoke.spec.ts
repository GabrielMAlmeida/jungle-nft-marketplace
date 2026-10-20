import {test, expect} from '@playwright/test';
import type {Page} from '@playwright/test';


// O carrinho mobile usa layout dedicado e esconde a navegação inferior.
// Voltar ao catálogo e tocar em Perfil reproduz o caminho do usuário,
// enquanto o desktop acessa Minha conta pelo cabeçalho.
async function abrirPerfilAposLogin(page:Page){
  const desktopAccount=page.getByRole('link',{name:'Minha conta'});
  if(await desktopAccount.isVisible()){
    await desktopAccount.click();
  }else{
    await page.getByRole('link',{name:'Voltar ao catálogo'}).click();
    await page.getByRole('navigation',{name:'Navegação mobile'}).getByRole('link',{name:'Perfil'}).click();
  }
  await expect(page.getByRole('heading',{name:'Perfil do colecionador'})).toBeVisible({timeout:12000});
}

// Cada teste reseta o estado local do MSW, isolando usuários e carrinhos.
test.beforeEach(async ({page}) => {
  await page.goto('/');
  await page.evaluate(() => {localStorage.clear(); sessionStorage.clear();});
  await page.reload();
});

test('catálogo e acesso ao detalhe de um NFT', async ({page}) => {
  await expect(page.getByRole('link', {name:'Ver Emerald Ape #042'})).toBeVisible();
  await page.getByRole('link', {name:'Ver Emerald Ape #042'}).click();
  await expect(page.getByRole('heading', {name:'Emerald Ape #042'})).toBeVisible();
  await expect(page.getByRole('button', {name:'Adicionar ao carrinho'})).toBeVisible();
});

test('carrinho de visitante persiste apos refresh e recalcula quantidade', async ({page}) => {
  await page.getByRole('link', {name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button', {name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart');
  await expect(page.locator('.cart-item-row').first()).toContainText('Emerald Ape #042');
  await expect(page.locator('.cart-item-row').first().locator('.cart-mobile-price:visible, .cart-total-cell:visible')).toHaveText('1.19 ETH');
  await page.getByRole('button', {name:'Aumentar quantidade de Emerald Ape #042'}).click();
  await expect(page.locator('.cart-item-row').first().locator('.cart-mobile-price:visible, .cart-total-cell:visible')).toHaveText('2.38 ETH');
  await page.reload();
  await expect(page.locator('.cart-item-row').first()).toContainText('Emerald Ape #042');
  await expect(page.locator('.cart-item-row').first().locator('.cart-mobile-price:visible, .cart-total-cell:visible')).toHaveText('2.38 ETH');
});

test('cupom altera a cotacao e pode ser removido', async ({page}) => {
  await page.getByRole('link', {name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button', {name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart');
  await page.getByRole('textbox', {name:'Código promocional'}).fill('JUNGLE10');
  await page.getByRole('button', {name:'Aplicar'}).click();
  await expect(page.getByText('Cupom JUNGLE10 aplicado.')).toBeVisible();
  await expect(page.getByText('0.119 ETH')).toBeVisible();
  await page.getByRole('button', {name:'Remover', exact:true}).click();
  await expect(page.locator('.cart-summary-line').filter({hasText:'Desconto do lançamento'}).locator('strong')).toHaveText('(−) 0 ETH');
});

test('login de demonstracao', async ({page}) => {
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha', {exact:true}).fill('Demo123!');
  await page.getByRole('button', {name:'Entrar', exact:true}).click();
  await expect(page).toHaveURL(/\/cart/);
});

test('compra simulada com cupom e recibo confirmado pela API',async({page})=>{
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart');
  await page.getByRole('textbox',{name:'Código promocional'}).fill('JUNGLE10');
  await page.getByRole('button',{name:'Aplicar'}).click();
  await expect(page.getByText('Cupom JUNGLE10 aplicado.')).toBeVisible();
  await page.getByRole('link',{name:'Conectar e finalizar'}).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha', {exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByText('JUNGLE10').first()).toBeVisible();
  await page.getByRole('checkbox',{name:/Conferi os NFTs/}).check();
  await page.getByRole('button',{name:'Confirmar compra'}).click();
  await expect(page).toHaveURL(/\/orders\/ORD-/);
  await expect(page.getByRole('heading',{name:'Compra confirmada!'})).toBeVisible({timeout:12000});
  await expect(page.getByText('Emerald Ape #042')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Compra confirmada!'})).toBeVisible();
});

test('pagamento recusado preserva os itens no carrinho',async({page})=>{
  // Mesmo fluxo de autenticação que o checkout aprovado: convidado -> carrinho -> login -> checkout.
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart');
  await page.getByRole('link',{name:'Conectar e finalizar'}).click();
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/checkout/);
  const scenarios=page.locator('details.checkout-scenarios');
  await expect(scenarios).toBeVisible({timeout:12000});
  await scenarios.locator('summary').click();
  await scenarios.getByLabel('Resultado simulado').selectOption('decline');
  await page.getByRole('checkbox',{name:/Conferi os NFTs/}).check();
  await page.getByRole('button',{name:'Confirmar compra'}).click();
  await expect(page.getByRole('heading',{name:'Pagamento recusado'})).toBeVisible({timeout:12000});
  await page.getByRole('link',{name:'Revisar carrinho'}).click();
  await expect(page.locator('.cart-item-row').first()).toContainText('Emerald Ape #042');
});

test('perfil permite editar dados e persiste após recarregar',async({page})=>{
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart/);
  // Acessa via roteamento interno e testa recarga após salvar.
  await abrirPerfilAposLogin(page);
  await page.getByLabel('Nome de exibição').fill('Alex Kurio');
  await page.getByRole('button',{name:'Salvar perfil'}).click();
  await expect(page.getByText('Perfil atualizado com sucesso.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome de exibição')).toHaveValue('Alex Kurio',{timeout:12000});
});

test('carteiras são privadas e separadas por usuário',async({page})=>{
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart/);
  await abrirPerfilAposLogin(page);
  await page.getByRole('link',{name:'Carteiras',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Minhas carteiras'})).toBeVisible({timeout:12000});
  await page.getByLabel('Nome de exibição').fill('Carteira Alex');
  await page.getByLabel('Apelido da carteira').fill('Principal Alex');
  await page.getByLabel('Endereço da carteira').fill('0x1111111111111111111111111111111111111111');
  await page.getByRole('button',{name:'Salvar carteira'}).click();
  await expect(page.getByText('Carteira Alex salva com sucesso.')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Carteira Alex').first()).toBeVisible({timeout:12000});

  // Logout força navegação completa à Home via location.assign('/').
  // Aguarda essa navegação finalizar para evitar que concorra com page.goto('/login').
  await page.getByRole('button',{name:'Sair',exact:true}).click();
  await page.waitForURL(url=>url.pathname==='/',{waitUntil:'domcontentloaded',timeout:15000});
  await page.goto('/login');
  await page.getByLabel('E-mail',{exact:true}).fill('sam@demo.com');
  await page.getByLabel('Senha',{exact:true}).fill('Demo123!');
  await page.getByRole('button',{name:'Entrar',exact:true}).click();
  await expect(page).toHaveURL(/\/cart/);
  await abrirPerfilAposLogin(page);
  await page.getByRole('link',{name:'Carteiras',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Minhas carteiras'})).toBeVisible({timeout:12000});
  await expect(page.getByText('Carteira Alex')).toHaveCount(0);
});

test('cadastro valida confirmação de senha e e-mail duplicado',async({page})=>{
 await page.goto('/register');
 await page.getByLabel('Nome do usuário').fill('Teste Kurio');
 await page.getByLabel('E-mail',{exact:true}).fill('alex@demo.com');
 await page.getByLabel('Senha', {exact:true}).fill('Novo12345!');
 await page.getByLabel('Confirmar senha').fill('Senha diferente');
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await expect(page.getByText('A confirmação de senha não corresponde.')).toBeVisible();
 await page.getByLabel('Confirmar senha').fill('Novo12345!');
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await expect(page.getByText('Este e-mail já está cadastrado')).toBeVisible();
});
