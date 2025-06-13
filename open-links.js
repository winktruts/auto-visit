const fs = require('fs');
const puppeteer = require('puppeteer');

async function readLines(filename) {
  return fs.readFileSync(filename, 'utf-8')
           .split('\n')
           .map(line => line.trim())
           .filter(Boolean);
}

(async () => {
  const links = await readLines('links.txt');
  const proxies = await readLines('proxies.txt');

  if (links.length === 0 || proxies.length === 0) {
    console.error('Pastikan links.txt dan proxies.txt tidak kosong!');
    return;
  }

  for (let i = 0; i < links.length; i++) {
    const link = links[i];
    const proxy = proxies[i % proxies.length]; // pakai bergantian jika jumlah beda

    console.log(`Membuka: ${link} via proxy: ${proxy}`);

    const browser = await puppeteer.launch({
      headless: false,
      args: [`--proxy-server=${proxy}`]
    });

    const page = await browser.newPage();

    // Handle proxy auth jika perlu
    if (proxy.includes('@')) {
      const [auth, host] = proxy.split('@');
      const [protocol, userpass] = auth.split('//');
      const [username, password] = userpass.split(':');
      await page.authenticate({ username, password });
    }

    try {
      await page.goto(link, { waitUntil: 'networkidle2', timeout: 30000 });
      console.log(`✅ Sukses buka: ${link}`);
    } catch (err) {
      console.error(`❌ Gagal buka: ${link} - ${err.message}`);
    }

    await browser.close();
    await new Promise(r => setTimeout(r, 3000)); // delay antar sesi
  }
})();
