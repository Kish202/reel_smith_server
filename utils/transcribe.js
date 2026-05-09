import { AssemblyAI } from 'assemblyai';
import fs from 'fs';

export async function transcribeAudio(audioPath) {
  const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY });

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found at path: ${audioPath}`);
  }

  // Pass the file path as a string — AssemblyAI SDK uploads it automatically
   const transcript = await client.transcripts.transcribe({
  audio: audioPath,
  speech_models: ['universal-3-pro', 'universal-2'],
  punctuate: true,
  format_text: true,
});

  if (transcript.status === 'error') {
    throw new Error(`Transcription failed: ${transcript.error}`);
  }

  // Build timestamped sentences from word-level data
  const sentences = transcript.words && transcript.words.length > 0
    ? buildSentencesFromWords(transcript.words)
    : [{ text: transcript.text, start: 0, end: 60 }];

  return {
    fullText: transcript.text,
    sentences,
  };
}

function buildSentencesFromWords(words) {
  const sentences = [];
  let current = { text: '', start: null, end: null };

  for (const word of words) {
    if (current.start === null) current.start = Math.floor(word.start / 1000);
    current.text += (current.text ? ' ' : '') + word.text;
    current.end = Math.ceil(word.end / 1000);

    const wordCount = current.text.split(' ').length;
    if (word.text.match(/[.!?]$/) || wordCount >= 20) {
      sentences.push({ ...current });
      current = { text: '', start: null, end: null };
    }
  }

  if (current.text) sentences.push(current);
  return sentences;
}
