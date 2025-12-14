import { scrapeEpisode } from "../src/services/episode-scraper.js";

async function main() {
  console.log("Demo: YouTube Fallback Feature");
  console.log("=".repeat(80));
  console.log("\nThis will attempt to download from a BROKEN RSS URL");
  console.log("Then automatically fallback to searching YouTube\n");

  const episodeInfo = {
    podcastName: "Lenny's Podcast",
    title: "Alexander Embiricos OpenAI Codex",
    pubDate: "2025-12-14",
    // This URL will fail, triggering YouTube fallback
    audioUrl: "https://this-will-fail.example.com/nonexistent.mp3"
  };

  try {
    const result = await scrapeEpisode(episodeInfo);

    console.log("\n" + "=".repeat(80));
    console.log("DEMO RESULT");
    console.log("=".repeat(80));
    console.log(`Source used: ${result.source.toUpperCase()}`);
    console.log(`Transcript saved to: ${result.transcriptPath}`);
    console.log(`\nFirst 200 characters:`);
    console.log(result.transcriptPreview.substring(0, 200) + "...\n");
  } catch (error) {
    console.error("\n❌ Demo failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
