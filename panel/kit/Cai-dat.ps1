param(
    # Không hỏi gì, không cài phần mềm, không mở Notepad: dùng khi chạy tự động hoặc để thử.
    [switch]$NoPrompt,
    # Bỏ qua `npm install` (khi đã cài rồi).
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
# Chữ tiếng Việt trong cửa sổ lệnh (Cai-dat.cmd đã chuyển sang trang mã 65001).
[Console]::OutputEncoding = [Text.Encoding]::UTF8
$kit = Split-Path -Parent $MyInvocation.MyCommand.Path
$project = Join-Path $kit 'zca-scrape-message'
$appExe = Join-Path $kit 'Zalo Bots\zalo-bots.exe'
$problems = New-Object System.Collections.Generic.List[string]

function Step($n, $text) { Write-Host ''; Write-Host "[$n] $text" -ForegroundColor Cyan }
function Ok($text) { Write-Host "    OK  $text" -ForegroundColor Green }
function Warn($text) { Write-Host "    !!  $text" -ForegroundColor Yellow; $script:problems.Add($text) }
function Ask($question) {
    if ($NoPrompt) { return $false }
    return (Read-Host "    $question (Y/N)") -match '^[Yy]'
}

Write-Host '=== Cài đặt gói triển khai Zalo Bots ===' -ForegroundColor White
Write-Host "Thư mục gói: $kit"

# 1. Node.js
Step 1 'Kiểm tra Node.js 22 trở lên'
function Test-Node {
    try {
        $v = (& node -v) 2>$null
        if ($v -match '^v(\d+)\.' -and [int]$Matches[1] -ge 22) { return $v }
    } catch { }
    return $null
}
$node = Test-Node
if (-not $node) {
    Warn 'Chưa có Node.js 22 trở lên.'
    if (Ask 'Cài Node.js LTS bằng winget') {
        winget install --id OpenJS.NodeJS.LTS -e --accept-package-agreements --accept-source-agreements
        $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
        $node = Test-Node
    }
}
if (-not $node) {
    Write-Host ''
    Write-Host 'Cần cài Node.js 22 trở lên (https://nodejs.org/) rồi chạy lại Cai-dat.cmd.' -ForegroundColor Red
    exit 1
}
Ok "Node $node"

# 2. Thư viện của bot
Step 2 'Cài thư viện cho bot (npm install, cần mạng, vài phút)'
if (-not (Test-Path (Join-Path $project 'package.json'))) {
    Write-Host "Không thấy $project. Gói bị thiếu file, hãy giải nén lại." -ForegroundColor Red
    exit 1
}
Push-Location $project
try {
    if ($SkipInstall -and (Test-Path 'node_modules')) {
        Ok 'Bỏ qua, đã có node_modules'
    } else {
        npm install --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw "npm install lỗi (mã $LASTEXITCODE)" }
        Ok 'Đã cài xong thư viện'
    }

    # 3. Khóa OpenRouter
    Step 3 'Tạo file .env (khóa OpenRouter để đọc ảnh)'
    if (-not (Test-Path '.env')) {
        Copy-Item '.env.example' '.env'
        Ok 'Đã tạo .env từ .env.example'
    } else {
        Ok 'Đã có .env, giữ nguyên'
    }
    if (-not $NoPrompt) {
        $key = Read-Host '    Dán khóa OPENROUTER_API_KEY (Enter để bỏ qua, điền sau trong .env)'
        if ($key) {
            $text = Get-Content '.env' -Raw
            if ($text -match '(?m)^OPENROUTER_API_KEY=') {
                $text = [regex]::Replace($text, '(?m)^OPENROUTER_API_KEY=.*$', "OPENROUTER_API_KEY=$key")
            } else {
                $text = $text.TrimEnd() + "`r`nOPENROUTER_API_KEY=$key`r`n"
            }
            [IO.File]::WriteAllText((Join-Path $project '.env'), $text, (New-Object Text.UTF8Encoding($false)))
            Ok 'Đã ghi khóa vào .env'
        } else {
            Warn 'Chưa có khóa OpenRouter: bot vẫn chạy nhưng không đọc được ảnh nghỉ phép. Điền sau trong zca-scrape-message\.env.'
        }
    }

    # 4. Kiểm tra dự án chạy được
    Step 4 'Kiểm tra dự án bot chạy được'
    $dump = (npm run -s config:dump) 2>&1 | Out-String
    if ($dump -match '@@JSON@@') { Ok 'Đọc được cấu hình (config.ts hợp lệ)' }
    else { Warn "Không đọc được config.ts: $($dump.Trim())" }
    if (Test-Path 'data\mau bao cao new\*.xlsx') { Ok 'Có mẫu Excel trong data\mau bao cao new' }
    else { Warn 'Thiếu mẫu Excel trong data\mau bao cao new: không dựng được báo cáo.' }
} finally {
    Pop-Location
}

# 5. Phần mềm ngoài gói
Step 5 'Kiểm tra phần mềm cần có sẵn trên máy'
$zalo = Get-ChildItem (Join-Path $env:LOCALAPPDATA 'Programs\Zalo') -Filter 'Zalo.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
if ($zalo) { Ok "Zalo Desktop: $($zalo.FullName)" }
else { Warn 'Chưa thấy Zalo Desktop. Cài và đăng nhập tài khoản cần lấy dữ liệu (nếu cài chỗ khác, đặt zaloExePath trong config.ts).' }
if (Test-Path 'Registry::HKEY_CLASSES_ROOT\Excel.Application') { Ok 'Microsoft Excel' }
else { Warn 'Chưa thấy Microsoft Excel: báo cáo được dựng bằng Excel.' }

# 6. Lối tắt
Step 6 'Tạo lối tắt trên màn hình nền'
if (Test-Path $appExe) {
    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Zalo Bots.lnk'))
    $link.TargetPath = $appExe
    $link.WorkingDirectory = Split-Path $appExe
    $link.Save()
    Ok 'Đã tạo lối tắt Zalo Bots'
} else {
    Warn "Không thấy $appExe."
}

# 7. Tổng kết
Write-Host ''
Write-Host '=== Xong ===' -ForegroundColor White
if ($problems.Count -gt 0) {
    Write-Host 'Còn việc cần làm:' -ForegroundColor Yellow
    $problems | ForEach-Object { Write-Host "  - $_" -ForegroundColor Yellow }
}
Write-Host ''
Write-Host 'Việc tiếp theo:'
Write-Host '  1. Mở zca-scrape-message\config.ts, sửa targets (tên nhóm Zalo) và reportSets (người phụ trách) cho máy này.'
Write-Host '  2. Mở Zalo Bots (lối tắt trên màn hình nền hoặc "Zalo Bots\zalo-bots.exe"). App tự tìm thấy dự án bot.'
if (-not $NoPrompt -and (Ask 'Mở config.ts bằng Notepad bây giờ')) { Start-Process notepad.exe (Join-Path $project 'config.ts') }
