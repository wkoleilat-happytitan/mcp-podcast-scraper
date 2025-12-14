import { youtubeDl } from "youtube-dl-exec";
import { join } from "path";
import { config, getProjectRoot } from "../../config.js";
import { mkdirSync, existsSync } from "fs";

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  description: string;
  uploader: string;
  uploadDate: string;
  duration: number;
  url: string;
}

export interface DownloadResult {
  audioPath: string;
  info: YouTubeVideoInfo;
}

/**
 * Check if a URL is a YouTube URL
 */
export function isYouTubeUrl(url: string): boolean {
  return /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
}

/**
 * Get video info from YouTube URL
 */
export async function getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
  const result = await youtubeDl(url, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    preferFreeFormats: true,
  });

  const info = result as {
    id: string;
    title: string;
    description: string;
    uploader: string;
    upload_date: string;
    duration: number;
    webpage_url: string;
  };

  return {
    id: info.id,
    title: info.title,
    description: info.description || "",
    uploader: info.uploader,
    uploadDate: formatDate(info.upload_date),
    duration: info.duration,
    url: info.webpage_url,
  };
}

/**
 * Download audio from YouTube video
 */
export async function downloadAudio(url: string): Promise<DownloadResult> {
  const info = await getVideoInfo(url);
  
  // Ensure temp directory exists
  const tempDir = join(getProjectRoot(), config.tempDirectory);
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = join(tempDir, `${info.id}.%(ext)s`);
  
  await youtubeDl(url, {
    extractAudio: true,
    audioFormat: "mp3",
    audioQuality: 0,
    output: outputPath,
    noCheckCertificates: true,
    noWarnings: true,
  });

  const audioPath = join(tempDir, `${info.id}.mp3`);

  return {
    audioPath,
    info,
  };
}

/**
 * Search YouTube for videos
 */
export async function searchYouTube(query: string, maxResults: number = 10): Promise<YouTubeVideoInfo[]> {
  const searchUrl = `ytsearch${maxResults}:${query}`;
  
  const result = await youtubeDl(searchUrl, {
    dumpSingleJson: true,
    noCheckCertificates: true,
    noWarnings: true,
    flatPlaylist: true,
  });

  // Handle the raw yt-dlp response format
  interface YtDlpEntry {
    id: string;
    title: string;
    description?: string;
    uploader?: string;
    channel?: string;
    upload_date?: string;
    duration?: number;
    url?: string;
  }

  const entries = (result as { entries?: YtDlpEntry[] }).entries || [];
  
  return entries.map((entry) => ({
    id: entry.id,
    title: entry.title || "Unknown Title",
    description: entry.description || "",
    uploader: entry.uploader || entry.channel || "Unknown",
    uploadDate: entry.upload_date ? formatDate(entry.upload_date) : "",
    duration: entry.duration || 0,
    url: entry.url || `https://www.youtube.com/watch?v=${entry.id}`,
  }));
}

/**
 * Format date from YYYYMMDD to YYYY-MM-DD
 */
function formatDate(dateStr: string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

