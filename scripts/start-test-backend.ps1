param(
    [int]$Port = 8088,
    [string]$MavenRepository = (Join-Path $env:USERPROFILE '.m2/repository')
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location (Join-Path $projectRoot 'CloudPix-backend')
try {
    # Explicit CLI datasource options prevent inherited environment variables selecting another database.
    $serverArguments = "--server.port=$Port --spring.datasource.url=jdbc:h2:mem:cloudpix_browser;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1 --spring.datasource.username=sa --spring.datasource.password= --app.cors.allowed-origins=http://localhost:3005 --debug=false"
    & .\mvnw.cmd "-Dmaven.repo.local=$MavenRepository" '-Dspring-boot.run.main-class=com.CoudPix.CloudPix_backend.CloudPixTestServer' "-Dspring-boot.run.arguments=$serverArguments" spring-boot:test-run
    if ($LASTEXITCODE -ne 0) { throw 'The isolated browser-test backend failed to start.' }
} finally { Pop-Location }

