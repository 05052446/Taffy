$desktop = [Environment]::GetFolderPath("Desktop")
$targetDir = "C:\Users\54185\Desktop\雏草姬"
$exePath = Join-Path $targetDir "node_modules\electron\dist\electron.exe"
$iconPath = Join-Path $targetDir "assets\icon.ico"
$lnkPath = Join-Path $desktop "永雏塔菲桌宠.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($lnkPath)
$Shortcut.TargetPath = $exePath
$Shortcut.Arguments = "."
$Shortcut.WorkingDirectory = $targetDir
$Shortcut.IconLocation = "$iconPath,0"
$Shortcut.Description = "永雏塔菲桌宠"
$Shortcut.Save()
Write-Host "Shortcut generated at $lnkPath"
