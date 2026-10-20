# Auditoria Lighthouse â€” evidÃªncia reproduzÃ­vel

Executada com o build otimizado (`npm run build` + `npm run preview`) em 20/10/2026.
TrÃªs execuÃ§Ãµes por pÃ¡gina e viewport, com os mocks e os assets do produto ativos.
Os relatÃ³rios HTML e JSON originais estÃ£o versionados em `audits/lighthouse/`.

| PÃ¡gina/perfil | Performance | Acessibilidade | Boas prÃ¡ticas | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| home-mobile | 74 | 96 | 93 | 92 | 3922 | 0 | 286 |
| home-desktop | 98 | 96 | 96 | 92 | 1069 | 0.001 | 9 |
| details-mobile | 78 | 95 | 96 | 92 | 3848 | 0 | 174 |
| details-desktop | 78 | 95 | 96 | 92 | 974 | 0.45 | 6 |

Lighthouse versÃ£o: 12.8.2.
User agent do host: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/155.0.0.0 Safari/537.36.
Primeira execuÃ§Ã£o registrada: 2026-10-20T14:55:52.051Z.

**CritÃ©rios oficiais:** performance â‰¥90, acessibilidade â‰¥95, boas prÃ¡ticas â‰¥95, SEO â‰¥90.
Onde as notas ficaram abaixo da meta, a evidÃªncia estÃ¡ mantida sem ajustes artificiais.
Performance mobile e detalhes tÃªm margem para melhorias no carregamento e custo de JavaScript; causas especÃ­ficas devem ser investigadas nas auditorias individuais antes de alegar diagnÃ³stico conclusivo.

ReexecuÃ§Ã£o: inicie `npm run preview` apÃ³s `npm run build` e, em outro PowerShell, rode `powershell -ExecutionPolicy Bypass -File .\scripts\audit-lighthouse.ps1`.
Os cenÃ¡rios auditados usam Home `/` e detalhe `/nft/nft-1`, perfis mobile e desktop, trÃªs mediÃ§Ãµes por combinaÃ§Ã£o.
