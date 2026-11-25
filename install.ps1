# antigravity-langpack one-line & local installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/CHANPAJN/antigravity-langpack/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/CHANPAJN/antigravity-langpack.git'
$ZipUrl = 'https://codeload.github.com/CHANPAJN/antigravity-langpack/zip/refs/heads/main'
$InstallDir = if ($env:AGY_LANGPACK_HOME) { $env:AGY_LANGPACK_HOME } else { Join-Path $HOME '.antigravity-langpack' }
$NodeVersion = 'v22.14.0'

function Test-NodeVersionOk([string]$NodeExe) {
  if (-not $NodeExe) { return $false }
  try {
    $p = Start-Process -FilePath $NodeExe -ArgumentList '-e', 'const [maj,min]=process.versions.node.split(".").map(Number);process.exit(maj>22||(maj===22&&min>=13)?0:1)' -NoNewWindow -Wait -PassThru -ErrorAction Stop
    return ($p.ExitCode -eq 0)
  } catch {
    return $false
  }
}

function Resolve-TargetRepo {
  if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'cli.mjs')) -and (Test-Path (Join-Path $PSScriptRoot 'dict'))) {
    return $PSScriptRoot
  }
  $cwd = (Get-Location).Path
  if ((Test-Path (Join-Path $cwd 'cli.mjs')) -and (Test-Path (Join-Path $cwd 'dict'))) {
    return $cwd
  }

  Write-Host "[antigravity-langpack] Preparing repository in $InstallDir ..."
  if (Test-Path (Join-Path $InstallDir '.git')) {
    try { & git -C $InstallDir pull --ff-only | Out-Null } catch {}
    return $InstallDir
  }

  if (Get-Command git -ErrorAction SilentlyContinue) {
    if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
    & git clone --depth 1 $RepoUrl $InstallDir
    return $InstallDir
  }

  if (Test-Path $InstallDir) { Remove-Item -Recurse -Force $InstallDir }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("agy-langpack-" + [Guid]::NewGuid().ToString('N') + ".zip")
  $tmpExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("agy-langpack-ext-" + [Guid]::NewGuid().ToString('N'))
  Invoke-WebRequest -Uri $ZipUrl -OutFile $tmpZip -UseBasicParsing
  Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force
  $inner = Get-ChildItem -Path $tmpExtract -Directory | Select-Object -First 1
  Copy-Item -Path (Join-Path $inner.FullName '*') -Destination $InstallDir -Recurse -Force
  Remove-Item -Force $tmpZip -ErrorAction SilentlyContinue
  Remove-Item -Recurse -Force $tmpExtract -ErrorAction SilentlyContinue
  return $InstallDir
}

function Resolve-NodeBinary([string]$RepoDir) {
  $sysNode = Get-Command node -ErrorAction SilentlyContinue
  if ($sysNode -and (Test-NodeVersionOk $sysNode.Source)) {
    return $sysNode.Source
  }

  $localNode = Join-Path $RepoDir '.runtime\node\node.exe'
  if ((Test-Path $localNode) -and (Test-NodeVersionOk $localNode)) {
    return $localNode
  }

  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $zipName = "node-$NodeVersion-win-$arch.zip"
  $baseUrl = "https://nodejs.org/dist/$NodeVersion"
  $rtDir = Join-Path $RepoDir '.runtime'
  New-Item -ItemType Directory -Force -Path $rtDir | Out-Null
  $zipFile = Join-Path $rtDir $zipName
  $sumsFile = Join-Path $rtDir 'SHASUMS256.txt'

  Write-Host "[antigravity-langpack] Node.js >= 22.13 not found in PATH; downloading official $zipName (SHA-256 verified) ..."
  Invoke-WebRequest -Uri "$baseUrl/SHASUMS256.txt" -OutFile $sumsFile -UseBasicParsing
  Invoke-WebRequest -Uri "$baseUrl/$zipName" -OutFile $zipFile -UseBasicParsing

  $expected = $null
  foreach ($line in (Get-Content $sumsFile)) {
    if ($line -match "^([0-9a-fA-F]{64})\s+\*?$([Regex]::Escape($zipName))$") {
      $expected = $Matches[1].ToLowerInvariant()
      break
    }
  }
  if (-not $expected) {
    Remove-Item -Force $zipFile, $sumsFile -ErrorAction SilentlyContinue
    throw "Could not find SHA-256 entry for $zipName in official SHASUMS256.txt"
  }

  $actual = (Get-FileHash -Path $zipFile -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actual -ne $expected) {
    Remove-Item -Force $zipFile, $sumsFile -ErrorAction SilentlyContinue
    throw "SHA-256 mismatch for $zipName (expected $expected, got $actual)"
  }

  $nodeDir = Join-Path $rtDir 'node'
  if (Test-Path $nodeDir) { Remove-Item -Recurse -Force $nodeDir }
  $extTmp = Join-Path $rtDir 'extract_tmp'
  if (Test-Path $extTmp) { Remove-Item -Recurse -Force $extTmp }
  Expand-Archive -Path $zipFile -DestinationPath $extTmp -Force
  $innerNode = Get-ChildItem -Path $extTmp -Directory | Select-Object -First 1
  Move-Item -Path $innerNode.FullName -Destination $nodeDir
  Remove-Item -Recurse -Force $extTmp -ErrorAction SilentlyContinue
  Remove-Item -Force $zipFile, $sumsFile -ErrorAction SilentlyContinue
  return (Join-Path $nodeDir 'node.exe')
}

$targetRepo = Resolve-TargetRepo
$nodeBin = Resolve-NodeBinary $targetRepo
$cliArgs = @('--disable-warning=ExperimentalWarning', (Join-Path $targetRepo 'cli.mjs'), 'install')
if ($env:AGY_LANG) {
  $cliArgs += @('--lang', $env:AGY_LANG)
}
if ($args.Count -gt 0) {
  $cliArgs += $args
}
& $nodeBin @cliArgs
