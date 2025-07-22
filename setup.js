const fs = require('fs');
const https = require('https');
const path = require('path');
const cuiURL = 'https://raw.githubusercontent.com/N-blog/networkdevicesearch/main/cui.json';
const codeURL = 'https://raw.githubusercontent.com/N-blog/networkdevicesearch/main/code.js';
const targetFile = path.join(__dirname, 'networkdsearch.js');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

(async () => {
  console.log('📡 バージョン情報を取得中...');
  const remoteJSON = JSON.parse(await fetch(cuiURL));
  console.log(`最新バージョン: ${remoteJSON.v}`);
  console.log(`📝 メッセージ: ${remoteJSON.message}`);

  if (fs.existsSync(targetFile)) {
    const localCode = fs.readFileSync(targetFile, 'utf8');
    const match = localCode.match(/version\s*=\s*['"](.+?)['"]/);
    const localVersion = match ? match[1] : 'unknown';

    console.log(`🔍 現在のコードバージョン: ${localVersion}`);

    if (localVersion !== remoteJSON.v) {
      process.stdout.write('⚠️ 更新があります。アップデートしますか？ (Y/N): ');
      process.stdin.once('data', async input => {
        if (input.toString().trim().toUpperCase() === 'Y') {
          console.log('⬇️ code.js をダウンロード...');
          const newCode = await fetch(codeURL);
          fs.writeFileSync(targetFile, newCode, 'utf8');
          console.log('✅ 更新完了！`node networkdsearch.js`で起動してください。');
        } else {
          console.log('⏩ スキップしました。');
        }
      });
    } else {
      console.log('✅ 最新バージョンです。`node networkdsearch.js`で起動できます。');
    }
  } else {
    process.stdout.write('📦 初回インストールしますか？ (Y/N): ');
    process.stdin.once('data', async input => {
      if (input.toString().trim().toUpperCase() === 'Y') {
        console.log('⬇️ code.js をダウンロード...');
        const newCode = await fetch(codeURL);
        fs.writeFileSync(targetFile, newCode, 'utf8');
        console.log('✅ インストール完了！`node networkdsearch.js`で起動してください。');
      } else {
        console.log('🛑 インストールを中止しました。');
      }
    });
  }
})();
