# Arquitetura — Kurio NFT Marketplace

## Fluxo de dados

`Tela React → hook TanStack Query → Axios → Service Worker MSW → estado local (localStorage)`.

O serviço WebSocket é capturado pelo MSW via `@mswjs/socket.io-binding`, mantendo o protocolo `socket.io-client`. Mudanças disparadas pelos handlers REST produzem eventos `nft.updated` e `order.updated`, com versão numérica e identificador do recurso. O hook `src/realtime/useRealtimeSync.ts` descarta eventos antigos e invalida as consultas relevantes. Na reconexão, reconsulta REST para reconciliar o estado.

## Responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `src/main.tsx` | Ativa o MSW e só então importa o router e a aplicação (ordem necessária ao WebSocket) |
| `src/router.tsx` | Rotas, parâmetros de busca e páginas de destino |
| `src/screens.tsx` | Composição de Home, catálogo, NFT, carrinho e shell |
| `src/account/*` | Login, cadastro, perfil, carteiras e validações |
| `src/checkout/*` | Cotação, escolha de carteira, confirmação e recibo |
| `src/components/ui/*` | Componentes shadcn/ui adaptados aos tokens Kurio |
| `src/lib/api.ts` | Cliente Axios, timeout e header Bearer |
| `src/mocks/handlers.ts` | REST simulado e regras de negócio |
| `src/mocks/data.ts` | Fixtures, persistência e reset local |
| `src/mocks/realtime.ts` | Binding Socket.IO sobre MSW, emissão dos eventos |
| `src/realtime/*` | Tipos e sincronização do cache |
| `src/types/index.ts` | Contratos compartilhados |

## Estado e cache

- Consultas remotas: TanStack Query com `staleTime: 20s` padrão, retry de uma tentativa e refetch on window focus desabilitado.
- Login: token de sessão fictícia em `sessionStorage`; a API mock valida `Authorization: Bearer`. A UI consulta `/auth/me` após atualizar. Logout limpa sessão e Query cache. Contas são separadas por identificador no mock.
- Visitante: carrinho em `localStorage` (`jungle-guest-cart`), migrado para o usuário em login; autenticado: `/api/cart` com dados por usuário.
- Cotação é fonte de verdade: calculada em Decimal.js, preços ETH em strings. Ao confirmar, novo `POST /api/quote` deve corresponder à cotação exibida. Mudanças exigem revisão.
- Favoritos: mutation `PUT /api/favorites` com atualização otimista e rollback após erro.
- Pedido: `POST /api/orders` utiliza `Idempotency-Key`. A chave e fingerprint da tentativa são guardadas em sessão; reenvio do mesmo payload recupera o pedido. Depois de confirmado, o recibo usa o snapshot, não o catálogo vivo.
- Eventos: `nft.updated` altera cache de NFT e listagem; `order.updated` identifica usuário e versão e atualiza pedido. Listener é removido no unmount. REST refaz consultas ao reconectar.

## Transporte MSW/Socket.IO

A conexão usa `socket.io-client` com transporte WebSocket e `path: /kurio-realtime/` sob a mesma origem da página. No MSW, `ws.link(/\/kurio-realtime\//)` recebe o upgrade e `toSocketIo(connection)` faz o handshake; isso evita o caminho reservado `/socket.io/` e o HMR do Vite. O mock deve ser iniciado antes de importar o cliente.

**Limitação:** os peers existem na instância de Service Worker/browser da simulação. Isso não equivale a um servidor Socket.IO em produção distribuída e não persiste eventos em filas externas. Ao reconectar, a interface recupera os recursos pela API REST.

## Falhas determinísticas no MSW

`src/mocks/scenarios.ts` controla condições de rede por aba (`sessionStorage`), aplicadas **somente** dentro dos handlers de catálogo, detalhe, cotação, sessão e pedido. O estado normal não possui fault injection. Os cenários `slow` e `stagger` atrasam requisições; `http500` retorna HTTP 503; `offline` simula erro de rede; e `expire` invalida o token fictício e retorna HTTP 401. Os modos de erro têm contagem limitada, evitando efeitos persistentes após recuperação. A configuração fica em `/api/demo/network` e está documentada no README.

## Proteção e limites da simulação

A autorização e as senhas PBKDF2 acontecem apenas no mock do navegador. Trata-se de demonstração, não segurança para credenciais reais: o usuário controla seu próprio storage. O app não recebe dados bancários e não conecta uma carteira real. As URLs de transação e seus hashes são fictícios.

## Design e acessibilidade

Design Kurio inspirado nos frames oficiais: fundo `#140D0A`, cartões `#241612`, cobre `#D28A4C`, destaque `#E89B55`, texto `#F5F1EB`, fonte Roboto Mono. Quatro imagens locais reutilizadas em várias telas, como no Figma. Algumas informações de edição são simplificadas para uma edição por NFT e a nomenclatura dos mocks é demonstrativa. Telas sem frame mobile próprio usam o grid responsivo.

Inputs shadcn/ui foram integrados a autenticação, perfil, carteiras e checkout mantendo semântica HTML nativa; estados de erro usam alert/status. O controle de foco de drawers/modal e os cenários de lentidão/expiração não estão inteiramente equivalentes a um backend real: esses itens devem ser apresentados como limitações, não funcionalidades completas.

## Testes e relatórios

Testes `tests/e2e/*.spec.ts` rodam em Chromium desktop 1440×900 e mobile 390×844, com MSW ligado. Playwright gera HTML e traces em falha. A auditoria Lighthouse deve ser executada no build de preview em três repetições por perfil/página. Resultados não foram pré-preenchidos: documentar os valores realmente medidos.

## Recuperação de pedido após timeout

O checkout salva `kurio-order-attempt` em `sessionStorage` até obter o resultado. Se a requisição atingir timeout **após gravar o pedido**, o usuário pode consultar `GET /api/orders/by-key/:key`, escopado pelo proprietário autenticado. A recuperação funciona mesmo que o pedido finalize em segundo plano e o carrinho fique vazio após refresh. O endpoint retorna o mesmo pedido e nunca inicia outra compra. O fluxo é exercitado em `tests/e2e/idempotency.spec.ts`.


## Expiração e retomada de sessão (12E)

Um interceptor de resposta Axios diferencia HTTP 401 do token corrente de falhas
de autenticação no login. Registra a rota privada para retomada, apaga somente a
sessão expirante e envia ao login. O fluxo de autenticação retoma checkout ou
recibo específico, se aplicável; a API continua protegendo recursos por usuário.
A requisição 401 rejeitada em `POST /orders` nunca cria pedido e permite uma nova
chave após autenticar; um timeout sem resposta preserva a chave e exige consulta
ao pedido anterior. São estratégias deliberadamente distintas.

## Acessibilidade — ampliação da arte

A ampliação do NFT é um `<dialog>` nativo aberto por `showModal()`, com foco preso pelo navegador, fechamento por Esc e restauração explícita do foco ao botão que abriu o modal. `tests/e2e/accessibility.spec.ts` exercita o fluxo via teclado e valida o formulário de login. Não confundir os testes com uma auditoria WCAG completa.
