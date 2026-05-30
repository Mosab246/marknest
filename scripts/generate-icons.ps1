# Regenerate app + extension icons from logo/marknestlogo.png (squircle / full icon art)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$LogoPng = Join-Path $Root "logo\marknestlogo.png"
$LogoIco = Join-Path $Root "logo\marknestlogo.ico"
$LogoTransparent = Join-Path $Root "logo\marknestlogo-transparent.png"
$MakeTransparent = Join-Path $Root "scripts\make-transparent-logo.py"
$PngToIco = Join-Path $Root "scripts\png-to-ico.py"

if (-not (Test-Path $LogoPng)) {
    Write-Error "Missing marknestlogo.png in logo folder"
}

Push-Location $Root
try {
    & python (Join-Path $Root "scripts\normalize-logo.py")

    # Dark squircle icons: use file as-is (do not strip light pixels inside the art).
    # Only run white-strip for legacy exports with a plain white/grey fringe.
    $iconSource = $LogoPng
    $corner = & python -c "from PIL import Image; im=Image.open(r'''$LogoPng'''); p=im.getpixel((0,0)); print(sum(p[:3]) if isinstance(p,tuple) else 0)"
    $isLightCorner = [int]$corner -gt 700
    if ($isLightCorner) {
        Write-Host "Light corner detected - stripping export fringe..."
        & python $MakeTransparent
        if (-not (Test-Path $LogoTransparent)) {
            Write-Error "Failed to create transparent PNG. Run: pip install pillow"
        }
        $iconSource = $LogoTransparent
    }
    else {
        Write-Host "Using marknestlogo.png as full icon (dark squircle)"
    }

    Write-Host "Generating Tauri icons..."
    npx tauri icon $iconSource -o src-tauri/icons

    Write-Host "Building marknestlogo.ico for Windows..."
    & python $PngToIco
    $bundleIco = Join-Path $Root "src-tauri\icons\icon.ico"
    Copy-Item $LogoIco $bundleIco -Force

    $extDir = Join-Path $Root "extension\icons"
    New-Item -ItemType Directory -Force -Path $extDir | Out-Null
    Copy-Item (Join-Path $Root "src-tauri\icons\32x32.png") (Join-Path $extDir "16.png") -Force
    Copy-Item (Join-Path $Root "src-tauri\icons\32x32.png") (Join-Path $extDir "32.png") -Force
    Copy-Item (Join-Path $Root "src-tauri\icons\128x128.png") (Join-Path $extDir "48.png") -Force
    Copy-Item (Join-Path $Root "src-tauri\icons\128x128.png") (Join-Path $extDir "128.png") -Force

    $assetsDir = Join-Path $Root "src\assets"
    New-Item -ItemType Directory -Force -Path $assetsDir | Out-Null
    Copy-Item (Join-Path $Root "src-tauri\icons\32x32.png") (Join-Path $assetsDir "marknest-logo.png") -Force

    Write-Host "Icon pipeline finished."
}
finally {
    Pop-Location
}
