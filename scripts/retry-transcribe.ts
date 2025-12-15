/**
 * Retry transcription for a specific audio file
 * 
 * Usage: npx tsx scripts/retry-transcribe.ts <audio-path> <podcast-name> <episode-title> <date>
 * Example: npx tsx scripts/retry-transcribe.ts ./temp/episode.mp3 "Huberman Lab" "Sleep Episode" 2024-12-14
 */

import { transcribeAudio } from "../src/services/transcription.js";
import { saveTranscript } from "../src/services/file-manager.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 4) {
    console.log("Usage: npx tsx scripts/retry-transcribe.ts <audio-path> <podcast-name> <episode-title> <date>");
    console.log("Example: npx tsx scripts/retry-transcribe.ts ./temp/episode.mp3 \"Huberman Lab\" \"Sleep Episode\" 2024-12-14");
    process.exit(1);
  }

  const [audioPath, podcastName, title, pubDate] = args;

  try {
    console.log(`Transcribing: ${audioPath}`);
    console.log(`Podcast: ${podcastName}`);
    console.log(`Episode: ${title}`);
    console.log(`Date: ${pubDate}\n`);

    console.log("Transcribing audio (this may take a few minutes)...");
    const transcriptResult = await transcribeAudio(audioPath);
    const transcript = transcriptResult.text;
    console.log(`Transcription complete: ${transcript.length} characters`);

    console.log("\nSaving transcript...");
    const savedPath = saveTranscript(podcastName, title, pubDate, transcript);
    console.log(`Transcript saved to: ${savedPath}`);

    console.log("\nTranscript preview:");
    console.log(transcript.substring(0, 1000) + "...\n");

    console.log("✓ Success!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
