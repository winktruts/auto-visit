const fs = require('fs');
const puppeteer = require('puppeteer');
const axios = require('axios');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

function readLines(filename) {
  return fs.readFileSync(filename, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testProxy(proxyUrl) {
  try {
    const agent = proxyUrl.startsWith('socks')
      ? new SocksProxyAgent(proxyUrl)
      : new HttpsProxyAgent(proxyUrl);

    await axios.get('https://www.google.com', {
      httpsAgent: agent,
      timeout: 7000
    });

    return true;
  } catch {
    return false;
  }
}

async function openLinksOnce(links, proxies, round) {
  console.log(`\n🚀 Visit ke-${round + 1} dimulai...`);

  for (const link of links) {
    let success = false;

    for (const proxy of proxies) {
      const proxyOk = await testProxy(proxy);
      if (!proxyOk) {
        console.log(`❌ Proxy mati: ${proxy}`);
        continue;
      }

      console.log(`🔗 Mencoba buka ${link} via proxy: ${proxy}`);
      const browser = await puppeteer.launch({
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
        const [username, password] = creds.split(':');
        await page.authenticate({ username, password });
      }

      try {
        if (!page.waitForTimeout) {
          page.waitForTimeout = (ms) => new Promise(res => setTimeout(res, ms));
        }

        await page.setUserAgent(
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36'
        );

        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await sleep(8000); // tunggu timer shortlink

        try {
          await page.waitForSelector(
            'a[href^="http"], .btn, .get-link, #skip_button',
            { timeout: 10000 }
          );
          await page.click(
            'a[href^="http"], .btn, .get-link, #skip_button'
          );
          console.log('🖱️ Tombol lanjut diklik, menunggu redirect...');
          await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        } catch {
          console.log('ℹ️ Tidak ditemukan tombol lanjut, mungkin tidak perlu.');
        }

        await sleep(3000);
        console.log(`✅ Berhasil buka: ${link} dengan proxy: ${proxy}`);
        success = true;
        await browser.close();
        break;
      } catch (err) {
        console.error(`❌ Gagal dengan proxy ${proxy}: ${err.message}`);
        await browser.close();
      }

      await sleep(1000);
    }

    if (!success) {
      console.error(`⛔ Semua proxy gagal untuk link: ${link}`);
    }

    await sleep(2000);
  }
}

async function main() {
  const links = readLines('links.txt');
  const proxies = readLines('proxies.txt');

  if (links.length === 0 || proxies.length === 0) {
    console.error('❗ File links.txt atau proxies.txt kosong!');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('🔁 Ulangi berapa kali visit? ', (visitCountInput) => {
    const visitCount = parseInt(visitCountInput);
    if (isNaN(visitCount) || visitCount <= 0) {
      console.log('Jumlah harus angka > 0');
      rl.close();
      return;
    }

    rl.question('⏱️ Jeda antar visit (menit, default 5)? ', async (delayInput) => {
      const delayMinutes = parseInt(delayInput) || 5;
      const delayMs = delayMinutes * 60 * 1000;

      rl.close();

      for (let round = 0; round < visitCount; round++) {
        await openLinksOnce(links, proxies, round);
        if (round < visitCount - 1) {
          console.log(`⏳ Tunggu ${delayMinutes} menit sebelum visit berikutnya...\n`);
          await sleep(delayMs);
        }
      }

      console.log(`🏁 Selesai! Total visit: ${visitCount} kali`);
    });
  });
}

main();
