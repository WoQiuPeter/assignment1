param(
    [Parameter(Mandatory = $true)]
    [string]$RepoUrl
)
$ErrorActionPreference = 'Stop'
if ($RepoUrl -notmatch '^https://github\.com/[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9_.-]+\.git$' -or
    $RepoUrl -match 'YOUR_|pobengtsson/bth012-a1-part-a') {
    throw 'Supply your own real public GitHub HTTPS clone URL ending in .git.'
}
$projectDirectory = Split-Path -Parent $PSScriptRoot
$dockerPath = Join-Path $projectDirectory 'Dockerfile'
$content = [System.IO.File]::ReadAllText($dockerPath)
if ($content -notmatch '(?m)^ARG REPO_URL=.+$') {
    throw 'ARG REPO_URL was not found in Dockerfile.'
}
$updated = [regex]::Replace($content, '(?m)^ARG REPO_URL=.+$', "ARG REPO_URL=$RepoUrl")
[System.IO.File]::WriteAllText($dockerPath, $updated, [System.Text.UTF8Encoding]::new($false))
Write-Output "Dockerfile updated: $RepoUrl"
Write-Output 'Commit and push all files before building the course Dockerfile.'
