# 通过 COM 驱动正在运行的 Photoshop 执行 PsdSlim.jsx（静默模式）
# 用法: powershell -ExecutionPolicy Bypass -File run_via_com.ps1
$ErrorActionPreference = 'Stop'

# 附着到正在运行的 PS 实例（不会新开一个）
try {
    $ps = [Runtime.InteropServices.Marshal]::GetActiveObject("Photoshop.Application")
} catch {
    Write-Output "ERROR: 没找到正在运行的 Photoshop 实例"
    exit 1
}

$ver = $ps.Version
Write-Output ("attached: Photoshop " + $ver)

# 确认活动文档
$docName = $ps.ActiveDocument.Name
Write-Output ("active document: " + $docName)
if ($docName -ne "独角兽.psd") {
    Write-Output "ERROR: 活动文档不是 独角兽.psd，为安全起见中止。请在 PS 里切到该文档再运行。"
    exit 2
}

$jsx = @'
var PSDSLIM_OVERRIDE = { silent: true };
$.evalFile(File("C:/WorkSpace/AI/tools/psd-slim/PsdSlim.jsx"));
"done";
'@

Write-Output "running PsdSlim (silent)... 期间 PS 会无响应，属正常"
$sw = [Diagnostics.Stopwatch]::StartNew()
$r = $ps.DoJavaScript($jsx)
$sw.Stop()
Write-Output ("finished in " + [int]$sw.Elapsed.TotalSeconds + "s, result: " + $r)
