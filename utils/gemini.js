import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

export async function findViralMoments(transcript, sentences) {
  const prompt = `You are a viral content strategist. Analyze this video transcript and find the 3-5 best moments to clip for viral short-form content (TikTok, Reels, YouTube Shorts).

Each clip should be 30–90 seconds long, have a strong hook, and be self-contained.

Transcript with timestamps (start/end in seconds):
${sentences.map(s => `[${s.start}s - ${s.end}s]: ${s.text}`).join('\n')}

Return ONLY a valid JSON array like this (no markdown, no explanation, no backticks):
[
  {
    "title": "Catchy clip title",
    "hook": "One sentence explaining why this goes viral",
    "start": 45,
    "end": 98,
    "viralScore": 92
  }
]`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();
  const clean = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

export async function generateBlogPost(transcript, videoTitle) {
  const prompt = `You are a professional content writer. Convert this video transcript into a well-structured, engaging blog post.

Video Title: ${videoTitle || 'Untitled Video'}

Transcript:
${transcript}

Write a blog post with:
- A compelling headline
- An intro paragraph
- 3-5 main sections with subheadings
- A conclusion with a call to action
- SEO-friendly, conversational tone

Return the blog post in clean markdown format.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
