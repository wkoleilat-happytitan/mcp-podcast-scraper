import { mkdirSync, writeFileSync, existsSync, unlinkSync, readFileSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { config, getProjectRoot } from "../config.js";

/**
 * Sanitize a string for use as a filename
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 100);
}

/**
 * Get the root output directory
 */
export function getOutputRootDir(): string {
  return config.outputDirectory.startsWith("/")
    ? config.outputDirectory
    : join(getProjectRoot(), config.outputDirectory);
}

/**
 * Get the output directory for a podcast episode
 */
export function getEpisodeOutputDir(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string
): string {
  const rootDir = getOutputRootDir();
  const sanitizedPodcastName = sanitizeFilename(podcastName);
  const sanitizedEpisodeTitle = sanitizeFilename(episodeTitle);
  const folderName = `${episodeDate} - ${sanitizedEpisodeTitle}`;

  return join(rootDir, sanitizedPodcastName, folderName);
}

/**
 * Ensure the output directory exists
 */
export function ensureOutputDir(dirPath: string): void {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Save transcript to file
 */
export function saveTranscript(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string,
  transcript: string
): string {
  const outputDir = getEpisodeOutputDir(podcastName, episodeTitle, episodeDate);
  ensureOutputDir(outputDir);

  const content = `# ${episodeTitle}

**Podcast:** ${podcastName}  
**Date:** ${episodeDate}

---

## Transcript

${transcript}
`;

  const filePath = join(outputDir, "transcript.md");
  writeFileSync(filePath, content, "utf-8");

  return filePath;
}

/**
 * Save summary to file
 */
export function saveSummary(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string,
  summary: string
): string {
  const outputDir = getEpisodeOutputDir(podcastName, episodeTitle, episodeDate);
  ensureOutputDir(outputDir);

  const content = `# ${episodeTitle} - Summary

**Podcast:** ${podcastName}  
**Date:** ${episodeDate}

---

${summary}
`;

  const filePath = join(outputDir, "summary.md");
  writeFileSync(filePath, content, "utf-8");

  return filePath;
}

/**
 * Clean up temporary audio file
 */
export function cleanupTempFile(filePath: string): void {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed to cleanup temp file:", error);
  }
}

/**
 * Clean up all temp files
 */
export function cleanupTempDirectory(): void {
  const tempDir = join(getProjectRoot(), config.tempDirectory);
  try {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    mkdirSync(tempDir, { recursive: true });
  } catch (error) {
    console.error("Failed to cleanup temp directory:", error);
  }
}

/**
 * Check if transcript exists for an episode
 */
export function hasTranscript(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string
): boolean {
  const outputDir = getEpisodeOutputDir(podcastName, episodeTitle, episodeDate);
  const transcriptPath = join(outputDir, "transcript.md");
  return existsSync(transcriptPath);
}

/**
 * Check if summary exists for an episode
 */
export function hasSummary(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string
): boolean {
  const outputDir = getEpisodeOutputDir(podcastName, episodeTitle, episodeDate);
  const summaryPath = join(outputDir, "summary.md");
  return existsSync(summaryPath);
}

/**
 * Check if an episode has been fully processed (has both transcript and summary)
 */
export function isEpisodeScraped(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string
): boolean {
  return hasTranscript(podcastName, episodeTitle, episodeDate) && 
         hasSummary(podcastName, episodeTitle, episodeDate);
}

/**
 * Get existing episode info if already scraped
 */
export function getExistingEpisodeInfo(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string
): { transcriptPath: string; summaryPath: string } | null {
  const outputDir = getEpisodeOutputDir(podcastName, episodeTitle, episodeDate);
  const transcriptPath = join(outputDir, "transcript.md");
  const summaryPath = join(outputDir, "summary.md");
  
  if (existsSync(transcriptPath) && existsSync(summaryPath)) {
    return { transcriptPath, summaryPath };
  }
  
  return null;
}

/**
 * Read transcript content from file
 */
export function readTranscript(
  podcastName: string,
  episodeTitle: string,
  episodeDate: string
): string | null {
  const outputDir = getEpisodeOutputDir(podcastName, episodeTitle, episodeDate);
  const transcriptPath = join(outputDir, "transcript.md");
  
  if (!existsSync(transcriptPath)) {
    return null;
  }
  
  return readFileSync(transcriptPath, "utf-8");
}

/**
 * List all episodes for a podcast
 */
export function listPodcastEpisodes(podcastName: string): Array<{
  episodeTitle: string;
  episodeDate: string;
  hasTranscript: boolean;
  hasSummary: boolean;
  folderPath: string;
}> {
  const rootDir = getOutputRootDir();
  const sanitizedPodcastName = sanitizeFilename(podcastName);
  const podcastDir = join(rootDir, sanitizedPodcastName);
  
  if (!existsSync(podcastDir)) {
    return [];
  }
  
  const episodes: Array<{
    episodeTitle: string;
    episodeDate: string;
    hasTranscript: boolean;
    hasSummary: boolean;
    folderPath: string;
  }> = [];
  
  const folders = readdirSync(podcastDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  
  for (const folder of folders) {
    // Parse folder name: "YYYY-MM-DD - Episode Title"
    const match = folder.match(/^(\d{4}-\d{2}-\d{2}) - (.+)$/);
    if (!match) continue;
    
    const [, date, title] = match;
    const folderPath = join(podcastDir, folder);
    
    episodes.push({
      episodeDate: date,
      episodeTitle: title,
      hasTranscript: existsSync(join(folderPath, "transcript.md")),
      hasSummary: existsSync(join(folderPath, "summary.md")),
      folderPath,
    });
  }
  
  // Sort by date descending (newest first)
  return episodes.sort((a, b) => b.episodeDate.localeCompare(a.episodeDate));
}

/**
 * List all podcasts in the output directory
 */
export function listAllPodcasts(): string[] {
  const rootDir = getOutputRootDir();
  
  if (!existsSync(rootDir)) {
    return [];
  }
  
  return readdirSync(rootDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

/**
 * Find all episodes that have transcripts but no summaries
 */
export function findIncompleteEpisodes(): Array<{
  podcastName: string;
  episodeTitle: string;
  episodeDate: string;
  transcriptPath: string;
}> {
  const podcasts = listAllPodcasts();
  const incomplete: Array<{
    podcastName: string;
    episodeTitle: string;
    episodeDate: string;
    transcriptPath: string;
  }> = [];
  
  for (const podcastName of podcasts) {
    const episodes = listPodcastEpisodes(podcastName);
    
    for (const episode of episodes) {
      if (episode.hasTranscript && !episode.hasSummary) {
        incomplete.push({
          podcastName,
          episodeTitle: episode.episodeTitle,
          episodeDate: episode.episodeDate,
          transcriptPath: join(episode.folderPath, "transcript.md"),
        });
      }
    }
  }
  
  return incomplete;
}
