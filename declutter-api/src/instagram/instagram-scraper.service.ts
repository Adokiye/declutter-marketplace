import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BrowserContext, chromium } from "playwright";

export type ScrapedInstagramPost = {
  postUrl: string;
  caption: string;
  imageUrls: string[];
  postedAt?: string; // original IG post date (ISO), when detectable
};

@Injectable()
export class InstagramScraperService {
  private readonly log = new Logger("InstagramScraper");

  constructor(private readonly config: ConfigService) {}

  async scrapeRecentPosts(profileUrl: string, limit = 6): Promise<ScrapedInstagramPost[]> {
    this.log.log(`scraping ${profileUrl} (limit=${limit})`);
    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 900 },
        locale: "en-US"
      });

      const loggedIn = await this.attachLogin(context);
      this.log.log(`auth=${loggedIn ? "logged-in" : "anonymous"}`);

      const page = await context.newPage();
      page.setDefaultTimeout(45_000);
      await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForTimeout(4000);
      this.log.log(`profile loaded, final url=${page.url()}`);

      const collectHrefs = async () =>
        page.$$eval("a[href*='/p/'], a[href*='/reel/']", (links) =>
          Array.from(new Set(links.map((link) => (link as any).href)))
        );

      let hrefs = await collectHrefs();
      // Instagram only renders the first ~12 posts in the initial grid; each
      // scroll-to-bottom triggers one more lazy-loaded batch (only when
      // authenticated — anonymous viewers are capped at 12).
      let stableRounds = 0;
      let scrolls = 0;
      const maxScrolls = 30;
      while (hrefs.length < limit && stableRounds < 3 && scrolls < maxScrolls) {
        const before = hrefs.length;
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
        await page.waitForTimeout(1200);
        hrefs = await collectHrefs();
        scrolls += 1;
        stableRounds = hrefs.length === before ? stableRounds + 1 : 0;
      }
      hrefs = hrefs.slice(0, limit);
      this.log.log(`found ${hrefs.length} post hrefs (after ${scrolls} scrolls)`);

      const posts: ScrapedInstagramPost[] = [];
      for (const postUrl of hrefs.slice(0, limit)) {
        try {
          await page.goto(postUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
          await page.waitForTimeout(1500);

          // Skip videos / reels — the static poster frame ships an IG play
          // icon overlay and looks bad as a listing cover. Reels are always
          // videos; for /p/ URLs we sniff og:type + the og:video meta + any
          // <video> element on the page.
          const mediaKind = await page.evaluate(() => {
            const m = (prop: string) =>
              document.querySelector<HTMLMetaElement>(`meta[property='${prop}']`)?.getAttribute("content") ?? "";
            return {
              ogType: m("og:type"),
              ogVideo: m("og:video") || m("og:video:secure_url"),
              videoEl: document.querySelectorAll("video").length > 0
            };
          });
          const isVideo =
            postUrl.includes("/reel/") ||
            /video/i.test(mediaKind.ogType) ||
            Boolean(mediaKind.ogVideo) ||
            mediaKind.videoEl;
          if (isVideo) {
            this.log.log(`skipping video: ${postUrl}`);
            continue;
          }

          const caption = await page
            .$eval("meta[property='og:description']", (meta) => meta.getAttribute("content") ?? "")
            .catch(() => "");

          // og:image is always the actual post cover at a sensible size — grab that first.
          const ogImage = await page
            .$eval("meta[property='og:image']", (meta) => meta.getAttribute("content") ?? "")
            .catch(() => "");

          // Original post date: prefer the article meta, fall back to the <time datetime>.
          const postedAt = await page.evaluate(() => {
            const meta = document.querySelector<HTMLMetaElement>("meta[property='article:published_time']")?.getAttribute("content");
            if (meta) return meta;
            const t = document.querySelector<HTMLTimeElement>("time[datetime]")?.getAttribute("datetime");
            return t ?? "";
          }).catch(() => "");

          // Anonymous IG wraps the post in <article>, logged-in IG ships it
          // in <main> alongside a "More from @user" grid. Neither scope is
          // tight enough — IG's grid uses real post-image URLs that pass our
          // filters. The only reliable signal for "this slide right now" is
          // the LARGEST image currently rendered in the viewport: the
          // carousel slide is always the biggest visible element on screen,
          // and the side/grid thumbnails are far smaller.
          const grabActiveSlide = () =>
            page.evaluate(() => {
              const viewportH = window.innerHeight;
              const candidates = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
              const scored = candidates
                .map((img) => {
                  const rect = img.getBoundingClientRect();
                  const visibleH = Math.max(0, Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0));
                  return {
                    src: img.src,
                    area: rect.width * rect.height,
                    visibleArea: rect.width * visibleH
                  };
                })
                .filter((s) => s.src && s.visibleArea > 40_000); // exclude tiny thumbs
              scored.sort((a, b) => b.area - a.area);
              return scored[0]?.src ?? null;
            });

          const inlineImages: string[] = [];
          const seen = new Set<string>();
          const remember = (url: string | null) => {
            if (url && !seen.has(url)) {
              seen.add(url);
              inlineImages.push(url);
            }
          };

          remember(await grabActiveSlide());

          // Walk the carousel — Instagram only mounts one slide at a time,
          // so we click the "Next" arrow and capture the new active slide
          // until the arrow disappears or stops changing.
          const nextSelectors = [
            "button[aria-label='Next']",
            "[role='button'][aria-label='Next']",
            "div[role='button'][aria-label='Next']"
          ];
          let stableSlides = 0;
          for (let i = 0; i < 9 && stableSlides < 2; i++) {
            let clicked = false;
            for (const sel of nextSelectors) {
              const btn = await page.$(sel);
              if (!btn) continue;
              try {
                await btn.click({ timeout: 2_000 });
                clicked = true;
                break;
              } catch {
                // try the next selector
              }
            }
            if (!clicked) break;
            await page.waitForTimeout(650);
            const before = seen.size;
            remember(await grabActiveSlide());
            stableSlides = seen.size === before ? stableSlides + 1 : 0;
          }

          const imageUrls = pickPostImages(ogImage, inlineImages, 10);
          this.log.log(`post ${postUrl}: caption=${caption.slice(0, 60)} images=${imageUrls.length}`);
          posts.push({
            postUrl: this.normalizePostUrl(postUrl),
            caption,
            imageUrls,
            postedAt: postedAt || undefined
          });
        } catch (error) {
          this.log.warn(`failed to scrape ${postUrl}: ${error instanceof Error ? error.message : error}`);
        }
      }

      this.log.log(`scrape complete: ${posts.length} posts`);
      return posts;
    } finally {
      await browser.close();
    }
  }

  /**
   * Try to put the Playwright context into a logged-in Instagram state.
   * Priority order: explicit session cookie > username/password login.
   * Returns true if either path appeared to succeed.
   */
  private async attachLogin(context: BrowserContext): Promise<boolean> {
    const sessionId = this.config.get<string>("IG_SESSION_ID");
    const dsUserId = this.config.get<string>("IG_DS_USER_ID");
    const csrftoken = this.config.get<string>("IG_CSRFTOKEN");

    if (sessionId) {
      const baseCookie = {
        domain: ".instagram.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "Lax" as const
      };
      const cookies = [
        { ...baseCookie, name: "sessionid", value: sessionId, httpOnly: true },
        ...(dsUserId ? [{ ...baseCookie, name: "ds_user_id", value: dsUserId, httpOnly: false }] : []),
        ...(csrftoken ? [{ ...baseCookie, name: "csrftoken", value: csrftoken, httpOnly: false }] : [])
      ];
      await context.addCookies(cookies);
      this.log.log("attached IG_SESSION_ID cookie");
      return true;
    }

    const username = this.config.get<string>("IG_USERNAME");
    const password = this.config.get<string>("IG_PASSWORD");
    if (username && password) {
      try {
        const page = await context.newPage();
        await page.goto("https://www.instagram.com/accounts/login/", {
          waitUntil: "domcontentloaded",
          timeout: 45_000
        });
        await page.waitForSelector("input[name='username']", { timeout: 15_000 });
        await page.fill("input[name='username']", username);
        await page.fill("input[name='password']", password);
        await page.click("button[type='submit']");
        // Wait for either the home feed or a redirect away from /accounts/login.
        await Promise.race([
          page.waitForURL((u) => !u.toString().includes("/accounts/login"), { timeout: 25_000 }),
          page.waitForSelector("svg[aria-label='Home']", { timeout: 25_000 })
        ]);
        await page.close();
        this.log.log(`logged in as ${username}`);
        return true;
      } catch (err) {
        this.log.warn(
          `IG_USERNAME/PASSWORD login failed (${err instanceof Error ? err.message : err}). Falling back to anonymous mode.`
        );
      }
    }

    return false;
  }

  normalizePostUrl(url: string) {
    const parsed = new URL(url);
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  }
}

/**
 * Build the image list for a post:
 *  - Drop data: URIs and non-Instagram CDN images.
 *  - Drop profile pictures (path includes /t51.2885-19/ or /t51.82787-19/,
 *    or the encoded efg blob says profile_pic).
 *  - Prefer the og:image (always the canonical post cover) as the first element.
 *  - Then layer in carousel / inline post images, deduped on the path part
 *    of the URL (Instagram appends short-lived query params).
 */
export function pickPostImages(ogImage: string, candidates: string[], max: number): string[] {
  const isPostImage = (src: string) =>
    Boolean(src) &&
    !src.startsWith("data:") &&
    /cdninstagram|fbcdn/i.test(src) &&
    !/\/t51\.2885-19\/|\/t51\.82787-19\//.test(src) &&
    !/profile_pic/i.test(src);

  const dedupeKey = (src: string) => {
    try {
      return new URL(src).pathname;
    } catch {
      return src;
    }
  };

  const ordered = [ogImage, ...candidates].filter(isPostImage);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const src of ordered) {
    const k = dedupeKey(src);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(src);
    if (out.length >= max) break;
  }
  return out;
}
