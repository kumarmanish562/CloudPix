param(
    [switch]$Postgres,
    [string]$MavenRepository = (Join-Path $env:USERPROFILE '.m2/repository'),
    [string]$DockerConfig = ''
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$backend = Join-Path $projectRoot 'CloudPix-backend'
$databaseVariables = @('TEST_DB_URL', 'TEST_DB_USERNAME', 'TEST_DB_PASSWORD')
$previous = @{}
foreach ($name in $databaseVariables) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
$containerId = $null
$dockerOptions = @()
if ($DockerConfig) { $dockerOptions = @('--config', $DockerConfig) }
try {
    if ($Postgres) {
        $containerName = 'cloudpix-tests-' + [Guid]::NewGuid().ToString('N').Substring(0, 10)
        $containerId = & docker @dockerOptions run --rm -d --name $containerName --label com.cloudpix.purpose=integration-tests -e POSTGRES_DB=cloudpix_test -e POSTGRES_USER=cloudpix_test -e POSTGRES_PASSWORD=cloudpix_test_only -p 127.0.0.1::5432 --tmpfs /var/lib/postgresql/data postgres:16-alpine
        if ($LASTEXITCODE -ne 0) { $containerId = $null; throw 'Could not start the disposable PostgreSQL container.' }
        $containerId = $containerId.Trim()
        $ready = $false
        for ($attempt = 0; $attempt -lt 60; $attempt++) {
            & docker @dockerOptions exec $containerId pg_isready -U cloudpix_test -d cloudpix_test *> $null
            if ($LASTEXITCODE -eq 0) { $ready = $true; break }
            Start-Sleep -Seconds 1
        }
        if (-not $ready) { throw 'PostgreSQL did not become ready.' }
        $binding = & docker @dockerOptions port $containerId 5432/tcp
        if ($LASTEXITCODE -ne 0 -or $binding -notmatch ':(\d+)$') { throw 'Could not determine the test database port.' }
        $port = $Matches[1]
        $env:TEST_DB_URL = "jdbc:postgresql://localhost:$port/cloudpix_test"
        $env:TEST_DB_USERNAME = 'cloudpix_test'
        $env:TEST_DB_PASSWORD = 'cloudpix_test_only'
        Write-Host "Running against disposable PostgreSQL on port $port"
    } else {
        $env:TEST_DB_URL = 'jdbc:h2:mem:cloudpix;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1;DEFAULT_NULL_ORDERING=HIGH'
        $env:TEST_DB_USERNAME = 'sa'
        $env:TEST_DB_PASSWORD = ''
        Write-Host 'Running against isolated in-memory H2'
    }
    Push-Location $backend
    try {
        & .\mvnw.cmd "-Dmaven.repo.local=$MavenRepository" '-Dstyle.color=never' test
        if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed. See CloudPix-backend/target/surefire-reports.' }
        Write-Host "Coverage report: $(Join-Path $backend 'target/site/jacoco/index.html')"
    } finally { Pop-Location }
} finally {
    if ($containerId) { & docker @dockerOptions stop $containerId | Out-Null }
    foreach ($name in $databaseVariables) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
}

