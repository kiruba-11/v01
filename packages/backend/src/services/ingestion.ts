import dns from 'dns/promises';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';
import { YoutubeTranscript } from 'youtube-transcript';
import axios from 'axios';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('ingestion');

export type YouTubeSourceStatus = 'transcript' | 'metadata_only' | 'music_track' | 'blocked' | 'unavailable' | 'network_error';

export interface YouTubeIngestionResult {
  status: YouTubeSourceStatus;
  reason: string;
  title: string;
  channel: string;
  text: string;
  metadata: {
    sourceType: 'youtube';
    url: string;
    videoId: string;
    author: string;
    duration?: number;
    uploadDate?: string;
    tags?: string[];
    chapters?: any[];
    thumbnail?: string;
    artist?: string;
    album?: string;
    label?: string;
    releaseDate?: string;
    [key: string]: any;
  };
  chunksWithMetadata: Array<{ content: string; location: any }>;
}

const youtubeCache = new Map<string, YouTubeIngestionResult>();

export async function validateAndParseUrl(urlString: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new Error('Invalid URL format');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only HTTP and HTTPS protocols are allowed');
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check loopback / localhost / private IP patterns
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    hostname === '169.254.169.254' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local')
  ) {
    throw new Error('Access to private, internal, or loopback network addresses is prohibited');
  }

  try {
    const addresses = await dns.resolve4(hostname);
    for (const addr of addresses) {
      if (
        addr.startsWith('10.') ||
        addr.startsWith('192.168.') ||
        addr.startsWith('127.') ||
        addr.startsWith('169.254.') ||
        (addr.startsWith('172.') && (parseInt(addr.split('.')[1], 10) >= 16 && parseInt(addr.split('.')[1], 10) <= 31))
      ) {
        throw new Error('Access to restricted IP address ranges is prohibited');
      }
    }
  } catch (dnsErr: any) {
    if (dnsErr.message.includes('restricted')) {
      throw dnsErr;
    }
  }

  return parsed;
}

export function extractYouTubeVideoId(urlStr: string): string | null {
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = urlStr.match(regExp);
  return match ? match[1] : null;
}

export async function extractWebArticle(url: string): Promise<{ title: string; text: string; metadata: Record<string, any> }> {
  const validatedUrl = await validateAndParseUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  let response: Response;
  try {
    response = await fetch(validatedUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) SourcePilot/1.0 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
    throw new Error(`Unsupported content type: ${contentType}`);
  }

  const html = await response.text();
  if (html.length > 15 * 1024 * 1024) {
    throw new Error('Page content exceeds maximum allowed size (15MB)');
  }

  const dom = new JSDOM(html, { url: validatedUrl.toString() });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  let title = article?.title || dom.window.document.title || validatedUrl.toString();
  let text = article?.textContent || '';
  const byline = article?.byline || '';
  const excerpt = article?.excerpt || '';

  if (!text || text.trim().length < 50) {
    const doc = dom.window.document;
    const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, header, aside, .cookie-banner, .ads, .advertisement');
    elementsToRemove.forEach(el => el.remove());
    text = doc.body?.textContent || dom.window.document.documentElement.textContent || '';
  }

  text = text.replace(/\s+/g, ' ').trim();

  if (!text || text.length < 20) {
    throw new Error('Extracted page content is empty or insufficient');
  }

  return {
    title: title.trim(),
    text,
    metadata: {
      sourceType: 'web',
      url: validatedUrl.toString(),
      byline,
      excerpt,
      length: text.length,
    },
  };
}

export async function extractYouTubeSource(url: string, languagePreferences: string[] = ['en']): Promise<YouTubeIngestionResult> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL format');
  }

  // Check cache first
  if (youtubeCache.has(videoId)) {
    logger.debug('Returning cached YouTube ingestion result', { videoId });
    return youtubeCache.get(videoId)!;
  }

  let videoTitle = `YouTube Video (${videoId})`;
  let authorName = 'Unknown Channel';
  let description = '';
  let uploadDate = '';
  let duration = 0;
  let artist = '';
  let album = '';
  let label = '';
  let releaseDate = '';

  // 1. Fetch oEmbed metadata
  try {
    const oembedRes = await axios.get(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { timeout: 8000 });
    if (oembedRes.data?.title) {
      videoTitle = oembedRes.data.title;
    }
    if (oembedRes.data?.author_name) {
      authorName = oembedRes.data.author_name;
    }
  } catch (err: any) {
    logger.warn('Failed to fetch YouTube oEmbed metadata', { videoId, error: err.message });
  }

  // 2. Fetch web article / page metadata for description and open graph tags
  try {
    const webRes = await extractWebArticle(url);
    if (webRes.text && webRes.text.length > 20) {
      description = webRes.text;
    }
    if (webRes.title && webRes.title !== url) {
      videoTitle = webRes.title;
    }
    // Extract additional metadata if present in webRes.metadata or DOM
  } catch (webErr: any) {
    logger.warn('Failed to fetch YouTube page article metadata', { videoId, error: webErr.message });
  }

  // Detect music track indicators
  const isMusicTrack =
    authorName.toLowerCase().endsWith(' - topic') ||
    description.trim().toLowerCase().startsWith('provided to youtube by') ||
    videoTitle.toLowerCase().includes(' - topic') ||
    Boolean(artist || album);

  if (isMusicTrack && !artist) {
    // Infer artist from channel name if ending with ' - Topic'
    if (authorName.toLowerCase().endsWith(' - topic')) {
      artist = authorName.slice(0, -8).trim();
    } else {
      artist = authorName;
    }
  }

  // 3. Try fetching transcript across language preferences
  let transcriptItems: Array<{ text: string; offset: number; duration?: number }> = [];
  let transcriptError: any = null;
  let transcriptStatus: YouTubeSourceStatus = 'transcript';
  let statusReason = 'Transcript successfully extracted from captions.';

  for (const lang of languagePreferences) {
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId, { lang });
      if (transcriptItems && transcriptItems.length > 0) {
        break;
      }
    } catch (err: any) {
      transcriptError = err;
    }
  }

  // If specific language failed, try default fetch without lang
  if ((!transcriptItems || transcriptItems.length === 0)) {
    try {
      transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
    } catch (err: any) {
      transcriptError = err;
    }
  }

  let text = '';
  const chunks: Array<{ content: string; location: any }> = [];

  if (transcriptItems && transcriptItems.length > 0) {
    let fullText = '';
    let currentChunkText = '';
    let currentChunkStart = 0;

    for (let i = 0; i < transcriptItems.length; i++) {
      const item = transcriptItems[i];
      const minutes = Math.floor(item.offset / 1000 / 60);
      const seconds = Math.floor((item.offset / 1000) % 60);
      const timestampStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const line = `[${timestampStr}] ${item.text}`;

      fullText += `${line}\n`;

      if (currentChunkText.length === 0) {
        currentChunkStart = Math.floor(item.offset / 1000);
      }

      currentChunkText += `${line}\n`;

      if (currentChunkText.length > 900 || i === transcriptItems.length - 1) {
        chunks.push({
          content: currentChunkText.trim(),
          location: {
            url,
            videoId,
            timestamp: currentChunkStart,
            formattedTimestamp: `${Math.floor(currentChunkStart / 60)}:${(currentChunkStart % 60).toString().padStart(2, '0')}`,
          },
        });
        currentChunkText = '';
      }
    }

    text = fullText.trim();
    transcriptStatus = 'transcript';
    statusReason = 'Transcript successfully extracted from video captions.';
  } else {
    // Classify failure error type
    const errMsg = transcriptError?.message || String(transcriptError || '');
    logger.warn('YouTube transcript extraction failed, analyzing failure reason', { videoId, error: errMsg });

    if (errMsg.includes('403') || errMsg.includes('Forbidden') || errMsg.includes('429') || errMsg.includes('Too Many Requests') || errMsg.includes('blocked')) {
      transcriptStatus = 'blocked';
      statusReason = 'Access to video captions was blocked or rate-limited by YouTube.';
    } else if (errMsg.includes('404') || errMsg.includes('unavailable') || errMsg.includes('private') || errMsg.includes('Video unavailable') || errMsg.includes('does not exist')) {
      transcriptStatus = 'unavailable';
      statusReason = 'Video is private, deleted, or unavailable.';
    } else if (errMsg.includes('ENOTFOUND') || errMsg.includes('ETIMEDOUT') || errMsg.includes('network') || errMsg.includes('axios error')) {
      transcriptStatus = 'network_error';
      statusReason = `Network error during transcript fetch: ${errMsg}`;
    } else if (isMusicTrack) {
      transcriptStatus = 'music_track';
      statusReason = 'Auto-generated YouTube Music track; captions and transcripts are unavailable for music tracks.';
    } else {
      transcriptStatus = 'metadata_only';
      statusReason = 'Captions/transcripts are disabled or unavailable for this video.';
    }

    // Build rich metadata-only representation
    text = `YouTube Video: ${videoTitle}\nChannel / Artist: ${artist || authorName}\nURL: ${url}\nStatus: ${transcriptStatus}\nReason: ${statusReason}\n\nDescription & Metadata Overview:\n${description || 'No description available.'}`;

    chunks.push({
      content: text,
      location: {
        sourceType: 'youtube',
        url,
        videoId,
        status: transcriptStatus,
        reason: statusReason,
      },
    });

    // Optional STT flag check (off by default)
    const enableStt = process.env.ENABLE_STT === 'true';
    if (enableStt && transcriptStatus !== 'music_track') {
      logger.info('ENABLE_STT is enabled, but STT transcription background job is not configured in this environment. Falling back to metadata.', { videoId });
    }
  }

  const result: YouTubeIngestionResult = {
    status: transcriptStatus,
    reason: statusReason,
    title: videoTitle,
    channel: authorName,
    text,
    metadata: {
      sourceType: 'youtube',
      url,
      videoId,
      author: authorName,
      duration,
      uploadDate,
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      artist: artist || undefined,
      album: album || undefined,
      label: label || undefined,
      releaseDate: releaseDate || undefined,
      isMusicTrack,
    },
    chunksWithMetadata: chunks,
  };

  youtubeCache.set(videoId, result);
  return result;
}

// Backward compatibility wrapper for existing code
export async function extractYouTubeTranscript(url: string): Promise<{ title: string; text: string; metadata: Record<string, any>; chunksWithMetadata: Array<{ content: string; location: any }> }> {
  const res = await extractYouTubeSource(url);
  if (res.status !== 'transcript' && res.status !== 'metadata_only' && res.status !== 'music_track') {
    throw new Error(`Transcript unavailable (${res.status}): ${res.reason}`);
  }
  return {
    title: res.title,
    text: res.text,
    metadata: res.metadata,
    chunksWithMetadata: res.chunksWithMetadata,
  };
}
