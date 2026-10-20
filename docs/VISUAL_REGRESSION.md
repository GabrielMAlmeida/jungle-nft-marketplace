# Evidências de regressão visual

As capturas versionadas são produzidas pelo próprio Playwright no Windows. O primeiro comando `--update-snapshots` **estabelece a referência inicial, mas não comprova regressão**. A segunda execução, sem essa flag, compara a UI atual contra as imagens versionadas.

- 4 páginas: Home, detalhe, carrinho e checkout.
- 3 larguras: 390 px (mobile), 768 px (tablet), 1440 px (desktop).
- Dados de teste reinicializados a cada cenário e capturas do conteúdo principal, sem o footer datado.
- Carregamento de fontes e imagens confirmado antes da screenshot, animações desativadas apenas na captura.

Execute os comandos descritos na conversa e versione `tests/e2e/visual.spec.ts-snapshots/`. As capturas são geradas pela sua máquina, não são imagens inventadas para representar o estado do aplicativo.
