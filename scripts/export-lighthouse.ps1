# Exporta relatórios gerados previamente em reports/lighthouse para o repositório.
# Não altera as pontuações e não executa Lighthouse novamente.
$ErrorActionPreference = 'Stop'
$source = Join-Path (Get-Location).Path 'reports/lighthouse'
if (-not (Test-Path $source)) { throw 'A pasta reports/lighthouse não existe. Rode primeiro o script audit-lighthouse.ps1 com npm run preview ativo.' }
$files = @(Get-ChildItem -Path $source -File -Filter '*.report.json' | Sort-Object Name)
if ($files.Count -lt 12) { throw "Esperados 12 relatórios JSON; encontrados $($files.Count). Confira a auditoria completa." }
$groups = @('home-mobile','home-desktop','details-mobile','details-desktop')
$entries = @()
$dest = Join-Path (Get-Location).Path 'audits/lighthouse'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
foreach ($f in $files) {
    $r = Get-Content -Raw $f.FullName | ConvertFrom-Json
    if (-not $r.categories.performance) { throw "Relatório inválido: $($f.Name)" }
    $m = [regex]::Match($f.Name, '^(home|details)-(mobile|desktop)-([123])\.report\.json$')
    if (-not $m.Success) { continue }
    $key = "$($m.Groups[1].Value)-$($m.Groups[2].Value)"
    $entries += [PSCustomObject]@{
        Key=$key; Name=$f.Name
        Perf=[int][math]::Round($r.categories.performance.score * 100)
        A11y=[int][math]::Round($r.categories.accessibility.score * 100)
        Practices=[int][math]::Round($r.categories.'best-practices'.score * 100)
        SEO=[int][math]::Round($r.categories.seo.score * 100)
        LCP=[double]$r.audits.'largest-contentful-paint'.numericValue
        CLS=[double]$r.audits.'cumulative-layout-shift'.numericValue
        TBT=[double]$r.audits.'total-blocking-time'.numericValue
        Version=$r.lighthouseVersion
        UA=$r.environment.hostUserAgent
        FetchTime=$r.fetchTime
    }
    Copy-Item $f.FullName (Join-Path $dest $f.Name) -Force
    $html = Join-Path $source $f.Name.Replace('.report.json','.report.html')
    if (-not (Test-Path $html)) { throw "Relatório HTML ausente para $($f.Name)" }
    Copy-Item $html (Join-Path $dest (Split-Path $html -Leaf)) -Force
}
function med($values){
    $sorted=@($values | Sort-Object)
    if($sorted.Count -ne 3){throw "Esperadas 3 medições; encontradas $($sorted.Count)"}
    return $sorted[1]
}
$doc=@(
 '# Auditoria Lighthouse — evidência reproduzível',
 '',
 'Executada com o build otimizado (`npm run build` + `npm run preview`) em 20/10/2026.',
 'Três execuções por página e viewport, com os mocks e os assets do produto ativos.',
 'Os relatórios HTML e JSON originais estão versionados em `audits/lighthouse/`.',
 '',
 '| Página/perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP (ms) | CLS | TBT (ms) |',
 '|---|---:|---:|---:|---:|---:|---:|---:|'
)
foreach($key in $groups){
    $g=@($entries | Where-Object {$_.Key -eq $key})
    if ($g.Count -ne 3){throw "Cenário $key precisa de 3 medições; encontradas $($g.Count)"}
    $p=med @($g|ForEach-Object Perf);$a=med @($g|ForEach-Object A11y);$b=med @($g|ForEach-Object Practices);$s=med @($g|ForEach-Object SEO)
    $l=[math]::Round((med @($g|ForEach-Object LCP)),0);$c=[math]::Round((med @($g|ForEach-Object CLS)),3);$t=[math]::Round((med @($g|ForEach-Object TBT)),0)
    $doc+="| $key | $p | $a | $b | $s | $l | $c | $t |"
}
$sample=$entries | Select-Object -First 1
$doc+=@(
 '',
 "Lighthouse versão: $($sample.Version).",
 "User agent do host: $($sample.UA).",
 "Primeira execução registrada: $($sample.FetchTime).",
 '',
 '**Critérios oficiais:** performance ≥90, acessibilidade ≥95, boas práticas ≥95, SEO ≥90.',
 'Onde as notas ficaram abaixo da meta, a evidência está mantida sem ajustes artificiais.',
 'Performance mobile e detalhes têm margem para melhorias no carregamento e custo de JavaScript; causas específicas devem ser investigadas nas auditorias individuais antes de alegar diagnóstico conclusivo.',
 '',
 'Reexecução: inicie `npm run preview` após `npm run build` e, em outro PowerShell, rode `powershell -ExecutionPolicy Bypass -File .\scripts\audit-lighthouse.ps1`.',
 'Os cenários auditados usam Home `/` e detalhe `/nft/nft-1`, perfis mobile e desktop, três medições por combinação.'
)
$doc | Set-Content -Encoding utf8 'docs/LIGHTHOUSE.md'
Write-Host "Exportados $($entries.Count) pares HTML/JSON e criado docs/LIGHTHOUSE.md. Confira as notas e o tamanho de audits/lighthouse antes do push."
