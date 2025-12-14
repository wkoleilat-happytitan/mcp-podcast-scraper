# MCP Podcast Scraper

An MCP (Model Context Protocol) server that scrapes and transcribes podcast episodes. Designed to work with **Claude Code** or **Claude Desktop** - you provide the podcast, the MCP transcribes it, and Claude summarizes it.

## What It Does

- 🎙️ **Scrapes podcasts** from YouTube videos or RSS feeds
- 🎯 **Transcribes audio** using Deepgram's fast Nova-2 model
- 📁 **Organizes files** by podcast name and episode date
- 🔄 **Tracks podcasts** for new episodes
- ⏭️ **Skips duplicates** - won't re-scrape already processed episodes
- 📋 **Finds incomplete work** - lists episodes that need summarization

## How It Works

```
You: "Check for new episodes and summarize them"
         ↓
Claude: Calls check_new_episodes() → Finds new episodes
         ↓
Claude: Calls scrape_podcast() → Downloads & transcribes
         ↓
Claude: Calls get_transcript() → Reads the transcript
         ↓
Claude: Summarizes the content
         ↓
Claude: Calls save_summary() → Saves the .md file
         ↓
Done! transcript.md + summary.md saved
```

---

## Installation Guide

### Step 1: Prerequisites

Install required system tools (macOS):

```bash
# Install Homebrew if you don't have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install yt-dlp (for YouTube) and ffmpeg (for audio)
brew install yt-dlp ffmpeg
```

### Step 2: Clone & Build

```bash
# Clone the repository
git clone https://github.com/wkoleilat-happytitan/mcp-podcast-scraper.git
cd mcp-podcast-scraper

# Install dependencies
npm install

# Build
npm run build
```

### Step 3: Get a Deepgram API Key

1. Go to **https://console.deepgram.com/**
2. Sign up (free tier includes **$200 credit** - enough for ~300 hours of audio)
3. Create an API key
4. Copy the key

### Step 4: Configure

Copy the example config file and add your API key:

```bash
# Copy the example config
cp config.example.json config.json

# Edit config.json and add your Deepgram API key
```

Your `config.json` should look like:

```json
{
  "outputDirectory": "./podcasts",
  "deepgramApiKey": "YOUR_ACTUAL_DEEPGRAM_API_KEY",
  "tempDirectory": "./temp"
}
```

> ⚠️ **Important:** Never commit `config.json` to git - it contains your API key! The `.gitignore` already excludes it.

### Step 5: Add to Claude Code

Add this to your Claude Code MCP settings (`~/.cursor/mcp.json` or via Settings → MCP):

```json
{
  "mcpServers": {
    "podcast-scraper": {
      "command": "node",
      "args": ["/FULL/PATH/TO/mcp-podcast-scraper/dist/index.js"]
    }
  }
}
```

**Important:** Replace `/FULL/PATH/TO/` with the actual path to your installation.

### Step 5 (Alternative): Add to Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "podcast-scraper": {
      "command": "node",
      "args": ["/FULL/PATH/TO/mcp-podcast-scraper/dist/index.js"]
    }
  }
}
```

Then restart Claude Desktop.

---

## File Structure

```
mcp-podcast-scraper/
├── config.example.json     # Template - copy to config.json
├── config.json             # Your config (git-ignored, contains API key)
├── tracking.example.json   # Example tracking file
├── tracking.json           # Your tracked podcasts (git-ignored)
├── podcasts/               # Your transcripts & summaries (git-ignored)
├── src/                    # Source code
├── dist/                   # Compiled code (git-ignored)
└── node_modules/           # Dependencies (git-ignored)
```

---

## Usage Examples

### Scrape a Specific Episode

```
"Scrape this YouTube podcast: https://youtube.com/watch?v=..."

"Find and scrape the latest Lex Fridman episode"
```

### Track Podcasts for New Episodes

```
"Track the Huberman Lab podcast: https://feeds.megaphone.fm/hubermanlab"

"Check my tracked podcasts for new episodes"

"List all podcasts I'm tracking"
```

### Find Incomplete Work

```
"Show me episodes that need summaries"

"List incomplete episodes"
```

---

## MCP Tools Reference

| Tool | Description |
|------|-------------|
| `scrape_podcast` | Scrape & transcribe an episode. Returns file path and preview. |
| `get_transcript` | Read the full transcript of a scraped episode. |
| `save_summary` | Save your generated summary to a markdown file. |
| `check_new_episodes` | Check tracked podcasts for new (unscraped) episodes. |
| `list_incomplete` | Find episodes with transcripts but no summaries. |
| `search_podcast` | Search YouTube or parse RSS feeds to find episodes. |
| `add_tracking` | Add a podcast RSS feed to your tracking list. |
| `list_tracking` | List all podcasts you're tracking. |
| `remove_tracking` | Remove a podcast from your tracking list. |

---

## Workflow

### Typical Session

1. **Check for new episodes:**
   ```
   "Check my tracked podcasts for new episodes"
   ```

2. **Scrape each new episode:**
   ```
   "Scrape the first one"
   ```

3. **Get transcript and summarize:**
   ```
   "Get the transcript and summarize it"
   ```

4. **Repeat for remaining episodes**

### Resume Incomplete Work

If you stopped mid-session:
```
"Show me episodes that need summaries"
```

Then for each incomplete episode:
```
"Get the transcript for [episode] and summarize it"
```

---

## Output Structure

Files are organized by podcast and episode:

```
podcasts/
├── Huberman Lab/
│   ├── 2024-12-10 - Episode Title/
│   │   ├── transcript.md
│   │   └── summary.md
│   └── 2024-12-05 - Another Episode/
│       ├── transcript.md
│       └── summary.md
└── Lex Fridman Podcast/
    └── 2024-12-08 - Guest Name/
        ├── transcript.md
        └── summary.md
```

---

## Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `outputDirectory` | Where to save transcripts and summaries. Can be relative or absolute path. | `./podcasts` |
| `deepgramApiKey` | Your Deepgram API key for transcription | Required |
| `tempDirectory` | Temporary directory for audio files (auto-cleaned on startup) | `./temp` |

**Environment variables (optional alternative to config.json):**
- `DEEPGRAM_API_KEY`
- `OUTPUT_DIRECTORY`
- `TEMP_DIRECTORY`

---

## Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Build once
npm run build

# Run MCP server directly
npm start

# Clean build artifacts and temp files
npm run clean

# Test with MCP Inspector (interactive UI)
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## Troubleshooting

### "ffprobe and ffmpeg not found"
```bash
brew install ffmpeg
```

### "Deepgram API key not configured"
Make sure you've copied `config.example.json` to `config.json` and added your API key.

### MCP server not connecting
1. Run `npm run build`
2. Verify path in MCP config is correct
3. Restart Claude Code/Desktop

### "YouTube URLs not supported for tracking"
Use RSS feeds instead. Find podcast RSS feeds at https://getrssfeed.com/

---

## License

MIT
