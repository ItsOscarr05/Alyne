// Node.js script to create placeholder assets for Expo
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Color scheme - Alyne brand color
const brandColor = '#2563eb'; // Blue
const textColor = '#ffffff'; // White

async function createPlaceholderImage(name, size, text = 'A') {
  const outputPath = path.join(assetsDir, name);
  
  // Create a simple image with solid background and text
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="${brandColor}"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${size * 0.4}" 
        font-weight="bold" 
        fill="${textColor}" 
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
    </svg>
  `;

  try {
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    console.log(`✓ Created: ${name} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to create ${name}:`, error.message);
    return false;
  }
}

async function createAllAssets() {
  console.log('Creating placeholder assets for Expo...\n');

  const assets = [
    { name: 'icon.png', size: 1024, text: 'A' },
    { name: 'splash.png', size: 2048, text: 'Alyne' },
    { name: 'adaptive-icon.png', size: 1024, text: 'A' },
    { name: 'favicon.png', size: 48, text: 'A' },
    { name: 'notification-icon.png', size: 96, text: 'A' },
  ];

  for (const asset of assets) {
    await createPlaceholderImage(asset.name, asset.size, asset.text);
  }

  console.log('\n✓ Asset creation complete!');
  console.log('Note: These are placeholder images. Replace them with your actual app icons and splash screens.');
}

createAllAssets().catch(console.error);

