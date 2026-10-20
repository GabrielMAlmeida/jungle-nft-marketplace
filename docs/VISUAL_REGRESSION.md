# Regressão visual com Playwright

A suíte verifica a consistência visual do **Kurio** entre execuções por comparação com screenshots de referência versionadas em `tests/e2e/visual.spec.ts-snapshots/`.

**Páginas:** Home, detalhe do NFT, carrinho e checkout.

**Viewports:** desktop (1440 × 900), mobile (390 × 844) e tablet (768 × 1024).

## Criar ou atualizar referências

```powershell
npm ci
npx playwright install chromium
npm run test:e2e -- --project=chromium --project=mobile --project=tablet --grep "visual:" --workers=1 --retries=0 --update-snapshots
```

Esse comando estabelece ou modifica as imagens de referência. **Gerar baselines não prova regressão visual.**

## Comparar a interface com as referências

```powershell
npm run test:e2e -- --project=chromium --project=mobile --project=tablet --grep "visual:" --workers=1 --retries=0
```

O teste compara o estado atual da interface às imagens versionadas. Foram observadas **12/12 comparações aprovadas** em 20/10/2026, no ambiente Windows de desenvolvimento. As capturas usam fixtures reinicializadas, aguardam imagens/fontes e desabilitam animações no momento do screenshot para obter resultados reproduzíveis.

Os baselines têm sufixo `-win32.png` e podem diferir em sistemas operacionais com renderização de fonte distinta; gere novas referências somente após revisão visual e justifique mudanças. Essa verificação **não mede fidelidade ao Figma original**.

Relatórios: `playwright-report/index.html`. Traces de falha: `test-results/`.
