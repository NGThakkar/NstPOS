# inject-memory.ps1
# SessionStart hook — if the previous session flagged a memory update,
# remind the agent/user to review and update memory.md, then clear the flag.

$root = Split-Path -Parent $PSScriptRoot   # .github
$pendingFlag = Join-Path $root ".memory-pending"
$repoRoot = Split-Path -Parent $root
$memoryPath = Join-Path $repoRoot "memory.md"

if (Test-Path $pendingFlag) {
	$timestamp = ""
	try {
		$timestamp = (Get-Content -Path $pendingFlag -ErrorAction Stop | Select-Object -First 1).Trim()
	}
	catch {
		$timestamp = ""
	}

	if ([string]::IsNullOrWhiteSpace($timestamp)) {
		Write-Host "[auto-memory] Reminder: Review and update memory.md with any new project rules or decisions from the previous session."
	}
	else {
		Write-Host "[auto-memory] Reminder: Pending memory update from $timestamp. Review and update memory.md with any new project rules or decisions."
	}

	if (Test-Path $memoryPath) {
		Write-Host "[auto-memory] Source of truth: $memoryPath"
	}

	Remove-Item -Path $pendingFlag -Force -ErrorAction SilentlyContinue
}

exit 0