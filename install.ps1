# antigravity-langpack one-line & local installer for Windows PowerShell
# Usage: irm https://raw.githubusercontent.com/CHANPAJN/antigravity-langpack/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'

$RepoUrl = 'https://github.com/CHANPAJN/antigravity-langpack.git'
$ZipUrl = 'https://codeload.github.com/CHANPAJN/antigravity-langpack/zip/refs/heads/main'
$InstallDir = if ($env:AGY_LANGPACK_HOME) { $env:AGY_LANGPACK_HOME } else { Join-Path $HOME '.antigravity-langpack' }
$NodeVersion = 'v22.14.0'

function Test-NodeVersionOk([string]$NodeExe) {
  if (-not $NodeExe) { return $false }
  if (-not (Test-Path -LiteralPath $NodeExe -PathType Leaf)) { return $false }
  $prevEap = $ErrorActionPreference
  try {
    $ErrorActionPreference = 'Continue'
    $global:LASTEXITCODE = 0
    $verOut = & $NodeExe -v 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $verOut) { return $false }
    $verStr = ([string]($verOut | Out-String)).Trim()
    if ($verStr -match '^v?(\d+)\.(\d+)') {
      $maj = [int]$Matches[1]
      $min = [int]$Matches[2]
      return ($maj -gt 22 -or ($maj -eq 22 -and $min -ge 13))
    }
    return $false
  } catch {
    return $false
  } finally {
    $ErrorActionPreference = $prevEap
  }
}

function Resolve-TargetRepo {
  if ($PSScriptRoot -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'cli.mjs')) -and (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'dict'))) {
    return $PSScriptRoot
  }
  $cwd = (Get-Location).Path
  if ((Test-Path -LiteralPath (Join-Path $cwd 'cli.mjs')) -and (Test-Path -LiteralPath (Join-Path $cwd 'dict'))) {
    return $cwd
  }

  Write-Host "[antigravity-langpack] Preparing repository in $InstallDir ..."
  if (Test-Path -LiteralPath (Join-Path $InstallDir '.git')) {
    $prevEap = $ErrorActionPreference
    try {
      $ErrorActionPreference = 'Continue'
      & git -C $InstallDir pull --ff-only *>$null
    } catch {} finally {
      $ErrorActionPreference = $prevEap
    }
    return $InstallDir
  }

  if (Get-Command git -ErrorAction SilentlyContinue) {
    if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
    & git clone --depth 1 $RepoUrl $InstallDir
    if ($LASTEXITCODE -ne 0) { throw "git clone failed with exit code $LASTEXITCODE" }
    return $InstallDir
  }

  if (Test-Path -LiteralPath $InstallDir) { Remove-Item -LiteralPath $InstallDir -Recurse -Force }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $tmpZip = Join-Path ([System.IO.Path]::GetTempPath()) ("agy-langpack-" + [Guid]::NewGuid().ToString('N') + ".zip")
  $tmpExtract = Join-Path ([System.IO.Path]::GetTempPath()) ("agy-langpack-ext-" + [Guid]::NewGuid().ToString('N'))
  $prevProg = $ProgressPreference
  try {
    $ProgressPreference = 'SilentlyContinue'
    Invoke-WebRequest -Uri $ZipUrl -OutFile $tmpZip -UseBasicParsing
    Expand-Archive -LiteralPath $tmpZip -DestinationPath $tmpExtract -Force
    $inner = Get-ChildItem -LiteralPath $tmpExtract -Directory | Select-Object -First 1
    Copy-Item -Path (Join-Path $inner.FullName '*') -Destination $InstallDir -Recurse -Force
  } finally {
    $ProgressPreference = $prevProg
    Remove-Item -LiteralPath $tmpZip -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue
  }
  return $InstallDir
}

function Resolve-NodeBinary([string]$RepoDir) {
  $candidates = @()
  $sysNode = Get-Command node -ErrorAction SilentlyContinue
  if ($sysNode -and $sysNode.Source) { $candidates += $sysNode.Source }
  if ($env:ProgramFiles) { $candidates += (Join-Path $env:ProgramFiles 'nodejs\node.exe') }
  if ($env:LOCALAPPDATA) { $candidates += (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe') }
  $candidates += (Join-Path $RepoDir '.runtime\node\node.exe')

  foreach ($cand in ($candidates | Select-Object -Unique)) {
    if (Test-NodeVersionOk $cand) {
      return $cand
    }
  }

  $arch = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64') { 'arm64' } else { 'x64' }
  $zipName = "node-$NodeVersion-win-$arch.zip"
  $baseUrl = "https://nodejs.org/dist/$NodeVersion"
  $rtDir = Join-Path $RepoDir '.runtime'
  New-Item -ItemType Directory -Force -Path $rtDir | Out-Null
  $zipFile = Join-Path $rtDir $zipName
  $sumsFile = Join-Path $rtDir 'SHASUMS256.txt'
  $extTmp = Join-Path $rtDir 'extract_tmp'

  Remove-Item -LiteralPath $zipFile, $sumsFile -Force -ErrorAction SilentlyContinue
  if (Test-Path -LiteralPath $extTmp) { Remove-Item -LiteralPath $extTmp -Recurse -Force -ErrorAction SilentlyContinue }

  $prevProg = $ProgressPreference
  try {
    $ProgressPreference = 'SilentlyContinue'
    Write-Host "[antigravity-langpack] Node.js >= 22.13 not found in PATH; downloading official $zipName (SHA-256 verified) ..."
    Invoke-WebRequest -Uri "$baseUrl/SHASUMS256.txt" -OutFile $sumsFile -UseBasicParsing
    Invoke-WebRequest -Uri "$baseUrl/$zipName" -OutFile $zipFile -UseBasicParsing

    $expected = $null
    foreach ($line in (Get-Content -LiteralPath $sumsFile)) {
      if ($line -match "^([0-9a-fA-F]{64})\s+\*?$([Regex]::Escape($zipName))$") {
        $expected = $Matches[1].ToLowerInvariant()
        break
      }
    }
    if (-not $expected) {
      throw "Could not find SHA-256 entry for $zipName in official SHASUMS256.txt"
    }

    $actual = (Get-FileHash -LiteralPath $zipFile -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) {
      throw "SHA-256 mismatch for $zipName (expected $expected, got $actual)"
    }

    $nodeDir = Join-Path $rtDir 'node'
    if (Test-Path -LiteralPath $nodeDir) { Remove-Item -LiteralPath $nodeDir -Recurse -Force }
    Expand-Archive -LiteralPath $zipFile -DestinationPath $extTmp -Force
    $innerNode = Get-ChildItem -LiteralPath $extTmp -Directory | Select-Object -First 1
    Move-Item -LiteralPath $innerNode.FullName -Destination $nodeDir
    return (Join-Path $nodeDir 'node.exe')
  } finally {
    $ProgressPreference = $prevProg
    Remove-Item -LiteralPath $zipFile, $sumsFile -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $extTmp) { Remove-Item -LiteralPath $extTmp -Recurse -Force -ErrorAction SilentlyContinue }
  }
}

if ($env:AGY_INSTALLER_IMPORT_ONLY -ne '1') {
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
}
