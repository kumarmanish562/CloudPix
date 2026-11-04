param([string]$BaseUrl = 'http://localhost:8080/api', [string]$ImagePath = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http
$client = [System.Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromMinutes(3)
$token = $null
$photoIds = @()
$albumId = $null
$refreshToken = $null
function Call-Api([string]$Method, [string]$Path, $Payload = $null, [int]$Expected = 200, [switch]$Anonymous) {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), "$BaseUrl$Path")
    if (-not $Anonymous -and $script:token) { $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $script:token) }
    if ($null -ne $Payload) { $request.Content = [System.Net.Http.StringContent]::new(($Payload | ConvertTo-Json -Depth 8 -Compress), [Text.Encoding]::UTF8, 'application/json') }
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if ([int]$response.StatusCode -ne $Expected) { throw "$Method $Path expected $Expected, received $([int]$response.StatusCode): $body" }
        if ($body) { return ($body | ConvertFrom-Json) }
    } finally { if ($response) { $response.Dispose() }; $request.Dispose() }
}
function Upload-Image([bool]$AllowDuplicate, [int]$Expected) {
    $form = [System.Net.Http.MultipartFormDataContent]::new()
    $content = [System.Net.Http.ByteArrayContent]::new($script:image)
    $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('image/png')
    $form.Add($content, 'file', 'cloudpix-smoke.png')
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Post, "$BaseUrl/photos/upload?allowDuplicate=$($AllowDuplicate.ToString().ToLowerInvariant())")
    $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $script:token)
    $request.Content = $form
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if ([int]$response.StatusCode -ne $Expected) { throw "Upload expected $Expected, received $([int]$response.StatusCode): $body" }
        return ($body | ConvertFrom-Json)
    } finally { if ($response) { $response.Dispose() }; $request.Dispose() }
}
function Download-Bytes([string]$Path) {
    $request = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::Get, "$BaseUrl$Path")
    $request.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $script:token)
    try {
        $response = $client.SendAsync($request).GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) { throw "Download $Path failed: $([int]$response.StatusCode)" }
        return ,$response.Content.ReadAsByteArrayAsync().GetAwaiter().GetResult()
    } finally { if ($response) { $response.Dispose() }; $request.Dispose() }
}
try {
    $script:image = if ($ImagePath) { [IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $ImagePath)) }
        else { [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx5kAAAAASUVORK5CYII=') }
    $email = 'cloudpix-smoke-' + [Guid]::NewGuid().ToString('N') + '@example.com'
    $account = Call-Api POST '/auth/register' @{ email = $email; password = 'SmokePass123!'; displayName = 'CloudPix smoke test' } 201 -Anonymous
    $token = $account.accessToken; $refreshToken = $account.refreshToken
    Call-Api GET '/auth/me' | Out-Null
    Write-Host 'PASS: register and authenticated profile'
    $photo = Upload-Image $false 201
    $photoIds += $photo.id
    Upload-Image $false 409 | Out-Null
    $copy = Upload-Image $true 201
    $photoIds += $copy.id
    if ((Call-Api GET '/photos/duplicates').totalElements -ne 2) { throw 'Duplicate detection failed' }
    Call-Api PATCH "/photos/$($photo.id)" @{ favorite = $true; tags = @('Travel', 'Family') } | Out-Null
    if ((Call-Api GET '/photos?q=travel&favorite=true&tag=family').totalElements -ne 1) { throw 'Search/favorite/tag filtering failed' }
    Call-Api GET '/photos/memories' | Out-Null
    Write-Host 'PASS: upload, duplicate detection, favorites, tags, search, memories API'
    $album = Call-Api POST '/albums' @{ title = 'Smoke test album' } 201
    $albumId = $album.id
    Call-Api POST "/albums/$albumId/photos" @{ photoIds = @($photo.id) } 204
    $share = Call-Api POST "/albums/$albumId/shares" @{ expiresInHours = 1 } 201
    if ((Call-Api GET "/shared/$($share.token)" -Anonymous).photos.totalElements -ne 1) { throw 'Shared album is empty' }
    $original = Download-Bytes "/photos/$($photo.id)/download"
    if ($original.Length -ne $image.Length) { throw 'Original download size does not match the uploaded file' }
    $zip = Download-Bytes "/albums/$albumId/download"
    if ($zip[0] -ne 80 -or $zip[1] -ne 75) { throw 'Album download is not a ZIP' }
    Call-Api DELETE "/albums/$albumId/shares/$($share.id)" -Expected 204
    Call-Api GET "/shared/$($share.token)" -Expected 404 -Anonymous | Out-Null
    Write-Host 'PASS: album membership, anonymous share, original/ZIP downloads, revocation'
    Call-Api POST '/photos/archive' @{ photoIds = @($photo.id) } 204
    Call-Api POST '/photos/restore' @{ photoIds = @($photo.id) } 204
    Call-Api POST '/photos/trash' @{ photoIds = $photoIds } 204
    Call-Api POST '/photos/restore' @{ photoIds = $photoIds } 204
    $rotated = Call-Api POST '/auth/refresh' @{ refreshToken = $refreshToken } 200 -Anonymous
    Call-Api POST '/auth/refresh' @{ refreshToken = $refreshToken } 401 -Anonymous | Out-Null
    $token = $rotated.accessToken; $refreshToken = $rotated.refreshToken
    Write-Host 'PASS: archive, trash, restore, refresh rotation and replay protection'
    Call-Api POST '/photos/trash' @{ photoIds = $photoIds } 204
    Call-Api POST '/photos/delete-permanent' @{ photoIds = $photoIds } 204
    $photoIds = @()
    Call-Api DELETE "/albums/$albumId" -Expected 204
    $albumId = $null
    Call-Api POST '/auth/logout' @{ refreshToken = $refreshToken } 204 -Anonymous
    Call-Api POST '/auth/refresh' @{ refreshToken = $refreshToken } 401 -Anonymous | Out-Null
    $refreshToken = $null
    Write-Host 'PASS: permanent deletion, album cleanup, logout'
    Write-Host "Smoke test passed. Test account: $email (the test account remains; its photos and album were deleted)."
} finally {
    if ($token -and $photoIds.Count) {
        try {
            Call-Api POST '/photos/trash' @{ photoIds = $photoIds } 204
            Call-Api POST '/photos/delete-permanent' @{ photoIds = $photoIds } 204
        } catch { Write-Warning 'Automatic photo cleanup failed; check the smoke-test account.' }
    }
    if ($token -and $albumId) { try { Call-Api DELETE "/albums/$albumId" -Expected 204 } catch { Write-Warning 'Automatic album cleanup failed.' } }
    if ($refreshToken) { try { Call-Api POST '/auth/logout' @{ refreshToken = $refreshToken } 204 -Anonymous } catch {} }
    $client.Dispose()
}

