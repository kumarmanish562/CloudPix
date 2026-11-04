param(
    [string]$EnvFile = '',
    [string]$MavenRepository = (Join-Path $env:USERPROFILE '.m2/repository')
)
$ErrorActionPreference = 'Stop'
$backend = Join-Path (Split-Path $PSScriptRoot -Parent) 'CloudPix-backend'
if (-not $EnvFile) { $EnvFile = Join-Path $backend '.env' }
if (Test-Path -LiteralPath $EnvFile) {
    foreach ($line in Get-Content -LiteralPath $EnvFile) {
        if ($line -match '^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$') {
            $name = $Matches[1]; $value = $Matches[2].Trim()
            if ($name -notmatch '^(DB_|JWT_|IMAGEKIT_|CORS_ALLOWED_ORIGINS$)') { continue }
            if ($value.Length -ge 2 -and (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            # Values are literal; never execute or expand .env contents. Existing process values take precedence.
            if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
                [Environment]::SetEnvironmentVariable($name, $value, 'Process')
            }
        }
    }
}
foreach ($name in @('DB_USERNAME', 'DB_PASSWORD', 'JWT_SECRET', 'IMAGEKIT_PUBLIC_KEY', 'IMAGEKIT_PRIVATE_KEY', 'IMAGEKIT_URL_ENDPOINT')) {
    if (-not [Environment]::GetEnvironmentVariable($name, 'Process')) {
        throw "$name is missing. Fill CloudPix-backend/.env from .env.example or set it in the process environment."
    }
}
Push-Location $backend
try {
    & .\mvnw.cmd "-Dmaven.repo.local=$MavenRepository" spring-boot:run
    if ($LASTEXITCODE -ne 0) { throw 'CloudPix backend exited with an error.' }
} finally { Pop-Location }

