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

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const proxy = proxies[i % proxies.length]; // gilir proxy

    console.log(`🔗 Membuka ${link} via proxy: ${proxy}`);

    const browser = await puppeteer.launch({
      headless: true, // false jika ingin lihat browser
      args: [`--proxy-server=${proxy}`]
    });

    const page = await browser.newPage();

    // Autentikasi proxy jika perlu
    if (proxy.includes('@')) {
      const [auth, host] = proxy.split('@');
      const [protocol, creds] = auth.split('//');
      const [username, password] = creds.split(':');
      await page.authenticate({ username, password });
    }

    try {
      await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log(`✅ Sukses buka: ${link}`);
    } catch (err) {
      console.error(`❌ Gagal buka ${link}: ${err.message}`);
    }

    await browser.close();
    await sleep(2000); // delay antar kunjungan
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
