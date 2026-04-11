# flag-memory-update.ps1
# Stop hook — writes a .memory-pending sentinel file so the next SessionStart
# knows to remind the agent to run the auto-memory skill if any new
# patterns or rules were discussed during the session that ended.

$root = Split-Path -Parent $PSScriptRoot   # .copilot root
$pendingFlag = Join-Path $root ".memory-pending"

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Set-Content -Path $pendingFlag -Value $timestamp -Encoding UTF8

exit 0