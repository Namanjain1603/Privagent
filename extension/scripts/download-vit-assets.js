const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const REVISION = 'ebffd7b9c0c53b51bada44116abd8f01aed41be6'; // Specific commit hash
const REPO = 'onnx-community/vit-tiny-patch16-224-ONNX';
const BASE_URL = `https://huggingface.co/${REPO}/resolve/${REVISION}`;
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'models', 'vit-tiny-patch16-224-ONNX');

const EXPECTED_HASHES = {
  'config.json': 'e621b8a445d3d0307a6a508e62cc0a303a9b1df9a99b8f7bdb73feb089d7aa59',
  'preprocessor_config.json': 'ae9bb157b9629887cc74913a4e7c12c9308f374f0930e8072320e8f2e1583c5e',
  'onnx/model_quantized.onnx': 'd7ce4d9be882763ddfe31821f06a16ae1061abf0b4a488dfca5aa5130b10c3fe'
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode)) {
        const redirectUrl = new URL(res.headers.location, url).href;
        downloadFile(redirectUrl, dest).then(resolve).catch(reject);
      } else if (res.statusCode === 200) {
        const file = fs.createWriteStream(dest);
        const hash = crypto.createHash('sha256');
        res.pipe(file);
        res.on('data', chunk => hash.update(chunk));
        file.on('finish', () => {
          file.close();
          resolve(hash.digest('hex'));
        });
      } else {
        reject(new Error(`HTTP status ${res.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function run() {
  console.log('--- Downloading local ViT model assets ---');
  fs.mkdirSync(path.join(ASSETS_DIR, 'onnx'), { recursive: true });

  for (const [file, expectedHash] of Object.entries(EXPECTED_HASHES)) {
    const dest = path.join(ASSETS_DIR, file);
    console.log(`Downloading ${file}...`);
    try {
      const hash = await downloadFile(`${BASE_URL}/${file}`, dest);
      if (hash !== expectedHash) {
        console.error(`❌ Checksum mismatch for ${file}. Expected ${expectedHash}, got ${hash}`);
        process.exit(1);
      }
      console.log(`✅ Verified ${file}`);
    } catch (e) {
      console.error(`❌ Failed to download ${file}: ${e.message}`);
      process.exit(1);
    }
  }
}

run();
