# Desafio Frontend — Marketplace de NFTs

Aplicação demonstrativa **Kurio** desenvolvida em React + TypeScript para o desafio Front-end da Jungle Gaming. A interface utiliza o Figma disponibilizado para o processo seletivo. Todos os pagamentos, carteiras, autenticação e operações de NFTs são **simulados**; nenhum token é transferido.

## Tecnologias

- React + TypeScript + Vite; TanStack Router para rotas e estado da URL
- TanStack Query para consulta, cache e mutations; Axios para REST
- MSW 2 para mock REST e WebSocket, `socket.io-client` + `@mswjs/socket.io-binding` para tempo real
- Tailwind CSS e componentes shadcn/ui adaptados à identidade Kurio (`src/components/ui/`)
- Decimal.js para valores de ETH; Playwright (Chromium desktop e mobile); Lighthouse

## Setup — Windows / PowerShell

Requisitos: Node.js 22+, npm e navegador Chrome. No terminal na raiz:

```powershell
npm ci
npx msw init public/ --save
Copy-Item .env.example .env  # apenas se .env ainda não existir
npm run dev
```

Abra `http://localhost:5173`. Os arquivos `public/images/nft-*.png` são necessários (assets extraídos do Figma); os PNGs devem fazer parte do repositório entregue. O arquivo `public/mockServiceWorker.js` também deve estar versionado. O mock fica ligado com `VITE_ENABLE_MOCKS=true` e estará disponível no build de demonstração.

## Credenciais fictícias

- `alex@demo.com` — `Demo123!`
- `sam@demo.com` — `Demo123!`
- Cupom válido: `JUNGLE10` (10%). Outros códigos são rejeitados.

As senhas das contas de demonstração usam PBKDF2 no armazenamento fictício do navegador. **Isto não constitui autenticação segura de produção:** os dados e o estado do mock vivem no cliente, sem backend real.

## Comandos

```powershell
npm run dev
npm run typecheck
npm run lint
npm run build
npm run preview
npx playwright install chromium
npm run test:e2e -- --project=chromium --workers=1
npm run test:e2e -- --project=mobile --workers=1
npm run test:report
```

Relatório Playwright: `playwright-report/index.html`. Trace e captura de falhas: `test-results/`. Para auditoria, com `npm run preview` em um terminal, execute `powershell -ExecutionPolicy Bypass -File .\scripts\audit-lighthouse.ps1` em outro. Os relatórios ficam em `reports/lighthouse/` (12 medidas: Home e detalhe × mobile/desktop × 3). Registre as **medianas observadas**; não trate o valor de uma medição como resultado consolidado.

## Fluxos e cenários de demonstração

1. Abra a Home, filtre/ordene/pesquise. Os parâmetros `q`, `category`, `sort`, `page` aparecem na URL.
2. Entre em um NFT, escolha quantidade, favorite (exige login) e adicione ao carrinho.
3. No carrinho, altere quantidade, aplique/remova `JUNGLE10`, atualize a página e confira a persistência.
4. Clique em **Conectar e finalizar**; se visitante, autentique-se; o carrinho é transferido ao usuário.
5. No checkout, configure dados e carteira, confira a cotação e aceite a revisão.
6. Expanda **Cenários de teste (MSW)** para escolher compra aprovada, recusada ou timeout. Pedido confirmado aparece no recibo com itens e valores imutáveis. Pedido recusado preserva o carrinho; após timeout, a mesma tentativa usa a mesma chave de idempotência.
7. Em **Minha conta**, edite perfil, avatar, senha e até duas carteiras fictícias.
8. Para simular mudança de preço, adicione um NFT ao carrinho; abra **Testar tempo real (MSW + Socket.IO)** e use os botões de preço, estoque, restauração e evento repetido. O mock persiste a mudança no REST e emite o evento pelo protocolo Socket.IO, atualizando a tela sem refresh.

**Reset de cenário**: no Chrome DevTools → Application → Storage → Clear site data, ou no Console:

```javascript
localStorage.clear(); sessionStorage.clear(); location.reload();
```

O reset apaga usuários, compras e carteiras criados localmente no navegador. Não use dados reais. Em testes Playwright, cada teste deve iniciar com armazenamento limpo.

## Auditoria Lighthouse — 20/10/2026

Foram executadas **12 auditorias** da versão de produção local (Home e detalhe do NFT, em mobile e desktop, três medições por combinação). Os resultados abaixo são as **medianas** de cada categoria, em escala de 0 a 100.

| Página | Performance | Acessibilidade | Boas práticas | SEO |
|---|---:|---:|---:|---:|
| Home desktop | 98 | 96 | 96 | 92 |
| Home mobile | 74 | 96 | 93 | 92 |
| Detalhes desktop | 78 | 95 | 96 | 92 |
| Detalhes mobile | 78 | 95 | 96 | 92 |

A execução das 12 medições terminou normalmente. As notas podem variar conforme dispositivo e ambiente; consulte os relatórios locais não versionados em `reports/lighthouse/` para dados individuais. A performance mobile é uma oportunidade de otimização futura.

## Testes e qualidade

- `npm run lint`, `npm run typecheck` e `npm run build` executados sem erros em 20/10/2026.
- Playwright Chromium: **10/10 cenários aprovados** em uma execução completa.
- Playwright mobile: **10/10 cenários aprovados** em uma execução completa após os ajustes dos testes.
- Os testes cobrem catálogo, carrinho, cupom, login, compra confirmada, pagamento recusado, edição de perfil, isolamento de carteiras, cadastro e evento `nft.updated` via Socket.IO.
- A aplicação é uma **demonstração baseada em mocks no navegador**, não um marketplace com transações reais.

## Publicação

Use build Vite (`npm run build`) e diretório `dist/`. No Vercel, o `vercel.json` faz o fallback das rotas SPA para `/index.html`. **Mantenha os mocks ligados no deploy** e confira acesso direto a `/nft/nft-1`, `/cart`, `/checkout` e às páginas de conta. Nenhum backend privado é necessário.

## Arquitetura e limites

Consulte `ARCHITECTURE.md` e `docs/REST_API.md`. Alguns detalhes do mock são representações simplificadas: as quatro artes originais do Figma são reaproveitadas, a seleção de edição é simplificada para uma edição por NFT, e não há blockchain, OAuth externo ou carteira real. As regras da API são simuladas e devem ser avaliadas como tal.
