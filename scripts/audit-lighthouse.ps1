# Execute em outro terminal com npm run preview ativo em http://localhost:4173.
# Lighthouse executa 3 medições por viewport e rota, em HTML e JSON.
$ErrorActionPreference = 'Stop'
New-Item -ItemType Directory -Force -Path 'reports/lighthouse' | Out-Null
$pages = @(@{Name='home';Url='/'}, @{Name='details';Url='/nft/nft-1'})
$profiles = @('mobile','desktop')
foreach ($profile in $profiles) {
  foreach ($page in $pages) {
    for ($i = 1; $i -le 3; $i++) {
      $output = "reports/lighthouse/$($page.Name)-${profile}-$i"
      $flags = @("http://localhost:4173$($page.Url)", '--output=html', '--output=json', "--output-path=$output", '--chrome-flags=--headless --disable-gpu', '--only-categories=performance,accessibility,best-practices,seo', '--quiet')
      if ($profile -eq 'desktop') { $flags += '--preset=desktop' }
      Write-Host "Auditoria $($page.Name) - $profile - $i/3"
      & npx lighthouse @flags
      if ($LASTEXITCODE -ne 0) { throw "Lighthouse falhou em $output" }
    }
  }
}
Write-Host 'Relatórios HTML/JSON em reports/lighthouse. Registre as medianas no README.'
