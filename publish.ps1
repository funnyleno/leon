param(
    [string]$RepoUrl = "https://github.com/funnyleno/leon.git",
    [string]$Branch  = "main",
    [string]$CommitMessage = ""
)

$ErrorActionPreference = 'Stop'

function Write-Info($Message){
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-WarnMessage($Message){
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Ensure-GitInstalled{
    if(Get-Command git -ErrorAction SilentlyContinue){
        return
    }

    Write-Info 'Git is not installed. Installing via winget...'

    if(-not (Get-Command winget -ErrorAction SilentlyContinue)){
        throw "winget not found. Install Git manually from https://git-scm.com and rerun."
    }

    winget install --id Git.Git -e --source winget

    if(-not (Get-Command git -ErrorAction SilentlyContinue)){
        throw "Git installation failed. Install manually and try again."
    }

    Write-Info 'Git installation complete.'
}

function Ensure-Location{
    $scriptPath = $MyInvocation.MyCommand.Path
    if([string]::IsNullOrWhiteSpace($scriptPath)){
        Write-Info "Working directory: $(Get-Location)"
        return
    }

    $scriptRoot = Split-Path -Parent $scriptPath
    if([string]::IsNullOrWhiteSpace($scriptRoot)){
        Write-Info "Working directory: $(Get-Location)"
        return
    }

    Set-Location -Path $scriptRoot
    Write-Info "Working directory: $(Get-Location)"
}

function Ensure-Repository{
    if(Test-Path -Path '.git'){
        Write-Info 'Existing Git repository detected.'
        return
    }

    Write-Info 'Initializing Git repository...'
    git init | Out-Null
    Write-Info 'Git repository initialized.'
}

function Ensure-GitIdentity{
    $name = git config user.name
    $email = git config user.email

    if(-not $name){
        $name = Read-Host 'Enter Git user.name'
        if($name){ git config user.name $name }
    }

    if(-not $email){
        $email = Read-Host 'Enter Git user.email'
        if($email){ git config user.email $email }
    }
}

function Ensure-Remote($Url){
    try{
        $current = git remote get-url origin 2>$null
    }catch{
        $current = $null
    }

    if($current){
        if($current -ne $Url){
            Write-WarnMessage "origin already points to $current. Use 'git remote set-url origin $Url' if you need to change it."
        }else{
            Write-Info 'Remote origin already configured.'
        }
        return
    }

    Write-Info "Adding remote origin: $Url"
    git remote add origin $Url
}

function Stage-And-Commit{
    git add .

    $status = git status --porcelain
    if([string]::IsNullOrWhiteSpace($status)){
        Write-Info 'No changes to commit.'
        return $false
    }

    $msg = $CommitMessage
    if([string]::IsNullOrWhiteSpace($msg)){
        try {
            $inputMsg = Read-Host 'Commit message (default: Auto publish)'
            if(-not [string]::IsNullOrWhiteSpace($inputMsg)){
                $msg = $inputMsg
            }
        } catch {
            # Ignore error in non-interactive mode
        }
    }

    if([string]::IsNullOrWhiteSpace($msg)){
        $msg = "Auto publish $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    }

    git commit -m $msg | Out-Null
    Write-Info "Commit created: $msg"
    return $true
}

function Push-Repository($BranchName){
    Write-Info "Pushing to origin/$BranchName ..."
    git push -u origin $BranchName
    Write-Info 'Push complete. Enter GitHub username + PAT when prompted.'
}

try{
    Ensure-GitInstalled
    Ensure-Location
    Ensure-Repository
    Ensure-GitIdentity
    Ensure-Remote -Url $RepoUrl
    $committed = Stage-And-Commit
    if($committed){
        Push-Repository -BranchName $Branch
    }else{
        Write-Info 'Nothing to push. Modify files and rerun if needed.'
    }

    Write-Host "==============================" -ForegroundColor Green
    Write-Host "Deploy steps completed." -ForegroundColor Green
    Write-Host "1. Enable GitHub Pages under Settings → Pages." -ForegroundColor Green
    Write-Host "2. After Pages builds, use the published URL for sharing." -ForegroundColor Green
    Write-Host "3. Keep your GitHub PAT private; regenerate if exposed." -ForegroundColor Green
    Write-Host "==============================" -ForegroundColor Green
}catch{
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
