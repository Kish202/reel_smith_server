import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cache directory — shared across all jobs
const CACHE_DIR = path.join(__dirname, '..', 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

function getVideoId(url) {
  // Create a hash of the URL to use as cache key
  return crypto.createHash('md5').update(url).digest('hex');
}

export async function downloadYouTubeVideo(url, jobId) {
  const outputDir = path.join(__dirname, '..', 'outputs', jobId);
  fs.mkdirSync(outputDir, { recursive: true });

  const videoId = getVideoId(url);
  const cachedPath = path.join(CACHE_DIR, `${videoId}.mp4`);

  // Return cached video if it exists
  if (fs.existsSync(cachedPath)) {
    console.log(`Cache hit for ${url} — skipping download`);
    const finalPath = path.join(outputDir, 'source.mp4');
    fs.copyFileSync(cachedPath, finalPath);
    return finalPath;
  }

  console.log(`Cache miss for ${url} — downloading...`);
  const outputTemplate = path.join(outputDir, 'source.%(ext)s');
  const cmd = `yt-dlp -f "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best[height<=720]/best" --merge-output-format mp4 -o '${outputTemplate}' '${url}'`;

  await execAsync(cmd, { timeout: 300000 });

  // Find whatever file yt-dlp actually created
  const files = fs.readdirSync(outputDir);
  const videoFile = files.find(f => f.startsWith('source.'));

  if (!videoFile) {
    throw new Error('Video download failed — file not found after yt-dlp');
  }

  // Rename to source.mp4 if different extension
  const downloadedPath = path.join(outputDir, videoFile);
  const finalPath = path.join(outputDir, 'source.mp4');
  if (downloadedPath !== finalPath) {
    fs.renameSync(downloadedPath, finalPath);
  }

  // Save to cache for next time
  fs.copyFileSync(finalPath, cachedPath);
  console.log(`Cached video at ${cachedPath}`);

  return finalPath;
}

export async function extractAudio(videoPath, jobId) {
  const outputDir = path.dirname(videoPath);
  const audioPath = path.join(outputDir, 'audio.mp3');

  const cmd = `ffmpeg -i '${videoPath}' -vn -acodec libmp3lame -q:a 2 '${audioPath}' -y`;
  await execAsync(cmd, { timeout: 120000 });

  return audioPath;
}

export async function cutClip(videoPath, startSec, endSec, outputPath) {
  const duration = endSec - startSec;
  const cmd = `ffmpeg -ss ${startSec} -i '${videoPath}' -t ${duration} -c:v libx264 -c:a aac -preset fast '${outputPath}' -y`;
  await execAsync(cmd, { timeout: 120000 });
  return outputPath;
}
