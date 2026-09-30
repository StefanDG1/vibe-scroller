$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$request = [Console]::In.ReadToEnd() | ConvertFrom-Json
if ($request.data.Length -gt 2000000) { throw 'Invalid storage request.' }
$bytes = [Convert]::FromBase64String($request.data)
$entropy = [Text.Encoding]::UTF8.GetBytes('VibeScroller.ChatGPT.v1')
try {
  switch ($request.operation) {
    'protect' { $result = [Security.Cryptography.ProtectedData]::Protect($bytes, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser) }
    'unprotect' { $result = [Security.Cryptography.ProtectedData]::Unprotect($bytes, $entropy, [Security.Cryptography.DataProtectionScope]::CurrentUser) }
    default { throw 'Invalid storage operation.' }
  }
  [Console]::Out.Write([Convert]::ToBase64String($result))
} finally { [Array]::Clear($bytes, 0, $bytes.Length); if ($result) { [Array]::Clear($result, 0, $result.Length) } }
