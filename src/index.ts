#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { config } from "./config.js";
import { isYouTubeUrl, downloadAudio, getVideoInfo, searchYouTube } from "./services/sources/youtube.js";
import { parseFeed, downloadAudioFromUrl } from "./services/sources/rss.js";
import { transcribeAudio } from "./services/transcription.js";
import { 
  saveTranscript, 
  saveSummary, 
  cleanupTempFile,
  cleanupTempDirectory,
  hasTranscript,
  hasSummary,
  readTranscript,
  findIncompleteEpisodes,
  getEpisodeOutputDir,
} from "./services/file-manager.js";
import {
  addTrackedPodcast,
  getTrackedPodcasts,
  removeTrackedPodcast,
  loadTrackingData,
} from "./services/scheduler.js";

const server = new Server(
  {
    name: "mcp-podcast-scraper",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "scrape_podcast",
        description: "Scrape a podcast episode and transcribe it. Returns transcript file path. Use get_transcript to read it, then save_summary after summarizing.",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "YouTube URL, RSS feed URL, or search query for the podcast episode",
            },
            podcastName: {
              type: "string",
              description: "Name of the podcast (for organization)",
            },
            episodeTitle: {
              type: "string",
              description: "Title of the episode (optional, will be auto-detected)",
            },
            force: {
              type: "boolean",
              description: "Force re-scraping even if episode was already scraped (default: false)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_transcript",
        description: "Read the transcript of a previously scraped episode. Use this to get the content for summarization.",
        inputSchema: {
          type: "object",
          properties: {
            podcastName: {
              type: "string",
              description: "Name of the podcast",
            },
            episodeTitle: {
              type: "string",
              description: "Title of the episode",
            },
            episodeDate: {
              type: "string",
              description: "Date of the episode (YYYY-MM-DD format)",
            },
          },
          required: ["podcastName", "episodeTitle", "episodeDate"],
        },
      },
      {
        name: "save_summary",
        description: "Save your generated summary to a markdown file.",
        inputSchema: {
          type: "object",
          properties: {
            podcastName: {
              type: "string",
              description: "Name of the podcast",
            },
            episodeTitle: {
              type: "string",
              description: "Title of the episode",
            },
            episodeDate: {
              type: "string",
              description: "Date of the episode (YYYY-MM-DD format)",
            },
            summaryText: {
              type: "string",
              description: "The summary content in markdown format",
            },
          },
          required: ["podcastName", "episodeTitle", "episodeDate", "summaryText"],
        },
      },
      {
        name: "check_new_episodes",
        description: "Check all tracked podcasts for new episodes that haven't been scraped yet",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "list_incomplete",
        description: "List all episodes that have transcripts but are missing summaries. Use this to find episodes that need summarization.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "search_podcast",
        description: "Search for podcasts or episodes on YouTube, or parse an RSS feed URL to see available episodes",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query for YouTube, or RSS feed URL to parse",
            },
            source: {
              type: "string",
              enum: ["youtube", "rss", "all"],
              description: "Source to search (default: all)",
            },
          },
          required: ["query"],
        },
      },
      {
        name: "add_tracking",
        description: "Add a podcast RSS feed to the tracking list. Use check_new_episodes to find new episodes.",
        inputSchema: {
          type: "object",
          properties: {
            podcastName: {
              type: "string",
              description: "Name of the podcast",
            },
            feedUrl: {
              type: "string",
              description: "RSS feed URL of the podcast",
            },
          },
          required: ["podcastName", "feedUrl"],
        },
      },
      {
        name: "list_tracking",
        description: "List all podcasts currently being tracked",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "remove_tracking",
        description: "Remove a podcast from the tracking list",
        inputSchema: {
          type: "object",
          properties: {
            podcastName: {
              type: "string",
              description: "Name of the podcast to remove",
            },
          },
          required: ["podcastName"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "scrape_podcast":
        return await handleScrapePodcast(args as {
          query: string;
          podcastName?: string;
          episodeTitle?: string;
          force?: boolean;
        });

      case "get_transcript":
        return await handleGetTranscript(args as {
          podcastName: string;
          episodeTitle: string;
          episodeDate: string;
        });

      case "save_summary":
        return await handleSaveSummary(args as {
          podcastName: string;
          episodeTitle: string;
          episodeDate: string;
          summaryText: string;
        });

      case "check_new_episodes":
        return await handleCheckNewEpisodes();

      case "list_incomplete":
        return await handleListIncomplete();

      case "search_podcast":
        return await handleSearchPodcast(args as {
          query: string;
          source?: "youtube" | "rss" | "all";
        });

      case "add_tracking":
        return await handleAddTracking(args as {
          podcastName: string;
          feedUrl: string;
        });

      case "list_tracking":
        return await handleListTracking();

      case "remove_tracking":
        return await handleRemoveTracking(args as { podcastName: string });

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

/**
 * Handle scrape_podcast tool
 * Returns transcript file path (not full content) for efficiency
 */
async function handleScrapePodcast(args: {
  query: string;
  podcastName?: string;
  episodeTitle?: string;
  force?: boolean;
}) {
  const { query, podcastName, episodeTitle, force = false } = args;

  let audioPath: string | null = null;
  let detectedPodcastName: string;
  let detectedEpisodeTitle: string;
  let episodeDate: string;
  let audioUrl: string | null = null;

  // First, get episode info without downloading to check for duplicates
  if (isYouTubeUrl(query)) {
    const info = await getVideoInfo(query);
    detectedPodcastName = podcastName || info.uploader;
    detectedEpisodeTitle = episodeTitle || info.title;
    episodeDate = info.uploadDate || new Date().toISOString().split("T")[0];
  } else if (query.startsWith("http") && (query.includes("rss") || query.includes("feed") || query.includes(".xml") || query.includes("megaphone") || query.includes("libsyn") || query.includes("anchor"))) {
    const feed = await parseFeed(query);
    const latestEpisode = feed.episodes[0];
    
    if (!latestEpisode || !latestEpisode.audioUrl) {
      throw new Error("No episodes with audio found in the RSS feed");
    }

    detectedPodcastName = podcastName || feed.title;
    detectedEpisodeTitle = episodeTitle || latestEpisode.title;
    episodeDate = latestEpisode.pubDate 
      ? new Date(latestEpisode.pubDate).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];
    audioUrl = latestEpisode.audioUrl;
  } else if (query.startsWith("http") && (query.includes(".mp3") || query.includes("traffic.") || query.includes("audio"))) {
    // Direct audio URL
    if (!podcastName || !episodeTitle) {
      throw new Error("When using a direct audio URL, you must provide podcastName and episodeTitle");
    }
    detectedPodcastName = podcastName;
    detectedEpisodeTitle = episodeTitle;
    episodeDate = new Date().toISOString().split("T")[0];
    audioUrl = query;
  } else {
    // Treat as search query - search YouTube
    const results = await searchYouTube(query, 1);
    
    if (results.length === 0) {
      throw new Error(`No results found for: ${query}`);
    }

    const info = await getVideoInfo(results[0].url);
    detectedPodcastName = podcastName || info.uploader;
    detectedEpisodeTitle = episodeTitle || info.title;
    episodeDate = info.uploadDate || new Date().toISOString().split("T")[0];
  }

  // Check if episode already has transcript
  const alreadyHasTranscript = hasTranscript(detectedPodcastName, detectedEpisodeTitle, episodeDate);
  const alreadyHasSummary = hasSummary(detectedPodcastName, detectedEpisodeTitle, episodeDate);

  if (!force && alreadyHasTranscript && alreadyHasSummary) {
    const outputDir = getEpisodeOutputDir(detectedPodcastName, detectedEpisodeTitle, episodeDate);
    return {
      content: [
        {
          type: "text",
          text: `⏭️ Episode already fully processed! Skipping...

**Podcast:** ${detectedPodcastName}
**Episode:** ${detectedEpisodeTitle}
**Date:** ${episodeDate}
**Location:** ${outputDir}

Both transcript and summary exist. To re-scrape, set \`force: true\``,
        },
      ],
    };
  }

  if (!force && alreadyHasTranscript) {
    const outputDir = getEpisodeOutputDir(detectedPodcastName, detectedEpisodeTitle, episodeDate);
    return {
      content: [
        {
          type: "text",
          text: `📝 Transcript already exists (no summary yet)

**Podcast:** ${detectedPodcastName}
**Episode:** ${detectedEpisodeTitle}
**Date:** ${episodeDate}
**Location:** ${outputDir}

Use \`get_transcript\` to read it, then \`save_summary\` after summarizing.
To re-scrape, set \`force: true\``,
        },
      ],
    };
  }

  // Download the audio
  if (isYouTubeUrl(query)) {
    const result = await downloadAudio(query);
    audioPath = result.audioPath;
  } else if (audioUrl) {
    const filename = `${Date.now()}-podcast.mp3`;
    audioPath = await downloadAudioFromUrl(audioUrl, filename);
  } else {
    const results = await searchYouTube(query, 1);
    const result = await downloadAudio(results[0].url);
    audioPath = result.audioPath;
  }

  // Transcribe audio
  const transcription = await transcribeAudio(audioPath);

  // Save transcript
  const transcriptPath = saveTranscript(
    detectedPodcastName,
    detectedEpisodeTitle,
    episodeDate,
    transcription.text
  );

  // Cleanup temp audio file
  cleanupTempFile(audioPath);

  // Return success with instructions (not the full transcript)
  const wordCount = transcription.text.split(/\s+/).length;
  const preview = transcription.text.substring(0, 500) + (transcription.text.length > 500 ? "..." : "");

  return {
    content: [
      {
        type: "text",
        text: `✅ Successfully transcribed!

**Podcast:** ${detectedPodcastName}
**Episode:** ${detectedEpisodeTitle}
**Date:** ${episodeDate}
**Words:** ~${wordCount.toLocaleString()}
**Transcript:** ${transcriptPath}

---

**Preview:**
${preview}

---

**Next steps:**
1. Use \`get_transcript\` to read the full transcript
2. Summarize the content
3. Use \`save_summary\` to save your summary

\`\`\`
get_transcript({
  podcastName: "${detectedPodcastName}",
  episodeTitle: "${detectedEpisodeTitle}",
  episodeDate: "${episodeDate}"
})
\`\`\``,
      },
    ],
  };
}

/**
 * Handle get_transcript tool
 * Reads and returns the full transcript content
 */
async function handleGetTranscript(args: {
  podcastName: string;
  episodeTitle: string;
  episodeDate: string;
}) {
  const { podcastName, episodeTitle, episodeDate } = args;

  const transcript = readTranscript(podcastName, episodeTitle, episodeDate);

  if (!transcript) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Transcript not found for:
- Podcast: ${podcastName}
- Episode: ${episodeTitle}
- Date: ${episodeDate}

Use \`scrape_podcast\` to transcribe this episode first.`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `${transcript}

---

**After summarizing, save with:**
\`\`\`
save_summary({
  podcastName: "${podcastName}",
  episodeTitle: "${episodeTitle}",
  episodeDate: "${episodeDate}",
  summaryText: "YOUR_SUMMARY_HERE"
})
\`\`\``,
      },
    ],
  };
}

/**
 * Handle save_summary tool
 */
async function handleSaveSummary(args: {
  podcastName: string;
  episodeTitle: string;
  episodeDate: string;
  summaryText: string;
}) {
  const { podcastName, episodeTitle, episodeDate, summaryText } = args;

  const summaryPath = saveSummary(
    podcastName,
    episodeTitle,
    episodeDate,
    summaryText
  );

  return {
    content: [
      {
        type: "text",
        text: `✅ Summary saved!

**Podcast:** ${podcastName}
**Episode:** ${episodeTitle}
**Date:** ${episodeDate}
**File:** ${summaryPath}`,
      },
    ],
  };
}

/**
 * Handle check_new_episodes tool
 */
async function handleCheckNewEpisodes() {
  const trackingData = loadTrackingData();
  const podcasts = trackingData.podcasts;

  if (podcasts.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No podcasts are being tracked. Use `add_tracking` to add podcasts first.",
        },
      ],
    };
  }

  const newEpisodes: Array<{
    podcastName: string;
    episodeTitle: string;
    episodeDate: string;
    audioUrl: string;
  }> = [];

  const errors: string[] = [];

  for (const podcast of podcasts) {
    if (!podcast.enabled) continue;

    try {
      if (isYouTubeUrl(podcast.feedUrl)) {
        errors.push(`${podcast.name}: YouTube channel tracking not supported. Use RSS feeds instead.`);
        continue;
      }

      const feed = await parseFeed(podcast.feedUrl);
      
      // Check recent episodes (last 5)
      for (const episode of feed.episodes.slice(0, 5)) {
        if (!episode.audioUrl) continue;

        const episodeDate = episode.pubDate
          ? new Date(episode.pubDate).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        // Check if already has transcript
        if (!hasTranscript(podcast.name, episode.title, episodeDate)) {
          newEpisodes.push({
            podcastName: podcast.name,
            episodeTitle: episode.title,
            episodeDate,
            audioUrl: episode.audioUrl,
          });
        }
      }
    } catch (error) {
      errors.push(`${podcast.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (newEpisodes.length === 0 && errors.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `✅ All caught up! No new episodes found across ${podcasts.length} tracked podcast(s).`,
        },
      ],
    };
  }

  let response = `## New Episodes Found: ${newEpisodes.length}\n\n`;

  if (newEpisodes.length > 0) {
    newEpisodes.forEach((ep, index) => {
      response += `### ${index + 1}. ${ep.podcastName}\n`;
      response += `- **Episode:** ${ep.episodeTitle}\n`;
      response += `- **Date:** ${ep.episodeDate}\n`;
      response += `- **Audio URL:** ${ep.audioUrl}\n\n`;
    });

    response += `---\n\n`;
    response += `To scrape all these episodes, call \`scrape_podcast\` for each audio URL.\n`;
  }

  if (errors.length > 0) {
    response += `\n## Errors\n`;
    errors.forEach((err) => {
      response += `- ${err}\n`;
    });
  }

  return {
    content: [
      {
        type: "text",
        text: response,
      },
    ],
  };
}

/**
 * Handle list_incomplete tool
 * Find episodes with transcripts but no summaries
 */
async function handleListIncomplete() {
  const incomplete = findIncompleteEpisodes();

  if (incomplete.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `✅ All episodes are complete! No missing summaries found.`,
        },
      ],
    };
  }

  let response = `## Episodes Missing Summaries: ${incomplete.length}\n\n`;

  incomplete.forEach((ep, index) => {
    response += `### ${index + 1}. ${ep.podcastName}\n`;
    response += `- **Episode:** ${ep.episodeTitle}\n`;
    response += `- **Date:** ${ep.episodeDate}\n`;
    response += `- **Transcript:** ${ep.transcriptPath}\n\n`;
  });

  response += `---\n\n`;
  response += `Use \`get_transcript\` to read each transcript, summarize it, then \`save_summary\` to save.\n`;

  return {
    content: [
      {
        type: "text",
        text: response,
      },
    ],
  };
}

/**
 * Handle search_podcast tool
 */
async function handleSearchPodcast(args: {
  query: string;
  source?: "youtube" | "rss" | "all";
}) {
  const { query, source = "all" } = args;
  const results: string[] = [];

  if (source === "youtube" || source === "all") {
    try {
      const ytResults = await searchYouTube(query, 5);
      
      if (ytResults.length > 0) {
        results.push("## YouTube Results\n");
        ytResults.forEach((video, index) => {
          results.push(`${index + 1}. **${video.title}**`);
          results.push(`   - Channel: ${video.uploader}`);
          results.push(`   - Date: ${video.uploadDate || "Unknown"}`);
          results.push(`   - Duration: ${Math.floor(video.duration / 60)}m ${video.duration % 60}s`);
          results.push(`   - URL: ${video.url}`);
          results.push("");
        });
      }
    } catch (error) {
      results.push(`YouTube search error: ${error instanceof Error ? error.message : String(error)}\n`);
    }
  }

  if (source === "rss" || source === "all") {
    if (query.startsWith("http")) {
      try {
        const feed = await parseFeed(query);
        results.push("## RSS Feed Results\n");
        results.push(`**Podcast:** ${feed.title}\n`);
        results.push("**Recent Episodes:**\n");
        
        feed.episodes.slice(0, 5).forEach((episode, index) => {
          results.push(`${index + 1}. **${episode.title}**`);
          results.push(`   - Date: ${episode.pubDate}`);
          if (episode.audioUrl) {
            results.push(`   - Audio URL: ${episode.audioUrl}`);
          } else {
            results.push(`   - Audio URL: Not available`);
          }
          results.push("");
        });
      } catch (error) {
        results.push(`RSS parse error: ${error instanceof Error ? error.message : String(error)}\n`);
      }
    } else if (source === "rss") {
      results.push("💡 **Tip:** Provide a direct RSS feed URL to parse it.");
      results.push("Find podcast RSS feeds at: https://getrssfeed.com/\n");
    }
  }

  if (results.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: `No results found for: "${query}"`,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: results.join("\n"),
      },
    ],
  };
}

/**
 * Handle add_tracking tool
 */
async function handleAddTracking(args: {
  podcastName: string;
  feedUrl: string;
}) {
  const { podcastName, feedUrl } = args;

  // Validate it's an RSS feed, not YouTube
  if (isYouTubeUrl(feedUrl)) {
    return {
      content: [
        {
          type: "text",
          text: `❌ YouTube URLs are not supported for tracking. Please provide an RSS feed URL.

To find a podcast's RSS feed:
- Check the podcast's website
- Use https://getrssfeed.com/
- Look for "RSS" link on Apple Podcasts`,
        },
      ],
      isError: true,
    };
  }

  // Validate the feed works
  try {
    const feed = await parseFeed(feedUrl);
    
    const podcast = addTrackedPodcast({
      name: podcastName,
      feedUrl,
    });

    return {
      content: [
        {
          type: "text",
          text: `✅ Added podcast to tracking list!

**Podcast:** ${podcast.name}
**Feed URL:** ${podcast.feedUrl}
**Episodes in feed:** ${feed.episodes.length}

Use \`check_new_episodes\` to find new episodes to scrape.`,
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `❌ Failed to validate RSS feed: ${error instanceof Error ? error.message : String(error)}

Make sure the URL is a valid RSS feed.`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Handle list_tracking tool
 */
async function handleListTracking() {
  const podcasts = getTrackedPodcasts();

  if (podcasts.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No podcasts are currently being tracked.\n\nUse `add_tracking` to add a podcast.",
        },
      ],
    };
  }

  const list = podcasts.map((p, index) => {
    return `${index + 1}. **${p.name}**
   - Feed: ${p.feedUrl}
   - Last Checked: ${p.lastChecked || "Never"}`;
  }).join("\n\n");

  return {
    content: [
      {
        type: "text",
        text: `## Tracked Podcasts (${podcasts.length})\n\n${list}`,
      },
    ],
  };
}

/**
 * Handle remove_tracking tool
 */
async function handleRemoveTracking(args: { podcastName: string }) {
  const { podcastName } = args;

  const removed = removeTrackedPodcast(podcastName);

  if (removed) {
    return {
      content: [
        {
          type: "text",
          text: `✅ Removed "${podcastName}" from tracking list.`,
        },
      ],
    };
  } else {
    return {
      content: [
        {
          type: "text",
          text: `❌ Podcast "${podcastName}" not found in tracking list.`,
        },
      ],
    };
  }
}

// Start the server
async function main() {
  // Clean up temp directory on startup
  cleanupTempDirectory();
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Podcast Scraper server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
