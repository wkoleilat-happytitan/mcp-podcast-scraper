import { downloadAudioFromUrl } from "../src/services/sources/rss.js";
import { transcribeAudio } from "../src/services/transcription.js";
import { saveTranscript } from "../src/services/file-manager.js";
import { basename } from "path";

async function main() {
  const episodeInfo = {
    title: "Why humans are AI's biggest bottleneck (and what's coming in 2026) | Alexander Embiricos (OpenAI Codex Product Lead)",
    pubDate: "Sun, 14 Dec 2025 13:31:26 GMT",
    audioUrl: "https://api.substack.com/feed/podcast/180365355/4955680feee2c56710e0774145580c3c.mp3?token=727e2194-baa0-46bf-b46d-46ad627b3f4c",
    podcastName: "Lenny's Podcast"
  };

  try {
    console.log("Downloading audio...");
    const audioPath = await downloadAudioFromUrl(
      episodeInfo.audioUrl,
      `lenny-${Date.now()}.mp3`
    );
    console.log(`Audio downloaded to: ${audioPath}`);

    console.log("\nTranscribing audio (this may take a few minutes)...");
    const transcriptResult = await transcribeAudio(audioPath);
    const transcript = transcriptResult.text;
    console.log(`Transcription complete: ${transcript.length} characters`);

    console.log("\nSaving transcript...");
    const pubDate = new Date(episodeInfo.pubDate);
    const formattedDate = pubDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const savedPath = saveTranscript(
      episodeInfo.podcastName,
      episodeInfo.title,
      formattedDate,
      transcript
    );
    console.log(`Transcript saved to: ${savedPath}`);

    // Print first 500 chars as preview
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
