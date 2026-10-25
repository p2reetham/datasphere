// Turns the relative social-preview tags in index.html into absolute URLs at deploy time
// (WhatsApp/Instagram/etc. need absolute URLs). Uses SITE_URL if you set it (e.g. a custom
// domain), otherwise Vercel's own production URL.
const fs = require('fs'), path = require('path');
const host = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
if (!host) { console.log('No site URL found — leaving relative social-preview tags as is.'); process.exit(0); }
const base = (/^https?:\/\//.test(host) ? host : 'https://' + host).replace(/\/$/, '');
const file = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(file, 'utf8');
html = html
  .replace(/(property="og:image" content=")[^"]*(")/, `$1${base}/og-image.jpg$2`)
  .replace(/(name="twitter:image" content=")[^"]*(")/, `$1${base}/og-image.jpg$2`)
  .replace(/(property="og:url" content=")[^"]*(")/, `$1${base}/$2`);
fs.writeFileSync(file, html);
console.log('Social preview URLs set to ' + base);
