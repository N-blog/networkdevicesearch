const version = '1.0.8'; // ← GitHub側 cui.json と照合される

const fs = require('fs');
const https = require('https');
const path = require('path');
const iconv = require('iconv-lite');
const fetch = require('node-fetch');
const dns = require('dns');
const whois = require('whois');
const os = require('os');

// ✅ GitHubリポジトリにある JSON 情報
const jsonURL = 'https://raw.githubusercontent.com/N-blog/networkdevicesearch/main/cui.json';
const selfPath = path.join(__dirname, 'code.js');

// 🔧 SJIS対応コマンド実行（Windows用）
const { exec } = require('child_process');
const execSJIS = cmd => new Promise(resolve => {
  exec(cmd, { encoding: 'buffer' }, (_, stdout) => {
    resolve(iconv.decode(stdout || '', 'shift_jis'));
  });
});

// 🌐 情報取得関数（MACベンダー、DNS名、WHOIS）
async function getVendor(mac) {
  try {
    const res = await fetch(`https://api.macvendors.com/${mac}`);
    return await res.text();
  } catch {
    return '不明';
  }
}
async function dnsLookup(ip) {
  try {
    const res = await dns.promises.lookupService(ip, 0);
    return res.hostname || ip;
  } catch {
    return ip;
  }
}
async function getWhois(ip) {
  return new Promise(resolve => {
    whois.lookup(ip, (err, data) => {
      if (err || !data) return resolve('不明');
      const match = data.match(/OrgName|Country|Organization|owner:\s*(.+)/i);
      resolve(match ? match[1] : '取得失敗');
    });
  });
}

// 🔄 GitHubバージョンチェック（自分と異なれば更新促す）
async function checkUpdate() {
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
          runScan()
        }
      });
    } else {
      console.log('✅ 最新バージョンです。');
      runScan()
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
}

// 🚀 Device Scan 実行ロジック
async function runScan() {
  const maxScanCount = 50;
  const myIP = Object.values(os.networkInterfaces()).flat()
    .find(i => i.family === 'IPv4' && !i.internal)?.address || '不明';
  const baseIP = myIP.substring(0, myIP.lastIndexOf('.') + 1);

  console.log(`\n📡 Device Search 開始（最大 ${maxScanCount} 台）...\n`);
  const arpRaw = await execSJIS('arp -a');
  const results = [];

  for (let i = 1; i <= maxScanCount; i++) {
    const ip = `${baseIP}${i}`;
    const percent = Math.round((i / maxScanCount) * 100);
    process.stdout.write(`[${percent}%] 🔄 スキャン中: ${ip}    \r`);

    const pingOut = await execSJIS(`ping -n 1 ${ip}`);
    const isOnline = pingOut.includes('TTL=');
    const pingMatch = pingOut.match(/時間[=<]?\s*(\d+)\s*ms/) || pingOut.match(/time[=<]?\s*(\d+)\s*ms/i);
    const ping = pingMatch ? `${pingMatch[1]}ms` : '不明';

    const nbtRaw = await execSJIS(`nbtstat -a ${ip}`);
    let deviceName = nbtRaw.match(/<00>\s+UNIQUE\s+(.+)/)?.[1]?.trim() || '不明';
    if (ip === myIP) deviceName = 'WINPC';

    const macMatch = arpRaw.match(new RegExp(`${ip}\\s+([\\w-]+)`));
    const mac = macMatch ? macMatch[1] : '不明';
    const vendor = mac !== '不明' ? await getVendor(mac) : '不明';
    const dnsName = await dnsLookup(ip);
    const whoisInfo = await getWhois(ip);

    results.push({ deviceName, ip, vendor, dns: dnsName, whois: whoisInfo, status: isOnline ? 'ONLINE' : 'OFFLINE', ping });
  }

  console.log('\n✅ Device Search 完了！');
  console.table(results);
}

// 🔥 実行開始：まずバージョン確認
checkUpdate();
