import { parseFeed } from "../src/services/sources/rss.js";

async function main() {
  const possibleUrls = [
    "https://creatoreconomy.so/feed",
    "https://creatoreconomy.so/feed/podcast",
    "https://api.substack.com/feed/podcast/creatoreconomy.so"
  ];

  for (const url of possibleUrls) {
    try {
      console.log(`\nTrying: ${url}`);
      const feed = await parseFeed(url);
      console.log(`✓ Success!`);
      console.log(`  Title: ${feed.title}`);
      console.log(`  Episodes: ${feed.episodes.length}`);
      if (feed.episodes[0]) {
        console.log(`  Latest: ${feed.episodes[0].title}`);
      }
      console.log(`\n✅ Working RSS URL: ${url}`);
      break;
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

main();
