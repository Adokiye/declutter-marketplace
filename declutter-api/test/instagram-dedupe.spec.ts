import { InstagramScraperService } from "../src/instagram/instagram-scraper.service";

describe("InstagramScraperService", () => {
  it("normalizes post URLs for dedupe", () => {
    const service = new InstagramScraperService();
    expect(service.normalizePostUrl("https://www.instagram.com/p/abc123/?utm_source=ig_web_copy_link#x")).toBe(
      "https://www.instagram.com/p/abc123"
    );
  });
});
