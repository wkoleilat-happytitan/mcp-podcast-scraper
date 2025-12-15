/**
 * Get the latest episode from an RSS feed
 * 
 * Usage: npx tsx scripts/get-latest-episode.ts <rss-feed-url>
 * Example: npx tsx scripts/get-latest-episode.ts "https://feeds.megaphone.fm/hubermanlab"
 */

import { parseFeed } from "../src/services/sources/rss.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log("Usage: npx tsx scripts/get-latest-episode.ts <rss-feed-url>");
    console.log('Example: npx tsx scripts/get-latest-episode.ts "https://feeds.megaphone.fm/hubermanlab"');
    process.exit(1);
  }

  const feedUrl = args[0];

  try {
    console.log(`Fetching feed: ${feedUrl}\n`);
    const feed = await parseFeed(feedUrl);
    
    console.log(`Podcast: ${feed.title}`);
    console.log(`Total episodes: ${feed.episodes.length}\n`);

    const latest = feed.episodes[0];

    if (latest) {
      console.log("Latest Episode:");
      console.log(JSON.stringify({
        title: latest.title,
        pubDate: latest.pubDate,
        audioUrl: latest.audioUrl,
        duration: latest.duration,
        description: latest.description ? latest.description.substring(0, 200) + "..." : "No description"
      }, null, 2));
    } else {
      console.log("No episodes found");
    }
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
