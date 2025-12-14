import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

export interface Config {
  outputDirectory: string;
  deepgramApiKey: string;
  tempDirectory: string;
}

function loadConfig(): Config {
  const configPath = join(projectRoot, "config.json");
  
  let fileConfig: Partial<Config> = {};
  
  if (existsSync(configPath)) {
    try {
      const configContent = readFileSync(configPath, "utf-8");
      fileConfig = JSON.parse(configContent);
    } catch (error) {
      console.error("Error reading config.json:", error);
    }
  }

  const config: Config = {
    outputDirectory: process.env.OUTPUT_DIRECTORY || fileConfig.outputDirectory || "./podcasts",
    deepgramApiKey: process.env.DEEPGRAM_API_KEY || fileConfig.deepgramApiKey || "",
    tempDirectory: process.env.TEMP_DIRECTORY || fileConfig.tempDirectory || "./temp",
  };

  return config;
}

export const config = loadConfig();

export function getProjectRoot(): string {
  return projectRoot;
}
