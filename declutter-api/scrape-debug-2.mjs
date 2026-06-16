import { chromium } from "playwright";
import "dotenv/config";

const url = "https://www.instagram.com/declutterdotcombackup/p/DY45tUtDRH6/";
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
await page.waitForTimeout(4000);

const info = await page.evaluate(() => {
  return {
    title: document.title,
    bodyTextSnippet: document.body.innerText.slice(0, 400),
    articleCount: document.querySelectorAll("article").length,
    mainCount: document.querySelectorAll("main").length,
    totalImgs: document.querySelectorAll("img").length,
    cdnImgs: Array.from(document.querySelectorAll("img"))
      .map((i) => i.src)
      .filter((s) => s && /cdninstagram|fbcdn/i.test(s))
      .filter((s) => !/t51\.2885-19|t51\.82787-19|profile_pic/i.test(s)).length,
    nextButtonByLabel: document.querySelectorAll("[aria-label='Next']").length,
    nextButtonByAriaContains: Array.from(document.querySelectorAll("[aria-label]"))
      .map((e) => e.getAttribute("aria-label"))
      .filter((l) => l && /next|carousel/i.test(l)).slice(0, 5),
    hasVideo: document.querySelectorAll("video").length,
    mainTagFirstChild: document.querySelector("main")?.children?.[0]?.tagName,
    rolePresentation: document.querySelectorAll("[role='presentation']").length,
    rolesOnPage: Array.from(new Set(Array.from(document.querySelectorAll("[role]")).map((e) => e.getAttribute("role")).filter(Boolean))).slice(0, 15)
  };
});
console.log(JSON.stringify(info, null, 2));

// Save the page HTML for offline inspection.
const html = await page.content();
await import("fs").then((fs) => fs.writeFileSync("/tmp/ig-post.html", html));
console.log("\nHTML saved to /tmp/ig-post.html");

await browser.close();
