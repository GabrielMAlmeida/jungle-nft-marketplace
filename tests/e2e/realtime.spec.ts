import {expect,test} from '@playwright/test';

// O cenário de preço usa um comando REST para gerar uma alteração no MSW;
// o teste espera o efeito do evento decodificado pelo socket.io-client.
test.beforeEach(async({page})=>{
  await page.goto('/');
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.reload();
});

test('nft.updated recalcula o carrinho sem refresh e ignora duplicatas',async({page})=>{
  test.setTimeout(60000);
  // Navega pelo catálogo, usando o mesmo caminho que já passou no teste smoke.
  // Evita o reload completo de uma rota interna durante a inicialização do MSW.
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:15000});
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  const addButton=page.getByRole('button',{name:'Adicionar ao carrinho'});
  await expect(addButton).toBeVisible({timeout:15000});
  await addButton.click();
  await page.goto('/cart');
  await expect(page.getByText('1.193 ETH')).toBeVisible();
  await expect(page.getByText('Socket.IO: conectado')).toBeVisible({timeout:12000});
  await page.getByText('Testar tempo real (MSW + Socket.IO)').click();
  await page.getByRole('button',{name:'Aumentar preço +0,10 ETH'}).click();
  await expect(page.getByText('1.293 ETH')).toBeVisible({timeout:10000});
  await expect(page.getByRole('status').filter({hasText:'preço ou disponibilidade atualizados'})).toBeVisible();
  await page.getByRole('button',{name:'Repetir evento antigo'}).click();
  await expect(page.getByText('1.293 ETH')).toBeVisible();
  await page.getByRole('button',{name:'Esgotar edição'}).click();
  await expect(page.locator('.cart-order-summary').getByRole('alert').filter({hasText:/Estoque insuficiente/})).toBeVisible({timeout:10000});
  await expect(page.getByRole('link',{name:'Conectar e finalizar'})).toHaveAttribute('aria-disabled','true');
  await page.getByRole('button',{name:'Restaurar preço e estoque'}).click();
  await expect(page.getByText('1.193 ETH')).toBeVisible({timeout:10000});
});

// Refresh fecha o socket antigo e cria outro. A UI deve reconsultar o REST
// e continuar recebendo eventos pelo protocolo Socket.IO no novo socket.
test('realtime: reconecta após refresh e continua recebendo nft.updated',async({page})=>{
  test.setTimeout(90000);
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:15000});
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  await page.getByRole('button',{name:'Adicionar ao carrinho'}).click();
  await page.goto('/cart',{waitUntil:'domcontentloaded'});
  await expect(page.getByText('Socket.IO: conectado')).toBeVisible({timeout:15000});
  await expect(page.getByText('1.193 ETH')).toBeVisible();
  await page.getByText('Testar tempo real (MSW + Socket.IO)').click();
  await page.getByRole('button',{name:'Aumentar preço +0,10 ETH'}).click();
  await expect(page.getByText('1.293 ETH')).toBeVisible({timeout:10000});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByText('Socket.IO: conectado')).toBeVisible({timeout:15000});
  await expect(page.getByText('1.293 ETH')).toBeVisible({timeout:15000});
  await page.getByText('Testar tempo real (MSW + Socket.IO)').click();
  await page.getByRole('button',{name:'Aumentar preço +0,10 ETH'}).click();
  await expect(page.getByText('1.393 ETH')).toBeVisible({timeout:10000});
});
