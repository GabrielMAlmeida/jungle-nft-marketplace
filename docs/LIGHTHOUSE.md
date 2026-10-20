# Auditoria Lighthouse — evidências reproduzíveis

Auditoria realizada em **20/10/2026** no build otimizado local (`npm run build` + `npm run preview`), com os mocks, imagens e funcionalidades da aplicação habilitados.

Foram executadas **três medições por página e perfil**, totalizando 12 auditorias. Os 24 arquivos de evidência (12 relatórios HTML e 12 JSON) estão em [`audits/lighthouse/`](../audits/lighthouse/).

## Resultados: mediana das três execuções

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home — mobile | 74 | 96 | 93 | 92 | 3922 | 0 | 286 |
| Home — desktop | 98 | 96 | 96 | 92 | 1069 | 0,001 | 9 |
| Detalhe — mobile | 78 | 95 | 96 | 92 | 3848 | 0 | 174 |
| Detalhe — desktop | 78 | 95 | 96 | 92 | 974 | 0,45 | 6 |

**Metas do desafio:** Performance ≥ 90, Acessibilidade ≥ 95, Boas práticas ≥ 95, SEO ≥ 90. Os valores abaixo dessas metas são mantidos como medidos, sem alterações artificiais.

## Ambiente

- **Lighthouse:** 12.8.2.
- **Navegador:** HeadlessChrome 155.0.0.0.
- **Sistema operacional:** Windows 10.0, Win64, x64 (conforme user agent).
- **Início registrado:** 2026-10-20T14:55:52.051Z.
- **Rotas:** `/` (Home) e `/nft/nft-1` (detalhe).
- **Perfis:** mobile e desktop, três medições para cada combinação.

## Análise dos resultados abaixo da meta

- **Home mobile:** o LCP mediano de 3.922 ms e o TBT de 286 ms são oportunidades para otimizar carregamento e processamento da interface em condições mobile.
- **Detalhe mobile:** o LCP de 3.848 ms indica oportunidade de melhorar a renderização do conteúdo principal.
- **Detalhe desktop:** apesar do LCP de 974 ms e TBT de 6 ms, o **CLS de 0,45** é elevado e merece investigação prioritária de deslocamentos de layout.
- **Boas práticas da Home mobile:** mediana de 93, abaixo da meta de 95; os relatórios originais permitem inspecionar as auditorias específicas.

Esses dados indicam **áreas de investigação**, não causas já comprovadas. Uma investigação conclusiva exige observar as oportunidades e os diagnósticos dos arquivos JSON/HTML individuais.

## Reproduzir a auditoria

No terminal da raiz do projeto:

```powershell
npm ci
Copy-Item .env.example .env
npm run build
npm run preview
```

Com o preview ativo em `http://localhost:4173`, abra outro PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\audit-lighthouse.ps1
```

Para atualizar as evidências e gerar esta tabela a partir dos JSON produzidos:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\export-lighthouse.ps1
```

A reprodução pode variar conforme máquina, versão do navegador e condições do teste. O script exportador calcula as **medianas**, sem substituir os dados individuais medidos.
