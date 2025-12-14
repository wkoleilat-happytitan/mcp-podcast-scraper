import Parser from "rss-parser";
import { createWriteStream, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { config, getProjectRoot } from "../../config.js";
import https from "https";
import http from "http";

// Create parser with custom request options to handle SSL issues
const parser = new Parser({
  requestOptions: {
    rejectUnauthorized: false, // Handle self-signed certs
  },
});

export interface PodcastEpisode {
  title: string;
  description: string;
  pubDate: string;
  audioUrl: string;
  duration?: string;
  guid: string;
}

export interface PodcastFeed {
  title: string;
  description: string;
  link: string;
  episodes: PodcastEpisode[];
}

/**
 * Parse an RSS feed URL
 */
export async function parseFeed(feedUrl: string): Promise<PodcastFeed> {
  const feed = await parser.parseURL(feedUrl);

  const episodes: PodcastEpisode[] = (feed.items || []).map((item) => ({
    title: item.title || "Untitled",
    description: item.contentSnippet || item.content || "",
    pubDate: item.pubDate || "",
    audioUrl: item.enclosure?.url || "",
    duration: item.itunes?.duration || undefined,
    guid: item.guid || item.link || item.title || "",
  }));

  return {
    title: feed.title || "Unknown Podcast",
    description: feed.description || "",
    link: feed.link || feedUrl,
    episodes,
  };
}

/**
 * Download audio file from URL
 */
export async function downloadAudioFromUrl(
  audioUrl: string,
  filename: string
): Promise<string> {
  const tempDir = join(getProjectRoot(), config.tempDirectory);
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = join(tempDir, filename);
  
  return new Promise((resolve, reject) => {
    const protocol = audioUrl.startsWith("https") ? https : http;
    
    const file = createWriteStream(outputPath);
    
    protocol.get(audioUrl, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          downloadAudioFromUrl(redirectUrl, filename)
            .then(resolve)
            .catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on("finish", () => {
        file.close();
        resolve(outputPath);
      });
    }).on("error", (err) => {
      file.close();
      reject(err);
    });
  });
}

/**
 * Get the latest episode from a feed
 */
export async function getLatestEpisode(feedUrl: string): Promise<PodcastEpisode | null> {
  const feed = await parseFeed(feedUrl);
  return feed.episodes[0] || null;
}

