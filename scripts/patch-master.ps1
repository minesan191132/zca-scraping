# Áp bản vá (danh sách ô -> giá trị số) lên MỘT file xlsx/xlsm bằng Excel COM. Chỉ đặt Value2 của từng ô nên công thức, hình, định dạng giữ nguyên.
# Dùng một instance Excel RIÊNG (không đụng Excel người dùng đang mở). PID của instance lấy từ cửa sổ chính của nó ($xl.Hwnd), KHÔNG suy ra từ "tiến trình Excel mới xuất hiện"
# (khi đó một Excel khác khởi động cùng lúc, như bot:total, có thể bị tính nhầm). PID ghi vào "<Log>.pid" ngay khi có, để bên gọi dọn được nếu script bị giết giữa chừng.
param([string]$Spec, [string]$Log)
$ErrorActionPreference = "Stop"
# Tên biến khác tham số: PowerShell không phân biệt hoa thường nên $spec sẽ bị ép về chuỗi theo kiểu của $Spec.
$job = Get-Content $Spec -Raw -Encoding UTF8 | ConvertFrom-Json
Add-Type -Namespace ZcaWin -Name User32 -MemberDefinition '[DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);'
$xl = $null; $wb = $null; $xlPid = [uint32]0
$pidFile = "$Log.pid"
try {
    $xl = New-Object -ComObject Excel.Application
    $xl.Visible = $false
    $xl.DisplayAlerts = $false
    $xl.AutomationSecurity = 3   # msoAutomationSecurityForceDisable: không chạy macro khi mở
    [void][ZcaWin.User32]::GetWindowThreadProcessId([IntPtr]$xl.Hwnd, [ref]$xlPid)
    if ($xlPid -ne 0) { "$xlPid" | Set-Content $pidFile -Encoding ASCII }
    $wb = $xl.Workbooks.Open($job.file, 0, $false)
    foreach ($c in $job.cells) {
        $wb.Worksheets.Item($c.sheet).Range($c.cell).Value2 = [double]$c.value
    }
    $wb.Save()
    $wb.Close($false)
    "da ghi $(@($job.cells).Count) o vao $($job.file)" | Set-Content $Log -Encoding UTF8
}
finally {
    if ($wb -ne $null) { try { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wb) } catch {} }
    if ($xl -ne $null) {
        try { $xl.Quit() } catch {}
        [void][Runtime.InteropServices.Marshal]::ReleaseComObject($xl)
    }
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
    # Chỉ giết đúng instance của mình, và chỉ khi nó còn sống sau khi đã Quit.
    if ($xlPid -ne 0) {
        Start-Sleep -Milliseconds 500
        if (Get-Process -Id $xlPid -ErrorAction SilentlyContinue) { Stop-Process -Id $xlPid -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
}
