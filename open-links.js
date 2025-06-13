// 📦 Install dependencies before running:
// npm install puppeteer-extra puppeteer-extra-plugin-stealth
// npm install readline fs

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const readline = require('readline');
const path = require('path');
const util = require('util');

puppeteer.use(StealthPlugin());

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const MAX_RETRY_PER_LINK = 5;
const WAIT_TIME = 15000; // 15 detik untuk load + klik iklan
const VISIT_INTERVAL = 5 * 60 * 1000; // 5 menit dalam ms

// Baca file
const loadList = async (filename) => {
    const filePath = path.resolve(__dirname, filename);
    const lines = await fs.promises.readFile(filePath, 'utf-8');
    return lines.split('\n').map(l => l.trim()).filter(Boolean);
};

// Cek IP proxy (untuk tahu geolokasi)
const checkIP = async (page) => {
    try {
        await page.goto('https://ipapi.co/json/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        const content = await page.evaluate(() => document.body.innerText);
        const ipInfo = JSON.parse(content);
        return `${ipInfo.ip} - ${ipInfo.country_name}`;
    } catch (err) {
        return 'Gagal mendeteksi IP';
    }
};

// Visit satu link dengan satu proxy
const visitWithProxy = async (url, proxy, visitNumber) => {
    console.log(`\n🚀 Visit ke-${visitNumber} dimulai...`);
    console.log(`🔗 Mencoba buka ${url} via proxy: ${proxy}`);

    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--proxy-server=${proxy}`,
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        defaultViewport: null,
        timeout: 0
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

        // Deteksi lokasi IP
        const ipData = await checkIP(page);
        console.log(`🌍 IP Info: ${ipData}`);

        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        await page.waitForTimeout(WAIT_TIME); // Tunggu halaman dan script iklan
        await page.mouse.move(100, 100); // Simulasi user
        await page.keyboard.press('ArrowDown');

        console.log(`✅ Berhasil membuka link`);
        await browser.close();
        return true;
    } catch (err) {
        console.log(`❌ Gagal dengan proxy ${proxy}: ${err.message}`);
        await browser.close();
        return false;
    }
};

// Main Loop
(async () => {
    const links = await loadList('links.txt');
    const proxies = await loadList('proxies.txt');
    const totalVisits = 3;

    for (let i = 1; i <= totalVisits; i++) {
        for (const link of links) {
            let success = false;

            for (const proxy of proxies) {
                success = await visitWithProxy(link, proxy, i);
                if (success) break;
                else console.log(`❌ Proxy mati: ${proxy}`);
            }

            if (!success) {
                console.log(`❌ Gagal mengunjungi link: ${link}`);
            }
        }
        console.log(`⏳ Menunggu 5 menit untuk visit selanjutnya...`);
        if (i < totalVisits) await delay(VISIT_INTERVAL);
    }

    console.log('✅ Semua kunjungan selesai.');
})();
