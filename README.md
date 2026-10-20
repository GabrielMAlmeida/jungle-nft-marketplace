# Kurio — NFT Marketplace

Marketplace de NFTs desenvolvido com **React e TypeScript** para o desafio técnico de Front-end da **Jungle Gaming**, a partir da identidade visual disponibilizada no Figma. A aplicação contempla descoberta de coleções, gerenciamento de conta, compra simulada e sincronização de dados em tempo real.

**[Acessar demonstração](https://jungle-nft-marketplace-five.vercel.app/)** · **[Layout de referência (Figma)](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1)** · **[Arquitetura](ARCHITECTURE.md)** · **[Contratos REST](docs/REST_API.md)**

> **Ambiente demonstrativo:** autenticação, pagamentos, carteiras e NFTs são simulados com MSW. Não há blockchain, transferência de tokens nem transações financeiras reais.

## Funcionalidades

| Área | O que está disponível |
| --- | --- |
| **Marketplace** | NFTs em destaque, busca, categorias, ordenação, paginação e parâmetros persistidos na URL |
| **Detalhes** | Galeria e ampliação de imagem, informações de edição, quantidade, disponibilidade e favoritos |
| **Carrinho** | Adição e remoção de itens, ajuste de quantidades, cupom, taxas e cotação em ETH |
| **Checkout** | Seleção de rede/carteira fictícia, revisão de valores e simulação de pagamento |
| **Pedidos** | Estados pendente, confirmado e recusado, recibo com snapshot e recuperação idempotente após timeout |
| **Colecionador** | Cadastro, login, logout, perfil, avatar, alteração de senha e até duas carteiras |
| **Tempo real** | Atualizações de preço/estoque e status do pedido via eventos Socket.IO simulados pelo MSW |

A interface é responsiva e inclui estados de carregamento, erro e vazio. Carrinho e dados fictícios sobrevivem ao refresh no mesmo navegador; uma sessão expirada permite nova autenticação e retomada do fluxo.

## Tecnologias

| Finalidade | Tecnologia |
| --- | --- |
| Interface e linguagem | React 19, TypeScript, Vite |
| Rotas e estado da URL | TanStack Router |
| Dados assíncronos e cache | TanStack Query |
| Integração REST | Axios |
| Eventos em tempo real | `socket.io-client` com `@mswjs/socket.io-binding` |
| Mocks de rede | Mock Service Worker (MSW 2) |
| Estilos e componentes | Tailwind CSS; componentes `Input` e `Textarea` adaptados ao padrão shadcn/ui em `src/components/ui/` |
| Valores monetários | Decimal.js (valores ETH transportados como strings decimais) |
| Testes e auditoria | Playwright e Lighthouse |

### Visão da arquitetura

```text
React (telas e formulários)
    ├── TanStack Router (rotas e filtros na URL)
    ├── TanStack Query (consultas, mutations e cache)
    └── Axios (requisições REST)
             ↓
       Service Worker MSW
             ↓
  Fixtures e persistência local

socket.io-client ↔ MSW + socket.io-binding
             ↓
  Eventos nft.updated e order.updated
             ↓
 Atualização do cache e reconciliação REST
```

As decisões de sessão, idempotência, reconexão, autorização fictícia e limites do mock estão detalhadas em [ARCHITECTURE.md](ARCHITECTURE.md). A lista de endpoints e eventos está em [docs/REST_API.md](docs/REST_API.md).

## Executar localmente

**Pré-requisitos:** Node.js 22+, npm e navegador compatível com Chromium.

```bash
git clone https://github.com/GabrielMAlmeida/jungle-nft-marketplace.git
cd jungle-nft-marketplace
npm ci
```

Configure `.env` a partir de `.env.example`, com:

```dotenv
VITE_ENABLE_MOCKS=true
```

No Windows (PowerShell):

```powershell
Copy-Item .env.example .env
npm run dev
```

No macOS/Linux:

```bash
cp .env.example .env
npm run dev
```

Acesse **http://localhost:5173**. O arquivo `public/mockServiceWorker.js` e as imagens em `public/images/` já fazem parte do repositório; o projeto não depende de serviços privados ou de um backend externo. Se for necessário regenerar o worker, execute `npx msw init public/ --save`.

Para testar o build otimizado:

```bash
npm run build
npm run preview
```

### Contas de demonstração

| E-mail | Senha |
| --- | --- |
| `alex@demo.com` | `Demo123!` |
| `sam@demo.com` | `Demo123!` |

**Cupom válido:** `JUNGLE10` (10% de desconto). Outros códigos são rejeitados. Use apenas dados fictícios: as informações do mock ficam no navegador e a proteção PBKDF2 é demonstrativa, não autenticação de produção.

## Como explorar os fluxos

1. Na **Home**, pesquise NFTs, combine filtros, ordene os resultados, navegue entre páginas e teste o histórico do navegador. Os parâmetros `q`, `category`, `sort` e `page` integram a URL.
2. Abra o **detalhe** de um NFT, ajuste a quantidade e adicione ao carrinho. Faça login para usar favoritos.
3. No **carrinho**, altere itens, aplique/remova `JUNGLE10` e atualize a página para verificar a persistência.
4. Escolha **Conectar e finalizar**. Caso seja visitante, autentique-se; o fluxo retoma o checkout com o carrinho preservado.
5. No **checkout**, confira a cotação, a carteira e a rede, aceite a revisão e simule um pedido. Em **Cenários de teste (MSW)**, selecione sucesso, recusa ou timeout.
6. Um pedido confirmado abre um **recibo** com os valores registrados na compra. Um pagamento recusado preserva o carrinho. Após timeout, **Recuperar pedido anterior** consulta a mesma tentativa, sem duplicar a compra.
7. Em **Minha conta**, edite perfil, avatar e senha e cadastre até duas carteiras fictícias.

### Testar atualizações em tempo real

Com um NFT no carrinho, abra **Testar tempo real (MSW + Socket.IO)**. Use os comandos para aumentar preço, esgotar/restaurar estoque e repetir um evento anterior. A alteração ocorre primeiro nos handlers MSW, aparece nas respostas REST e é propagada pelo protocolo Socket.IO ao cliente, atualizando a tela sem refresh. Eventos antigos e duplicados não devem regredir o estado.

### Simular falhas de rede e sessão

Os cenários ficam **desligados por padrão** e são configurados no MSW pela rota `/api/demo/network`. No Console do navegador, com a aplicação aberta, execute:

```javascript
await fetch('/api/demo/network', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scope: 'catalog', mode: 'http500' })
});
```

Depois, altere a busca na Home. O catálogo receberá HTTP **503** (duas tentativas por padrão) e deverá exibir a opção **Tentar novamente**. Para desativar a simulação:

```javascript
await fetch('/api/demo/network', { method: 'DELETE' });
```

| Escopo | Recurso | Cenários |
| --- | --- | --- |
| `catalog` | `GET /api/nfts` | `slow`, `stagger`, `http500`, `offline` |
| `detail` | `GET /api/nfts/:id` | Os mesmos |
| `quote` | `POST /api/quote` | Os mesmos |
| `session` | `GET /api/auth/me` | Os mesmos + `expire` |
| `orders` | `POST /api/orders` | Os mesmos + `expire` |

`slow`: atraso de 1.250 ms; `stagger`: atrasos alternados de 1.800/60 ms; `http500`: resposta HTTP 503; `offline`: erro de conexão; `expire`: invalidação da sessão com HTTP 401. Use `times` (1 a 5) para limitar ocorrências. O timeout após criação de pedido é selecionado separadamente no checkout.

**Reiniciar dados da demonstração:** Chrome DevTools → Application → Storage → Clear site data; ou, no Console:

```javascript
localStorage.clear(); sessionStorage.clear(); location.reload();
```

Isso remove contas, carteiras e pedidos locais do navegador. Os testes Playwright isolam o armazenamento antes dos cenários.

## Testes e qualidade

Os comandos abaixo executam validação estática, build e testes E2E com os mocks:

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e -- --project=chromium --workers=1
npm run test:e2e -- --project=mobile --workers=1
npm run test:e2e -- --project=tablet --workers=1
npm run test:report
```

**Resultados registrados em 20/10/2026:** lint, TypeScript e build sem erros; **23/23 testes Chromium aprovados** em uma execução completa; **12/12 comparações visuais aprovadas** (Home, detalhe, carrinho e checkout × desktop, mobile e tablet); **10/10 testes mobile funcionais aprovados em execução anterior**, antes das correções posteriores. Foi adicionado um teste de reconexão após refresh, mas seu resultado não está incluído na execução consolidada de 23 testes. Não se deve inferir aprovação de testes ainda não reexecutados.

Os testes exercitam compras confirmadas e recusadas, sessões, carrinhos separados, falhas 503/offline, recuperação após timeout, idempotência, eventos Socket.IO e acessibilidade por teclado. As capturas de referência estão em `tests/e2e/visual.spec.ts-snapshots/`, com procedimento em [docs/VISUAL_REGRESSION.md](docs/VISUAL_REGRESSION.md). Essas comparações medem regressão em relação às referências capturadas, não aderência exata ao Figma.

Os relatórios HTML/trace do Playwright são gerados localmente em `playwright-report/` e `test-results/`.

### Lighthouse

Foram realizadas **12 medições** no build otimizado local: Home e detalhe × mobile e desktop × três repetições. Medianas:

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO |
| --- | ---: | ---: | ---: | ---: |
| Home — desktop | 98 | 96 | 96 | 92 |
| Home — mobile | 74 | 96 | 93 | 92 |
| Detalhe — desktop | 78 | 95 | 96 | 92 |
| Detalhe — mobile | 78 | 95 | 96 | 92 |

As metas oficiais são **90 / 95 / 95 / 90**, respectivamente. Há resultados abaixo da meta, especialmente em performance mobile e no detalhe; não foram tratados como aprovações. Os relatórios HTML/JSON estão em [audits/lighthouse](audits/lighthouse/) (12 pares). As medições de **LCP, CLS e TBT**, o ambiente e a versão das ferramentas estão em [docs/LIGHTHOUSE.md](docs/LIGHTHOUSE.md).

Para repetir as auditorias no Windows, execute `npm run build` e `npm run preview` e, em outro PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/audit-lighthouse.ps1
```

## Publicação

**Aplicação pública:** https://jungle-nft-marketplace-five.vercel.app/

- Framework: Vite; build: `npm run build`; saída: `dist/`.
- Na Vercel, configure `VITE_ENABLE_MOCKS=true` para a demonstração.
- `vercel.json` habilita fallback de rotas SPA, inclusive ao acessar e recarregar `/nft/nft-1`, `/cart` e `/checkout`.
- A instalação a partir de um checkout limpo não requer backend privado.

## Limitações conhecidas

- Auth, carteiras, pagamentos e eventos dependem dos mocks executados no navegador. Os dados não são compartilhados entre dispositivos, nem equivalem a segurança ou transações reais.
- As quatro artes locais do Figma são reutilizadas em outras coleções. A seleção de edição foi simplificada para uma edição por NFT.
- Os testes cobrem reconexão após refresh, mas não comprovam interrupção transitória do WebSocket com a SPA aberta.
- O projeto tem resultados Lighthouse abaixo das metas especificadas em alguns cenários; os relatórios originais foram preservados.
- Os componentes de UI no padrão shadcn/ui foram adaptados localmente; não há uma biblioteca completa de componentes instalada.

---

Projeto desenvolvido para o **desafio técnico Front-end da Jungle Gaming**. Documentação complementar: [Arquitetura](ARCHITECTURE.md) · [API REST e eventos](docs/REST_API.md) · [Evidências Lighthouse](docs/LIGHTHOUSE.md) · [Regressão visual](docs/VISUAL_REGRESSION.md).
