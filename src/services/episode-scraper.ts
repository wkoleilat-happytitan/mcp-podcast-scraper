import { downloadAudioFromUrl } from "./sources/rss.js";
import { searchYouTube, downloadAudio as downloadYouTubeAudio } from "./sources/youtube.js";
import { transcribeAudio } from "./transcription.js";
import { saveTranscript } from "./file-manager.js";

export interface EpisodeInfo {
  podcastName: string;
  title: string;
  pubDate: string;
  audioUrl?: string;
}

export interface ScrapeResult {
  transcriptPath: string;
  transcriptPreview: string;
  source: 'rss' | 'youtube';
}

/**
 * Custom error types for better error handling
 */
export class AudioDownloadError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'AudioDownloadError';
  }
}

export class AudioNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AudioNotFoundError';
  }
}

/**
 * Search YouTube for a podcast episode
 */
async function searchYouTubeForEpisode(
  podcastName: string,
  episodeTitle: string
): Promise<string | null> {
  console.log(`\n🔍 Searching YouTube for: "${podcastName} ${episodeTitle}"`);

  const query = `${podcastName} ${episodeTitle}`;
  const results = await searchYouTube(query, 5);

  if (results.length === 0) {
    return null;
  }

  // Simple heuristic: Pick the first result that:
  // 1. Contains the podcast name in the title or uploader
  // 2. Is longer than 5 minutes (likely full episode, not clip)
  const podcastNameLower = podcastName.toLowerCase();

  for (const result of results) {
    const titleLower = result.title.toLowerCase();
    const uploaderLower = result.uploader.toLowerCase();
    const isLikelyMatch = titleLower.includes(podcastNameLower) || uploaderLower.includes(podcastNameLower);
    const isFullEpisode = result.duration > 300; // 5 minutes

    if (isLikelyMatch && isFullEpisode) {
      console.log(`✓ Found match: "${result.title}" by ${result.uploader} (${Math.floor(result.duration / 60)} min)`);
      return result.url;
    }
  }

  // If no perfect match, return the first long video
  const firstLongVideo = results.find(r => r.duration > 300);
  if (firstLongVideo) {
    console.log(`⚠️ No perfect match, using: "${firstLongVideo.title}" (${Math.floor(firstLongVideo.duration / 60)} min)`);
    return firstLongVideo.url;
  }

  return null;
}

/**
 * Download audio from RSS with automatic YouTube fallback
 */
async function downloadAudioWithFallback(
  episodeInfo: EpisodeInfo
): Promise<{ audioPath: string; source: 'rss' | 'youtube' }> {
  // Try RSS first if we have an audio URL
  if (episodeInfo.audioUrl) {
    try {
      console.log("📥 Attempting download from RSS feed...");
      const audioPath = await downloadAudioFromUrl(
        episodeInfo.audioUrl,
        `${episodeInfo.podcastName.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.mp3`
      );
      console.log(`✓ Successfully downloaded from RSS`);
      return { audioPath, source: 'rss' };
    } catch (error) {
      console.log(`❌ RSS download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.log(`🔄 Attempting YouTube fallback...`);
    }
  } else {
    console.log(`⚠️ No audio URL provided, trying YouTube...`);
  }

  // Fallback to YouTube
  const youtubeUrl = await searchYouTubeForEpisode(
    episodeInfo.podcastName,
    episodeInfo.title
  );

  if (!youtubeUrl) {
    throw new AudioNotFoundError(
      `Could not find episode on YouTube: "${episodeInfo.title}"`
    );
  }

  console.log(`📥 Downloading from YouTube...`);
  const result = await downloadYouTubeAudio(youtubeUrl);
  console.log(`✓ Successfully downloaded from YouTube`);

  return { audioPath: result.audioPath, source: 'youtube' };
}

/**
 * Scrape and transcribe a podcast episode with automatic fallback
 */
export async function scrapeEpisode(episodeInfo: EpisodeInfo): Promise<ScrapeResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📻 Scraping: ${episodeInfo.title}`);
  console.log(`${'='.repeat(60)}\n`);

  // Download audio (with fallback)
  const { audioPath, source } = await downloadAudioWithFallback(episodeInfo);
  console.log(`Audio file: ${audioPath}`);

  // Transcribe
  console.log(`\n🎙️ Transcribing audio (this may take a few minutes)...`);
  const transcriptResult = await transcribeAudio(audioPath);
  const transcript = transcriptResult.text;
  console.log(`✓ Transcription complete: ${transcript.length.toLocaleString()} characters`);

  // Save transcript
  console.log(`\n💾 Saving transcript...`);
  const transcriptPath = saveTranscript(
    episodeInfo.podcastName,
    episodeInfo.title,
    episodeInfo.pubDate,
    transcript
  );
  console.log(`✓ Saved to: ${transcriptPath}`);

  // Generate preview
  const transcriptPreview = transcript.substring(0, 500);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ Successfully scraped episode (source: ${source.toUpperCase()})`);
  console.log(`${'='.repeat(60)}\n`);

  return {
    transcriptPath,
    transcriptPreview,
    source,
  };
}
