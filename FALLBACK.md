# YouTube Fallback Feature

## Overview

The podcast scraper now includes **automatic YouTube fallback** when RSS audio downloads fail. This ensures maximum reliability when scraping podcast episodes.

## How It Works

```
1. Try RSS Download First
   ↓
2. If RSS fails → Search YouTube automatically
   ↓
3. Find best match → Download from YouTube
   ↓
4. Transcribe & Save (works the same either way)
```

## When Fallback Triggers

The scraper automatically falls back to YouTube when:

- RSS audio URL returns 404 (not found)
- Download fails after redirects
- Audio file is corrupt or empty
- No audio URL is provided at all

## YouTube Search Logic

When searching YouTube, the scraper:

1. Searches for `"{podcast name} {episode title}"`
2. Filters results to find the best match:
   - Contains podcast name in title or uploader
   - Duration > 5 minutes (filters out clips)
   - Picks first matching full episode

3. If no perfect match, uses the first long video (>5 min)

## Usage Examples

### Example 1: RSS Works (No Fallback Needed)

```typescript
import { scrapeEpisode } from "./src/services/episode-scraper.js";

const result = await scrapeEpisode({
  podcastName: "Lenny's Podcast",
  title: "Alexander Embiricos on AI",
  pubDate: "2025-12-14",
  audioUrl: "https://valid-rss-url.com/episode.mp3"
});

// Output: source = 'rss'
```

### Example 2: RSS Fails, YouTube Fallback

```typescript
const result = await scrapeEpisode({
  podcastName: "Lenny's Podcast",
  title: "Alexander Embiricos on AI",
  pubDate: "2025-12-14",
  audioUrl: "https://broken-url.com/nonexistent.mp3" // This will fail
});

// Output:
// ❌ RSS download failed: Failed to download: HTTP 404
// 🔄 Attempting YouTube fallback...
// 🔍 Searching YouTube for: "Lenny's Podcast Alexander Embiricos on AI"
// ✓ Found match: "..." by Lenny's Podcast
// source = 'youtube'
```

### Example 3: No RSS URL (YouTube Only)

```typescript
const result = await scrapeEpisode({
  podcastName: "Lenny's Podcast",
  title: "Alexander Embiricos",
  pubDate: "2025-12-14"
  // No audioUrl provided
});

// Output:
// ⚠️ No audio URL provided, trying YouTube...
// source = 'youtube'
```

## Console Output

The scraper provides clear visual feedback:

```
============================================================
📻 Scraping: Episode Title
============================================================

📥 Attempting download from RSS feed...
❌ RSS download failed: Failed to download: HTTP 404
🔄 Attempting YouTube fallback...

🔍 Searching YouTube for: "Podcast Name Episode Title"
✓ Found match: "Episode Title" by Podcast Channel (85 min)
📥 Downloading from YouTube...
✓ Successfully downloaded from YouTube

🎙️ Transcribing audio (this may take a few minutes)...
✓ Transcription complete: 100,086 characters

💾 Saving transcript...
✓ Saved to: /path/to/transcript.md

============================================================
✅ Successfully scraped episode (source: YOUTUBE)
============================================================
```

## Testing

### Run the Demo

```bash
npm run build
npx tsx scripts/demo-fallback.ts
```

This will:
1. Try to download from a broken RSS URL
2. Automatically fallback to YouTube
3. Show you the full process

### Run Full Tests

```bash
npx tsx scripts/test-fallback.ts
```

Tests three scenarios:
1. Valid RSS (should use RSS)
2. Invalid RSS (should fallback to YouTube)
3. No RSS URL (should use YouTube directly)

## API Reference

### `scrapeEpisode(episodeInfo)`

**Parameters:**
```typescript
interface EpisodeInfo {
  podcastName: string;    // Used for YouTube search
  title: string;          // Episode title
  pubDate: string;        // YYYY-MM-DD format
  audioUrl?: string;      // Optional RSS audio URL
}
```

**Returns:**
```typescript
interface ScrapeResult {
  transcriptPath: string;       // Path to saved transcript
  transcriptPreview: string;    // First 500 characters
  source: 'rss' | 'youtube';   // Which source was used
}
```

**Throws:**
- `AudioDownloadError` - Download failed (with original error)
- `AudioNotFoundError` - Episode not found on YouTube either

## Error Handling

```typescript
try {
  const result = await scrapeEpisode(episodeInfo);
  console.log(`Success! Used ${result.source}`);
} catch (error) {
  if (error instanceof AudioNotFoundError) {
    console.error("Episode not found on RSS or YouTube");
  } else if (error instanceof AudioDownloadError) {
    console.error("Download failed:", error.originalError);
  } else {
    console.error("Unknown error:", error);
  }
}
```

## Configuration

No additional configuration needed! The fallback:
- ✅ Uses your existing YouTube tools (`yt-dlp`)
- ✅ Uses your existing Deepgram API key
- ✅ Works with the MCP server automatically
- ✅ Saves files in the same format

## Benefits

1. **Reliability**: Never miss an episode due to broken RSS links
2. **Automatic**: No manual intervention required
3. **Transparent**: Clear logging shows which source was used
4. **Backwards Compatible**: Existing code continues to work
5. **Smart Matching**: Filters out clips, finds full episodes

## Limitations

- YouTube search requires episode title (can't scrape without it)
- YouTube matching uses heuristics (may occasionally pick wrong video)
- YouTube downloads are slightly slower than direct RSS
- Requires `yt-dlp` to be installed

## Future Enhancements

Potential improvements:
- Manual confirmation before using YouTube match
- Better fuzzy matching for episode titles
- Support for other video platforms (Vimeo, etc.)
- Caching of YouTube search results
- User-configurable search preferences

---

**Built with:** TypeScript, yt-dlp, Deepgram API
