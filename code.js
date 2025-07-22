const { exec } = require('child_process');
const iconv = require('iconv-lite');
const fetch = require('node-fetch');
const dns = require('dns');
const whois = require('whois');
const os = require('os');

const maxScanCount = 50;
const myIP = Object.values(os.networkInterfaces()).flat()
  .find(i => i.family === 'IPv4' && !i.internal)?.address || '不明';
const baseIP = myIP.substring(0, myIP.lastIndexOf('.') + 1);

const execSJIS = cmd => new Promise((resolve) => {
  exec(cmd, { encoding: 'buffer' }, (_, stdout) => {
    resolve(iconv.decode(stdout || '', 'shift_jis'));
  });
});

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

(async () => {
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

    results.push({
      deviceName, ip, vendor,
      dns: dnsName, whois: whoisInfo,
      status: isOnline ? 'ONLINE' : 'OFFLINE',
      ping
    });
  }

  console.log('\n✅ Device Search 完了！');
  console.table(results);
})();
