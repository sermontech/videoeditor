# Run from PowerShell; the key is prompted securely, never written to disk.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 22 LTS first.' }
if (-not (Test-Path 'node_modules/@supabase/supabase-js')) { throw 'Run npm ci first.' }
if (-not $env:PYTHON) { $env:PYTHON = 'python' }
$env:PYTHONPATH = Join-Path (Get-Location) '.tools/python'
& $env:PYTHON -c "import PIL, imageio_ffmpeg, subprocess; subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-version'], check=True, stdout=subprocess.DEVNULL); print('Python, Pillow and FFmpeg checks passed.')"
if ($LASTEXITCODE -ne 0) { throw 'Renderer check failed. Run npm run setup:render first.' }
if (-not $env:CREATOR_FONT -and -not (Test-Path 'C:/Windows/Fonts/arialbd.ttf')) { throw 'Set CREATOR_FONT to the full path of a bold TrueType font.' }
$env:CREATOR_MODE = 'cloud'
$env:NODE_ENV = 'production'
$env:SUPABASE_URL = 'https://krkbcojvfmqrwvudntvq.supabase.co'
$secret = Read-Host 'Supabase secret / service_role key (hidden; not saved)' -AsSecureString
$ptr = [IntPtr]::Zero
try {
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
    $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    if ([string]::IsNullOrWhiteSpace($env:SUPABASE_SERVICE_ROLE_KEY)) { throw 'A worker key is required.' }
    Write-Host 'Keep this window open and the computer awake. Press Ctrl+C to stop.'
    & node server/worker.mjs
} finally {
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
    if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    $secret.Dispose()
}
