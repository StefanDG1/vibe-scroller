$ErrorActionPreference = 'Stop'
$target = [Uri]([Console]::In.ReadToEnd())
if ($target.Scheme -ne 'https' -or $target.Host -ne 'auth.openai.com' -or $target.AbsolutePath -ne '/api/accounts/authorize') { throw 'Invalid authorization endpoint.' }
Start-Process -FilePath $target.AbsoluteUri -WindowStyle Hidden
