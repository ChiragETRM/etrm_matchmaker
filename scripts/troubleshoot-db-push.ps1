# Run this script to troubleshoot "Can't reach database server" for prisma db push.
# For firewall changes: Run PowerShell as Administrator (right-click -> Run as administrator).

$hostName = "db.cmwcogsixtdtyibpalzr.supabase.co"
$port = 5432

Write-Host "`n=== 1. DNS resolution (IPv4 vs IPv6) ===" -ForegroundColor Cyan
$ipv4 = (Resolve-DnsName $hostName -Type A -ErrorAction SilentlyContinue).IPAddress
$ipv6 = (Resolve-DnsName $hostName -Type AAAA -ErrorAction SilentlyContinue).IPAddress
if ($ipv4) { Write-Host "  IPv4: $ipv4" -ForegroundColor Green } else { Write-Host "  IPv4: (none)" -ForegroundColor Yellow }
if ($ipv6) { Write-Host "  IPv6: $ipv6" -ForegroundColor Green } else { Write-Host "  IPv6: (none)" -ForegroundColor Yellow }

if (-not $ipv4 -and $ipv6) {
    Write-Host "`n  >>> Supabase direct DB is IPv6-only. Many home networks don't have IPv6." -ForegroundColor Yellow
    Write-Host "  >>> Fix: Supabase Dashboard -> Project Settings -> Database -> enable 'IPv4 add-on' (if available)." -ForegroundColor Yellow
    Write-Host "  >>> Or use SQL Editor + prisma/supabase-init.sql instead of prisma db push.`n" -ForegroundColor Yellow
}

Write-Host "`n=== 2. Firewall rule (outbound TCP $port) ===" -ForegroundColor Cyan
$ruleName = "Allow Outbound PostgreSQL 5432"
$existing = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "  Rule '$ruleName' already exists." -ForegroundColor Green
} else {
    try {
        New-NetFirewallRule -DisplayName $ruleName -Direction Outbound -Protocol TCP -RemotePort $port -Action Allow -ErrorAction Stop
        Write-Host "  Rule added successfully." -ForegroundColor Green
    } catch {
        Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  >>> Run PowerShell as Administrator and run this script again.`n" -ForegroundColor Yellow
    }
}

Write-Host "`n=== 3. Connectivity test (port $port) ===" -ForegroundColor Cyan
$result = Test-NetConnection -ComputerName $hostName -Port $port -WarningAction SilentlyContinue
if ($result.TcpTestSucceeded) {
    Write-Host "  Connection OK. Try: npx prisma db push" -ForegroundColor Green
} else {
    Write-Host "  Connection failed (timeout or refused)." -ForegroundColor Red
    Write-Host "  >>> Try: VPN off; different network (e.g. phone hotspot); Supabase IPv4 add-on; or use SQL Editor.`n" -ForegroundColor Yellow
}

Write-Host ""
