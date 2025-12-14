import { transcribeAudio } from "../src/services/transcription.js";
import { saveTranscript } from "../src/services/file-manager.js";

async function main() {
  const audioPath = "/Users/walidkoleilat/Projects/mcp-podcast-scraper/temp/lenny-1765743578549.mp3";
  const episodeInfo = {
    title: "Why humans are AI's biggest bottleneck (and what's coming in 2026) | Alexander Embiricos (OpenAI Codex Product Lead)",
    pubDate: "2025-12-14",
    podcastName: "Lenny's Podcast"
  };

  try {
    console.log("Transcribing audio (this may take a few minutes)...");
    const transcriptResult = await transcribeAudio(audioPath);
    const transcript = transcriptResult.text;
    console.log(`Transcription complete: ${transcript.length} characters`);

    console.log("\nSaving transcript...");
    const savedPath = saveTranscript(
      episodeInfo.podcastName,
      episodeInfo.title,
      episodeInfo.pubDate,
      transcript
    );
    console.log(`Transcript saved to: ${savedPath}`);

    // Print first 1000 chars as preview
    console.log("\nTranscript preview:");
    console.log(transcript.substring(0, 1000) + "...\n");

    console.log("✓ Success!");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
