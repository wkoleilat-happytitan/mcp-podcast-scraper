import { scrapeEpisode } from "../src/services/episode-scraper.js";

async function main() {
  // Test 1: Valid RSS URL (should use RSS)
  console.log("TEST 1: Valid RSS URL");
  console.log("=".repeat(80));
  try {
    const result1 = await scrapeEpisode({
      podcastName: "Lenny's Podcast",
      title: "Why humans are AI's biggest bottleneck (and what's coming in 2026) | Alexander Embiricos (OpenAI Codex Product Lead)",
      pubDate: "2025-12-14",
      audioUrl: "https://api.substack.com/feed/podcast/180365355/4955680feee2c56710e0774145580c3c.mp3?token=727e2194-baa0-46bf-b46d-46ad627b3f4c"
    });
    console.log(`\n✅ Test 1 Result: Source=${result1.source}`);
    console.log(`Preview: ${result1.transcriptPreview.substring(0, 100)}...\n`);
  } catch (error) {
    console.error(`\n❌ Test 1 Failed:`, error);
  }

  // Test 2: Invalid RSS URL (should fallback to YouTube)
  console.log("\n\nTEST 2: Invalid RSS URL (YouTube Fallback)");
  console.log("=".repeat(80));
  try {
    const result2 = await scrapeEpisode({
      podcastName: "Lenny's Podcast",
      title: "Alexander Embiricos OpenAI Codex",
      pubDate: "2025-12-14",
      audioUrl: "https://invalid-url-that-will-fail.com/podcast.mp3"
    });
    console.log(`\n✅ Test 2 Result: Source=${result2.source}`);
    console.log(`Preview: ${result2.transcriptPreview.substring(0, 100)}...\n`);
  } catch (error) {
    console.error(`\n❌ Test 2 Failed:`, error instanceof Error ? error.message : error);
  }

  // Test 3: No RSS URL (should use YouTube directly)
  console.log("\n\nTEST 3: No RSS URL (YouTube Only)");
  console.log("=".repeat(80));
  try {
    const result3 = await scrapeEpisode({
      podcastName: "Lenny's Podcast",
      title: "Alexander Embiricos",
      pubDate: "2025-12-14"
      // No audioUrl provided
    });
    console.log(`\n✅ Test 3 Result: Source=${result3.source}`);
    console.log(`Preview: ${result3.transcriptPreview.substring(0, 100)}...\n`);
  } catch (error) {
    console.error(`\n❌ Test 3 Failed:`, error instanceof Error ? error.message : error);
  }
}

main().catch(console.error);
