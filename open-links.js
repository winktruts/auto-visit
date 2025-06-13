const fs = require('fs');
const puppeteer = require('puppeteer');
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

async function openLinksOnce(links, proxies, round) {
  console.log(`\n🚀 Visit ke-${round + 1} dimulai...`);

  for (const link of links) {
    let success = false;

    for (const proxy of proxies) {
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

      // Autentikasi proxy jika ada username:password
      if (proxy.includes('@')) {
        const [auth, host] = proxy.split('@');
        const [protocol, creds] = auth.split('//');
        const [username, password] = creds.split(':');
        await page.authenticate({ username, password });
      }

      try {
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

// Tunggu tambahan untuk redirect
await page.waitForTimeout(10000);

// Coba klik tombol jika ada (optional)
try {
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
  await page.waitForSelector('.btn-continue, #continueBtn, .skip-ad', { timeout: 5000 });
  await page.click('.btn-continue, #continueBtn, .skip-ad');
  console.log('🖱️ Tombol diklik, menunggu redirect...');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
} catch (err) {
  console.log('⚠️ Tidak perlu klik atau tidak ditemukan tombol.');
}

        console.log(`✅ Berhasil buka: ${link} dengan proxy: ${proxy}`);
        success = true;
        await browser.close();
        break; // Berhasil, keluar dari loop proxy
      } catch (err) {
        console.error(`❌ Gagal dengan proxy ${proxy}: ${err.message}`);
        await browser.close();
      }

      await sleep(1000); // Delay kecil antar percobaan proxy
    }

    if (!success) {
      console.error(`❌ Semua proxy gagal membuka: ${link}`);
    }

    await sleep(2000); // Delay antar link
  }
}


async function main() {
  const links = readLines('links.txt');
  const proxies = readLines('proxies.txt');

  if (links.length === 0 || proxies.length === 0) {
    console.error('❗ Pastikan links.txt dan proxies.txt tidak kosong!');
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Prompts untuk jumlah visit dan interval
  rl.question('🌀 Berapa kali kunjungan (visit) diulang? ', async (visitCountInput) => {
    const visitCount = parseInt(visitCountInput);
    if (isNaN(visitCount) || visitCount <= 0) {
      console.log('Jumlah kunjungan harus berupa angka > 0');
      rl.close();
      return;
    }

    rl.question('⏱️ Jeda antar visit (dalam menit, default 5)? ', async (delayInput) => {
      const delayMinutes = parseInt(delayInput) || 5;
      const delayMs = delayMinutes * 60 * 1000;

      rl.close();

      for (let round = 0; round < visitCount; round++) {
        await openLinksOnce(links, proxies, round);
        if (round < visitCount - 1) {
          console.log(`⏳ Menunggu ${delayMinutes} menit sebelum visit selanjutnya...\n`);
          await sleep(delayMs);
        }
      }

      console.log(`🎉 Selesai! Total kunjungan: ${visitCount} kali`);
    });
  });
}

main();
