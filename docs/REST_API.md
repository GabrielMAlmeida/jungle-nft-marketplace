# API de demonstração (MSW)

Base: `/api`. Cliente: Axios; todos os corpos JSON. JWT real não é utilizado: Bearer de sessão fictícia. Erros: `{ "message": "..." }` com HTTP 400, 401, 404, 409 ou 422 conforme a validação. O mock guarda recursos no `localStorage`.

| Método | Rota | Operação / payload |
| --- | --- | --- |
| POST | `/auth/register` | `{name,email,password}` → usuário 201 / conflito 409 |
| POST | `/auth/login` | `{email,password}` → `{token,user}` / 401 |
| GET | `/auth/me` | Usuário corrente / 401 |
| POST | `/auth/logout` | Invalida token |
| GET | `/nfts` | `q`, `category`, `sort`, `page` → `{items,total,page,pages}` |
| GET | `/nfts/:id` | Detalhes NFT ou 404 |
| GET / PUT | `/cart` | `{items:[{nftId,quantity}]}` (exige conta) |
| POST | `/quote` | `{items,coupon}` → `{subtotalEth,discountEth,feeEth,totalEth,coupon}` |
| GET / PUT | `/favorites` | `string[]` / `{ids:string[]}` (exige conta) |
| POST | `/orders` | `{items,coupon,expectedQuote,paymentMethod,network,walletAddress,mode}` com `Idempotency-Key` → pedido pendente 202 |
| GET | `/orders/:id` | Status e snapshot do pedido, autorizado por proprietário |
| GET / PUT | `/profile` | Perfil do usuário: nome, e-mail, username, ENS, apelido, avatar |
| PUT | `/profile/password` | `{currentPassword,newPassword}` |
| GET / POST | `/wallets` | Listagem/criação de carteira por usuário |
| PUT | `/wallets/:id` | Atualiza carteira cadastrada |
| POST | `/demo/nft-event` | `{id,action:'price_up'|'stock_zero'|'restore'|'replay'}` → altera mock e emite evento |

**Idempotência**: a primeira chamada armazena `(usuário, chave, fingerprint, pedido)`. Repetir a mesma chave e mesmo corpo devolve o mesmo pedido; corpo diferente devolve 409. `mode:timeout` gera o pedido e atrasa a resposta até superar o timeout do Axios. `mode:decline` retorna status terminal `rejected` e preserva o carrinho. Em sucesso, o carrinho perde somente as quantidades compradas.

**ETH**: propriedades monetárias via string decimal (Decimal.js no mock). `quantity` sempre inteira.

## Eventos em tempo real

| Evento | Payload | Efeito |
| --- | --- | --- |
| `nft.updated` | `{eventId,resource:'nft',resourceId,version,nft}` | Preço/estoque atualizados e cotação invalidada |
| `order.updated` | `{eventId,resource:'order',resourceId,ownerId,version,order}` | Pedido pendente/confirmado/recusado para proprietário |

Na conexão o cliente emite `subscribe` com token fictício, e `unsubscribe` ao encerrar. Versões antigas/duplicadas são ignoradas e no `connect` o REST revalida consultas ativas.

## Condições de rede determinísticas

- `GET /api/demo/network` → `{scenario: NetworkScenario | null}`.
- `POST /api/demo/network` → `{scope, mode, times?}` para configurar um cenário; `422` em configurações inválidas.
- `DELETE /api/demo/network` → desativa a simulação; `200 {ok:true}`.

`scope` pode ser `catalog`, `detail`, `quote`, `session`, `orders`. `mode` pode ser `normal`, `slow`, `stagger`, `http500`, `offline`, e `expire` (somente para `session` e `orders`). A simulação é implementada exclusivamente dentro dos handlers MSW. Repetições (`times`) são limitadas a 1–5; indisponibilidade por HTTP 503 e conexão abortada ocorrem duas vezes por padrão para cobrir consultas com retry. Um cenário de sessão expirada remove o token fictício da base do mock. Os controles são intencionalmente de demonstração, não fazem parte de uma API real.

## Recuperação idempotente após timeout

`GET /api/orders/by-key/:key` requer sessão Bearer válida e procura a tentativa **somente do usuário autenticado**. Retorna 404 se não há pedido associado, 401 se a sessão expirou, ou o pedido original sem criar outro. O checkout preserva a chave em `sessionStorage` após timeout e oferece **Recuperar pedido anterior**, inclusive se o carrinho estiver vazio após a confirmação assíncrona.
