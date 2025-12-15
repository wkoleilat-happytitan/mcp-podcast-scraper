/**
 * Scrape a podcast episode using the episode-scraper with YouTube fallback
 * 
 * Usage: npx tsx scripts/scrape-episode-new.ts <podcast-name> <episode-title> [audio-url] [date]
 * Example: npx tsx scripts/scrape-episode-new.ts "Huberman Lab" "Sleep Episode" "https://example.com/ep.mp3" 2024-12-14
 * 
 * If audio-url is omitted or fails, will automatically search YouTube for the episode.
 */

import { scrapeEpisode } from "../src/services/episode-scraper.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log("Usage: npx tsx scripts/scrape-episode-new.ts <podcast-name> <episode-title> [audio-url] [date]");
    console.log('Example: npx tsx scripts/scrape-episode-new.ts "Huberman Lab" "Sleep Episode" "https://example.com/ep.mp3" 2024-12-14');
    console.log("\nIf audio-url is omitted or fails, will automatically search YouTube.");
    process.exit(1);
  }

  const [podcastName, title, audioUrl, dateArg] = args;
  const pubDate = dateArg || new Date().toISOString().split('T')[0];

  const episodeInfo = {
    podcastName,
    title,
    pubDate,
    audioUrl: audioUrl || undefined,
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
