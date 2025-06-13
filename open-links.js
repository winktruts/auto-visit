const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const links = fs.readFileSync('links.txt', 'utf-8').split('\n').filter(Boolean);
const proxies = fs.readFileSync('proxies.txt', 'utf-8').split('\n').filter(Boolean);

let visitCount = 1;

async function visitLinks() {
  console.log(`🚀 Visit ke-${visitCount} dimulai...`);

  for (const link of links) {
    let success = false;

    for (const proxy of proxies) {
      console.log(`🔗 Mencoba buka ${link} via proxy: ${proxy}`);
      try {
        const browser = await puppeteer.launch({
          headless: "new", // Fix headless mode
          args: [
            `--proxy-server=${proxy}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-dev-shm-usage',
          ]
        });

        const page = await browser.newPage();
        await page.goto(link, { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Tunggu maksimal 15 detik atau hingga redirect selesai
        await page.waitForTimeout(15000);

        console.log(`✅ Berhasil buka ${link} dengan proxy ${proxy}`);
        await browser.close();
        success = true;
        break; // keluar dari loop proxy
      } catch (error) {
        console.log(`❌ Gagal dengan proxy ${proxy}: ${error.message}`);
      }
    }

    if (!success) {
      console.log(`⚠️ Semua proxy gagal untuk ${link}`);
    }
  }

  visitCount++;
}

// Jalankan pertama kali langsung
visitLinks();

// Ulangi setiap 5 menit (300000 ms)
setInterval(visitLinks, 5 * 60 * 1000);
