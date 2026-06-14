import Jimp from 'jimp';
import { fileURLToPath } from 'url';
import path from 'path';

// 16x16 pixel art face (same as PixelAvatar component)
const FACE_GRID = [
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
  [0,1,1,0,0,1,1,1,1,0,0,1,1,0,0,0],
  [0,1,0,0,1,1,1,1,1,1,0,0,1,0,0,0],
  [0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],
  [0,1,0,0,1,1,1,1,1,1,0,0,1,0,0,0],
  [0,1,1,0,0,1,1,1,1,0,0,1,1,0,0,0],
  [0,0,1,1,0,0,0,0,0,0,1,1,0,0,0,0],
  [0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0],
  [0,0,0,0,1,1,1,1,1,1,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.resolve(__dirname, '..', 'assets');

async function generateIcon(size, outputName) {
  const scale = size / 16;
  const img = new Jimp(size, size, 0xffffffff); // white background

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (FACE_GRID[y][x] === 1) {
        // Draw scaled pixel
        for (let dy = 0; dy < scale; dy++) {
          for (let dx = 0; dx < scale; dx++) {
            const px = x * scale + dx;
            const py = y * scale + dy;
            img.setPixelColor(0x000000ff, px, py);
          }
        }
      }
    }
  }

  // Add 2px border
  const borderColor = 0x000000ff;
  for (let i = 0; i < size; i++) {
    for (let b = 0; b < 2; b++) {
      img.setPixelColor(borderColor, i, b);        // top
      img.setPixelColor(borderColor, i, size - 1 - b); // bottom
      img.setPixelColor(borderColor, b, i);        // left
      img.setPixelColor(borderColor, size - 1 - b, i); // right
    }
  }

  const outputPath = path.join(assetsDir, outputName);
  await img.writeAsync(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

async function main() {
  await generateIcon(48, 'icon.png');        // app icon
  await generateIcon(48, 'favicon.png');     // web favicon
  await generateIcon(108, 'splash-icon.png'); // splash
  await generateIcon(108, 'android-icon-foreground.png'); // adaptive icon
}

main().catch(console.error);
