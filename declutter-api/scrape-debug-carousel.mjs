import { chromium } from "playwright";
import "dotenv/config";

const url = "https://www.instagram.com/declutterdotcom/p/DY5SoYrN0Hr/";

const browser = await chromium.launch({ headless: true, channel: "chrome" });
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
  viewport: { width: 1280, height: 900 },
  locale: "en-US"
});

await context.addCookies([
  { name: "sessionid", value: process.env.IG_SESSION_ID, domain: ".instagram.com", path: "/", httpOnly: true, secure: true, sameSite: "Lax" },
  { name: "ds_user_id", value: process.env.IG_DS_USER_ID, domain: ".instagram.com", path: "/", secure: true, sameSite: "Lax" },
  { name: "csrftoken", value: process.env.IG_CSRFTOKEN, domain: ".instagram.com", path: "/", secure: true, sameSite: "Lax" }
]);

const page = await context.newPage();
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
await page.waitForTimeout(2500);
console.log("page url after nav:", page.url());

// Enumerate buttons + role=button in the article
const buttons = await page.$$eval("article button, article [role='button']", (els) =>
  els.map((el) => ({
    tag: el.tagName,
    aria: el.getAttribute("aria-label"),
    cls: el.className?.slice ? el.className.slice(0, 60) : "",
    text: el.textContent?.slice(0, 30)
  }))
);
console.log("article buttons:", JSON.stringify(buttons, null, 2));

// Count images in article
const imgs = await page.$$eval("article img", (els) => els.length);
console.log("article images upfront:", imgs);

// Try keyboard arrow
console.log("\n--- pressing ArrowRight 3 times ---");
const initial = await page.$$eval("article img", (els) => els.map((e) => e.src));
console.log("initial article images:", initial.length);
for (let i = 0; i < 5; i++) {
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(700);
  const now = await page.$$eval("article img", (els) => els.map((e) => e.src));
  console.log(`after arrow ${i+1}:`, now.length, "unique:", new Set([...initial, ...now]).size);
}

await browser.close();
