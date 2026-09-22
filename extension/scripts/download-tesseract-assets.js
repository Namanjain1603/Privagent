const fs = require('fs');
const path = require('path');
const https = require('https');

const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'tesseract');

// Create the directory if it doesn't exist
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

console.log('--- Copying local Tesseract dependencies ---');
const OCR_NODE_MODULES = path.join(__dirname, '..', '..', 'ocr', 'node_modules');

// Copy worker.min.js
const workerSrc = path.join(OCR_NODE_MODULES, 'tesseract.js', 'dist', 'worker.min.js');
const workerDest = path.join(ASSETS_DIR, 'worker.min.js');
if (fs.existsSync(workerSrc)) {
  fs.copyFileSync(workerSrc, workerDest);
  console.log('✅ Copied worker.min.js');
} else {
  console.error(`❌ Could not find ${workerSrc}`);
  process.exit(1);
}

// Copy tesseract-core.wasm.js
const coreSrc = path.join(OCR_NODE_MODULES, 'tesseract.js-core', 'tesseract-core.wasm.js');
const coreDest = path.join(ASSETS_DIR, 'tesseract-core.wasm.js');
if (fs.existsSync(coreSrc)) {
  fs.copyFileSync(coreSrc, coreDest);
  console.log('✅ Copied tesseract-core.wasm.js');
} else {
  console.error(`❌ Could not find ${coreSrc}`);
  process.exit(1);
}

// Download eng.traineddata.gz
const TESSDATA_URL = 'https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0/eng.traineddata.gz';
const dataDest = path.join(ASSETS_DIR, 'eng.traineddata.gz');

if (!fs.existsSync(dataDest)) {
  console.log('--- Downloading eng.traineddata.gz ---');
  const file = fs.createWriteStream(dataDest);
  https.get(TESSDATA_URL, (response) => {
    if (response.statusCode !== 200) {
      console.error(`❌ Failed to download language data: HTTP ${response.statusCode}`);
      fs.unlinkSync(dataDest);
      process.exit(1);
    }
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('✅ Downloaded eng.traineddata.gz');
    });
  }).on('error', (err) => {
    fs.unlinkSync(dataDest);
    console.error(`❌ Download error: ${err.message}`);
    process.exit(1);
  });
} else {
  console.log('✅ eng.traineddata.gz already exists');
}
