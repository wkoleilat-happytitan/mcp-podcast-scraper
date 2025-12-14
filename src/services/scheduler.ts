/**
 * Podcast tracking management
 * Stores which podcasts to track for new episodes
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { getProjectRoot } from "../config.js";

export interface TrackedPodcast {
  id: string;
  name: string;
  feedUrl: string;
  lastChecked?: string;
  lastEpisodeGuid?: string;
  enabled: boolean;
}

export interface TrackingData {
  podcasts: TrackedPodcast[];
}

const trackingFilePath = join(getProjectRoot(), "tracking.json");

/**
 * Load tracking data from file
 */
export function loadTrackingData(): TrackingData {
  if (!existsSync(trackingFilePath)) {
    return { podcasts: [] };
  }
  
  try {
    const content = readFileSync(trackingFilePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return { podcasts: [] };
  }
}

/**
 * Save tracking data to file
 */
export function saveTrackingData(data: TrackingData): void {
  writeFileSync(trackingFilePath, JSON.stringify(data, null, 2), "utf-8");
}

/**
 * Add a podcast to tracking
 */
export function addTrackedPodcast(podcast: Omit<TrackedPodcast, "id" | "enabled">): TrackedPodcast {
  const data = loadTrackingData();
  
  // Check if already exists
  const existing = data.podcasts.find(
    p => p.name.toLowerCase() === podcast.name.toLowerCase() || p.feedUrl === podcast.feedUrl
  );
  
  if (existing) {
    return existing;
  }
  
  const newPodcast: TrackedPodcast = {
    ...podcast,
    id: generateId(),
    enabled: true,
  };
  
  data.podcasts.push(newPodcast);
  saveTrackingData(data);
  
  return newPodcast;
}

/**
 * Remove a podcast from tracking by name
 */
export function removeTrackedPodcast(name: string): boolean {
  const data = loadTrackingData();
  const initialLength = data.podcasts.length;
  
  data.podcasts = data.podcasts.filter(
    (p) => p.name.toLowerCase() !== name.toLowerCase()
  );
  
  if (data.podcasts.length !== initialLength) {
    saveTrackingData(data);
    return true;
  }
  
  return false;
}

/**
 * Get all tracked podcasts
 */
export function getTrackedPodcasts(): TrackedPodcast[] {
  return loadTrackingData().podcasts;
}

/**
 * Update last checked info for a podcast
 */
export function updatePodcastLastChecked(id: string, episodeGuid?: string): void {
  const data = loadTrackingData();
  const podcast = data.podcasts.find((p) => p.id === id);
  
  if (podcast) {
    podcast.lastChecked = new Date().toISOString();
    if (episodeGuid) {
      podcast.lastEpisodeGuid = episodeGuid;
    }
    saveTrackingData(data);
  }
}

/**
 * Generate a simple ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}
