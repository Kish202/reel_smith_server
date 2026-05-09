import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { createJob, updateJob } from '../utils/jobStore.js';
import { downloadYouTubeVideo, extractAudio, cutClip } from '../utils/videoUtils.js';
import { transcribeAudio } from '../utils/transcribe.js';
import { findViralMoments, generateBlogPost } from '../utils/gemini.js';
import { optionalAuth } from '../middleware/authMiddleware.js';
import {
  checkIpRateLimit,
  checkUserRateLimit,
  recordUserJob,
  isBlacklisted,
  recordFailure,
  validateYouTubeUrl,
  validateRequestBody,
  getClientIp,
} from '../utils/security.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The one fixed demo video (3 min TED talk)
const DEMO_URL = 'https://www.youtube.com/watch?v=arj7oStGLkU';

// Demo route — no login needed, fixed video only
router.post('/demo', async (req, res) => {
  const ip = getClientIp(req);

  if (isBlacklisted(ip)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  const limit = checkIpRateLimit(ip);
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.message });
  }

  const jobId = uuidv4();
  createJob(jobId);
  res.json({ jobId, demo: true });

  runPipeline(jobId, DEMO_URL);
});

// Full route — login required, any YouTube URL
router.post('/', optionalAuth, async (req, res) => {
  const ip = getClientIp(req);

  if (isBlacklisted(ip)) {
    return res.status(403).json({ error: 'Access denied.' });
  }

  // Must be logged in
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in to use ReelSmith with your own videos.' });
  }

  const bodyCheck = validateRequestBody(req.body);
  if (!bodyCheck.valid) {
    recordFailure(ip);
    return res.status(400).json({ error: bodyCheck.reason });
  }

  const rawUrl = req.body.youtubeUrl;
  if (!rawUrl) {
    recordFailure(ip);
    return res.status(400).json({ error: 'youtubeUrl is required' });
  }

  const cleanUrl = rawUrl.replace(/^(https?:\/\/)+/, 'https://').trim();
  const urlCheck = validateYouTubeUrl(cleanUrl);
  if (!urlCheck.valid) {
    recordFailure(ip);
    return res.status(400).json({ error: urlCheck.reason });
  }

  // Check per-user rate limit
  const userLimit = await checkUserRateLimit(req.user._id);
  if (!userLimit.allowed) {
    return res.status(429).json({ error: userLimit.message });
  }

  const jobId = uuidv4();
  createJob(jobId);
  res.json({ jobId });

  await recordUserJob(req.user._id);
  runPipeline(jobId, cleanUrl);
});

async function runPipeline(jobId, youtubeUrl) {
  try {
    updateJob(jobId, { status: 'processing', progress: 10, step: 'Downloading video...' });
    const videoPath = await downloadYouTubeVideo(youtubeUrl, jobId);

    updateJob(jobId, { progress: 25, step: 'Extracting audio...' });
    const audioPath = await extractAudio(videoPath, jobId);

    updateJob(jobId, { progress: 40, step: 'Transcribing with AssemblyAI...' });
    const { fullText, sentences } = await transcribeAudio(audioPath);

    updateJob(jobId, { progress: 60, step: 'Finding viral moments with Gemini AI...' });
    const moments = await findViralMoments(fullText, sentences);

    updateJob(jobId, { progress: 75, step: 'Cutting clips with ffmpeg...' });
    const outputDir = path.join(__dirname, '..', 'outputs', jobId);
    const clips = [];

    for (let i = 0; i < moments.length; i++) {
      const m = moments[i];
      const clipFilename = `clip_${i + 1}.mp4`;
      const clipPath = path.join(outputDir, clipFilename);
      await cutClip(videoPath, m.start, m.end, clipPath);
      clips.push({
        ...m,
        filename: clipFilename,
        url: `/outputs/${jobId}/${clipFilename}`,
        duration: m.end - m.start,
      });
    }

    updateJob(jobId, { progress: 90, step: 'Generating blog post...' });
    const blogPost = await generateBlogPost(fullText);

    updateJob(jobId, {
      status: 'done',
      progress: 100,
      step: 'Done!',
      clips,
      blogPost,
    });
  } catch (err) {
    console.error('Pipeline error:', err);
    updateJob(jobId, {
      status: 'error',
      step: 'Something went wrong',
      error: err.message,
    });
  }
}

export default router;
