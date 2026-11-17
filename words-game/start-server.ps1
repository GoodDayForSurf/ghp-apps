# Запуск сервера «Словарь».
# Открывает порт в брандмауэре Windows для устройств локальной сети
# и запускает node server.js. Если прав администратора нет, скрипт сам
# перезапускается с запросом повышения прав (окно UAC).
#
#   .\start-server.ps1              порт 80
#   .\start-server.ps1 -Port 3000   другой порт
#   .\start-server.ps1 -NoElevate   без администратора и без брандмауэра

param(
  [int]$Port = $(if ($env:PORT) { [int]$env:PORT } else { 80 }),
  [switch]$NoElevate
)

function Wait-AndExit([int]$code) {
  Write-Host ''
  try { Read-Host 'Нажмите Enter, чтобы закрыть окно' | Out-Null } catch {}
  exit $code
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = ([Security.Principal.WindowsPrincipal]$identity).IsInRole(
  [Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin -and -not $NoElevate) {
  try {
    Start-Process powershell.exe -Verb RunAs -ArgumentList @(
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', "`"$PSCommandPath`"", '-Port', $Port
    )
    exit 0
  } catch {
    Write-Warning 'Права администратора не получены — брандмауэр не настраивается.'
  }
}

Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host 'Node.js не найден. Установите Node.js или добавьте его в PATH.' -ForegroundColor Red
  Wait-AndExit 1
}

$busy = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1
if ($busy) {
  $owner = Get-Process -Id $busy.OwningProcess -ErrorAction SilentlyContinue
  $name = if ($owner) { "$($owner.ProcessName), PID $($owner.Id)" } else { "PID $($busy.OwningProcess)" }
  Write-Host "Порт $Port уже занят ($name)." -ForegroundColor Red
  Write-Host 'Остановите эту программу (например, прежний сервер) и запустите скрипт снова.'
  Wait-AndExit 1
}

if ($isAdmin) {
  $rule = "Slovoboy $Port"
  if (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue) {
    Write-Host "Правило брандмауэра «$rule» уже есть."
  } else {
    try {
      New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP `
        -LocalPort $Port -RemoteAddress LocalSubnet -Action Allow -ErrorAction Stop | Out-Null
      Write-Host "Добавлено правило брандмауэра «$rule» (только локальная сеть)."
    } catch {
      Write-Warning "Не удалось добавить правило брандмауэра: $($_.Exception.Message)"
    }
  }
} else {
  Write-Warning 'Запуск без прав администратора: с других устройств сервер может быть недоступен.'
}

Write-Host ''
$env:PORT = "$Port"
node server.js

Write-Host ''
Write-Host 'Сервер остановлен.'
Wait-AndExit 0
