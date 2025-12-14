import { createClient } from "@deepgram/sdk";
import { readFileSync } from "fs";
import { config } from "../config.js";

export interface TranscriptionResult {
  text: string;
}

/**
 * Transcribe an audio file using Deepgram
 */
export async function transcribeAudio(audioFilePath: string): Promise<TranscriptionResult> {
  if (!config.deepgramApiKey) {
    throw new Error("Deepgram API key not configured. Set it in config.json or DEEPGRAM_API_KEY environment variable.");
  }

  const deepgram = createClient(config.deepgramApiKey);
  const audioBuffer = readFileSync(audioFilePath);

  const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: "nova-2",
      smart_format: true,
      punctuate: true,
      paragraphs: true,
    }
  );

  if (error) {
    throw new Error(`Deepgram error: ${error.message}`);
  }

  const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
  
  return { text: transcript };
}
