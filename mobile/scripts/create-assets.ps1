# PowerShell script to create placeholder assets for Expo
# This creates simple placeholder images using .NET (available on Windows)

Write-Host "Creating placeholder assets for Expo..." -ForegroundColor Green

$assetsDir = Join-Path $PSScriptRoot "..\assets"
if (-Not (Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force | Out-Null
}

# Create a simple placeholder PNG using .NET
function Create-PlaceholderImage {
    param(
        [string]$Path,
        [int]$Width = 1024,
        [int]$Height = 1024,
        [string]$Color = "#2563eb"
    )
    
    $assembly = @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
public class ImageCreator {
    public static void Create(string path, int width, int height, string color) {
        using (Bitmap bmp = new Bitmap(width, height)) {
            using (Graphics g = Graphics.FromImage(bmp)) {
                Color bgColor = ColorTranslator.FromHtml(color);
                g.Clear(bgColor);
                using (Font font = new Font("Arial", width / 10, FontStyle.Bold)) {
                    using (SolidBrush brush = new SolidBrush(Color.White)) {
                        string text = "A";
                        SizeF textSize = g.MeasureString(text, font);
                        PointF location = new PointF(
                            (width - textSize.Width) / 2,
                            (height - textSize.Height) / 2
                        );
                        g.DrawString(text, font, brush, location);
                    }
                }
            }
            bmp.Save(path, ImageFormat.Png);
        }
    }
}
"@
    
    try {
        Add-Type -TypeDefinition $assembly -ReferencedAssemblies System.Drawing
        [ImageCreator]::Create($Path, $Width, $Height, $Color)
        Write-Host "Created: $Path" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "Could not create image using .NET. Creating empty file instead." -ForegroundColor Yellow
        # Create an empty file as fallback
        New-Item -ItemType File -Path $Path -Force | Out-Null
        return $false
    }
}

# Create all required assets
$assets = @(
    @{ Name = "icon.png"; Size = 1024 },
    @{ Name = "splash.png"; Size = 2048 },
    @{ Name = "adaptive-icon.png"; Size = 1024 },
    @{ Name = "favicon.png"; Size = 48 },
    @{ Name = "notification-icon.png"; Size = 96 }
)

foreach ($asset in $assets) {
    $path = Join-Path $assetsDir $asset.Name
    Create-PlaceholderImage -Path $path -Width $asset.Size -Height $asset.Size
}

Write-Host "`nAsset creation complete!" -ForegroundColor Green
Write-Host "Note: These are placeholder images. Replace them with your actual app icons and splash screens." -ForegroundColor Yellow

