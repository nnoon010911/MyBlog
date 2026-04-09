param(
    [string]$Message
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $repoRoot

$status = git status --porcelain
if (-not $status) {
    Write-Host "没有可发布的改动。"
    exit 0
}

git add .

if ([string]::IsNullOrWhiteSpace($Message)) {
    $date = Get-Date -Format "yyyy-MM-dd"
    $Message = "docs(blog): 更新 $date 日记"
}

git commit -m $Message
git push origin main

Write-Host "发布完成。"

