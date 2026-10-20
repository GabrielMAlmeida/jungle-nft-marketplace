import {expect,test} from '@playwright/test';

// Cada fluxo usa o mock real de rede; verificamos elementos e foco no navegador.
test.beforeEach(async({page})=>{
  test.setTimeout(60_000);
  await page.goto('/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear()});
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.getByRole('link',{name:'Ver Emerald Ape #042'})).toBeVisible({timeout:20000});
});

test('acessibilidade: zoom funciona como diálogo modal, fecha com Escape e restaura foco',async({page})=>{
  test.skip(test.info().project.name!=='chromium','Zoom disponível no layout desktop');
  await page.getByRole('link',{name:'Ver Emerald Ape #042'}).click();
  const open=page.getByRole('button',{name:'Ampliar imagem'});
  await expect(open).toBeVisible({timeout:15000});
  await open.focus();
  await page.keyboard.press('Enter');
  const dialog=page.getByRole('dialog',{name:/Visualização ampliada: Emerald Ape/});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button',{name:'Fechar visualização ampliada'})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(open).toBeFocused();
});

test('acessibilidade: formulário de login tem labels, foco por Tab e validação de e-mail',async({page})=>{
  await page.goto('/login',{waitUntil:'domcontentloaded'});
  const email=page.getByLabel('E-mail',{exact:true});
  const password=page.getByLabel('Senha',{exact:true});
  await expect(email).toBeVisible();
  await email.focus();
  await page.keyboard.press('Tab');
  await expect(password).toBeFocused();
  await email.fill('email-invalido');
  await password.fill('Demo123!');
  await expect.poll(async()=>email.evaluate(el=>(el as HTMLInputElement).validity.typeMismatch)).toBe(true);
  await expect(page.getByRole('button',{name:'Entrar',exact:true})).toBeVisible();
});
