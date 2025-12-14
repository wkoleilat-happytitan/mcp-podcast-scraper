import { parseFeed } from "../src/services/sources/rss.js";

async function main() {
  const feedUrl = "https://api.substack.com/feed/podcast/spotify/727e2194-baa0-46bf-b46d-46ad627b3f4c/10845.rss";

  try {
    const feed = await parseFeed(feedUrl);
    const latest = feed.episodes[0];

    if (latest) {
      console.log(JSON.stringify({
        title: latest.title,
        pubDate: latest.pubDate,
        audioUrl: latest.audioUrl,
        duration: latest.duration,
        description: latest.description.substring(0, 200) + "..."
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
