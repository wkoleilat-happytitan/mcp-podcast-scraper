import { scrapeEpisode } from "../src/services/episode-scraper.js";

async function main() {
  const episodeInfo = {
    podcastName: "Lenny's Podcast",
    title: "Why humans are AI's biggest bottleneck (and what's coming in 2026) | Alexander Embiricos (OpenAI Codex Product Lead)",
    pubDate: "2025-12-14",
    audioUrl: "https://api.substack.com/feed/podcast/180365355/4955680feee2c56710e0774145580c3c.mp3?token=727e2194-baa0-46bf-b46d-46ad627b3f4c"
  };

  try {
    const result = await scrapeEpisode(episodeInfo);

    console.log("\nTranscript preview:");
    console.log(result.transcriptPreview + "...\n");

    console.log(`✓ Full transcript saved to: ${result.transcriptPath}`);
    console.log(`Source: ${result.source.toUpperCase()}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
