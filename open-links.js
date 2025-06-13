const fs = require('fs');
const puppeteer = require('puppeteer');
const readline = require('readline');

function readLines(file) {
  return fs.readFileSync(file, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fixProxyProtocol(proxy) {
  try {
    const url = new URL(proxy);
    if (url.hostname.includes('webshare.io') && url.port === '80') {
      return 'http://' + proxy.split('://')[1];
    }
  } catch {}
  return proxy;
}

async function openWithProxy(link, proxy) {
  proxy = fixProxyProtocol(proxy);
  console.log(`🔗 Mencoba buka ${link} via proxy: ${proxy}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        `--proxy-server=${proxy}`,
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });

    const page = await browser.newPage();

    if (proxy.includes('@')) {
      const [authPart] = proxy.split('@');
      const [, creds] = authPart.split('//');
      const [user, pass] = creds.split(':');
      await page.authenticate({ username: user, password: pass });
    }

    if (!page.waitForTimeout) {
      page.waitForTimeout = ms => new Promise(res => setTimeout(res, ms));
    }

    await page.setUserAgent('Mozilla/5.0 Chrome/120 Safari/537.36');
    await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(8000);

    try {
      await page.waitForSelector('a[href^="http"], .btn, .get-link, #skip_button', { timeout: 10000 });
      await page.click('a[href^="http"], .btn, .get-link, #skip_button');
      console.log('🖱️ Tombol lanjut diklik, menunggu redirect...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    } catch {
      console.log('ℹ️ Tidak ditemukan tombol lanjut, mungkin tidak perlu.');
    }

    console.log(`✅ Berhasil buka: ${link} dengan proxy: ${proxy}`);
    await browser.close();
    return true;
  } catch (err) {
    console.log(`❌ Gagal dengan proxy ${proxy}: ${err.message}`);
    if (browser) await browser.close();
    return false;
  }
}

async function openLinksOnce(links, proxies, round) {
  console.log(`\n🚀 Visit ke-${round + 1} dimulai...`);
  for (const link of links) {
    let success = false;
    for (const proxy of proxies) {
      const ok = await openWithProxy(link, proxy);
      if (ok) {
        success = true;
        break;
      } else {
        console.log(`❌ Proxy mati: ${proxy}`);
      }
    }
    if (!success) {
      console.log(`⛔ Semua proxy gagal untuk: ${link}`);
    }
    await sleep(2000);
  }
}

async function main() {
  const links = readLines('links.txt');
  const proxies = readLines('proxies.txt');

  if (!links.length || !proxies.length) {
    console.error('❗ File links.txt atau proxies.txt kosong.');
    return;
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  rl.question('🔁 Ulangi berapa kali visit? ', (visitCountStr) => {
    const visitCount = parseInt(visitCountStr);
    if (isNaN(visitCount) || visitCount <= 0) {
      console.log('Jumlah harus angka > 0');
      rl.close();
      return;
    }

    rl.question('⏱️ Jeda antar visit (menit, default 5)? ', async (delayStr) => {
      const delay = parseInt(delayStr) || 5;
      const delayMs = delay * 60 * 1000;
      rl.close();

      for (let i = 0; i < visitCount; i++) {
        await openLinksOnce(links, proxies, i);
        if (i < visitCount - 1) {
          console.log(`⏳ Tunggu ${delay} menit sebelum visit berikutnya...\n`);
          await sleep(delayMs);
        }
      }

      console.log(`🏁 Selesai! Total visit: ${visitCount} kali.`);
    });
  });
}

main();
