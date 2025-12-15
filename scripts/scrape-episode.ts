/**
 * Scrape a podcast episode from an audio URL
 * 
 * Usage: npx tsx scripts/scrape-episode.ts <audio-url> <podcast-name> <episode-title> [date]
 * Example: npx tsx scripts/scrape-episode.ts "https://example.com/episode.mp3" "Huberman Lab" "Sleep Episode" 2024-12-14
 */

import { downloadAudioFromUrl } from "../src/services/sources/rss.js";
import { transcribeAudio } from "../src/services/transcription.js";
import { saveTranscript } from "../src/services/file-manager.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.log("Usage: npx tsx scripts/scrape-episode.ts <audio-url> <podcast-name> <episode-title> [date]");
    console.log('Example: npx tsx scripts/scrape-episode.ts "https://example.com/episode.mp3" "Huberman Lab" "Sleep Episode" 2024-12-14');
    process.exit(1);
  }

  const [audioUrl, podcastName, title, dateArg] = args;
  const pubDate = dateArg || new Date().toISOString().split('T')[0];

  try {
    console.log(`Audio URL: ${audioUrl}`);
    console.log(`Podcast: ${podcastName}`);
    console.log(`Episode: ${title}`);
    console.log(`Date: ${pubDate}\n`);

    console.log("Downloading audio...");
    const audioPath = await downloadAudioFromUrl(
      audioUrl,
      `episode-${Date.now()}.mp3`
    );
    console.log(`Audio downloaded to: ${audioPath}`);

    console.log("\nTranscribing audio (this may take a few minutes)...");
    const transcriptResult = await transcribeAudio(audioPath);
    const transcript = transcriptResult.text;
    console.log(`Transcription complete: ${transcript.length} characters`);

    console.log("\nSaving transcript...");
    const savedPath = saveTranscript(podcastName, title, pubDate, transcript);
    console.log(`Transcript saved to: ${savedPath}`);

    console.log("\nTranscript preview:");
    console.log(transcript.substring(0, 500) + "...");

    console.log("\n✓ Success! Transcript saved.");
    console.log(`Full path: ${savedPath}`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
