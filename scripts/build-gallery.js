// scripts/build-gallery.js
//
// Scans the /gallery folder for image and video files and writes
// gallery/manifest.json listing what it found, so the site knows what to
// show without needing a real backend or directory listing at runtime.
//
// This runs automatically on every Vercel deploy (see the "vercel-build"
// script in package.json) — you don't need to run it yourself, but you can:
//   node scripts/build-gallery.js

const fs = require('fs');
const path = require('path');

const GALLERY_DIR = path.join(__dirname, '..', 'gallery');
const MANIFEST_PATH = path.join(GALLERY_DIR, 'manifest.json');

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'];
const VIDEO_EXT = ['.mp4', '.webm', '.mov', '.m4v'];

// Natural sort so "photo2.jpg" comes before "photo10.jpg".
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function main() {
  if (!fs.existsSync(GALLERY_DIR)) {
    fs.mkdirSync(GALLERY_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(GALLERY_DIR, { withFileTypes: true });
  const images = [];
  const videos = [];

  entries.forEach((entry) => {
    if (!entry.isFile()) return;
    if (entry.name.startsWith('.')) return;
    if (entry.name === 'manifest.json') return;

    const ext = path.extname(entry.name).toLowerCase();
    const publicPath = '/gallery/' + entry.name;

    if (IMAGE_EXT.includes(ext)) images.push(publicPath);
    else if (VIDEO_EXT.includes(ext)) videos.push(publicPath);
  });

  images.sort(naturalCompare);
  videos.sort(naturalCompare);

  const manifest = {
    images,
    videos,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

  console.log(
    `Gallery manifest updated: ${images.length} image(s), ${videos.length} video(s).`
  );
  if (images.length === 0 && videos.length === 0) {
    console.log('(gallery folder is empty — drop files in /gallery and redeploy)');
  }
}

main();
