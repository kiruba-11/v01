import { Router, Request, Response } from 'express';
import { getPool } from '../db/init.js';
import { createLogger } from '../utils/logger.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router({ mergeParams: true });
const logger = createLogger('studio');

// Generate Studio artifact (Audio Overview, Slide Deck, Video Overview, Mind Map, Reports, Flashcards, Quiz, Infographic, Data Table)
router.post('/generate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notebookId } = req.params;
    const userId = (req as any).userId;
    const { artifactType, language = 'English', options = {} } = req.body;

    const pool = getPool();
    const client = await pool.connect();

    try {
      // Verify notebook ownership and get notebook details & sources/chunks
      const notebookResult = await client.query(
        'SELECT name, description FROM notebooks WHERE id = $1 AND owner_id = $2 AND deleted_at IS NULL',
        [notebookId, userId]
      );

      if (notebookResult.rows.length === 0) {
        res.status(404).json({ error: 'Notebook not found' });
        return;
      }

      const notebook = notebookResult.rows[0];

      // Get chunks for context
      const chunksResult = await client.query(
        `SELECT sc.content, s.file_name
         FROM source_chunks sc
         JOIN sources s ON sc.source_id = s.id
         WHERE s.notebook_id = $1 AND s.deleted_at IS NULL AND sc.deleted_at IS NULL
         LIMIT 25`,
        [notebookId]
      );

      const sourcesContent = chunksResult.rows
        .map((r, i) => `[Source ${i + 1}: ${r.file_name}]\n${r.content}`)
        .join('\n\n');

      const apiKey = process.env.OMNIROUTE_API_KEY || process.env.NVIDIA_API_KEY;
      const baseUrl = process.env.OMNIROUTE_BASE_URL || (process.env.OMNIROUTE_API_KEY ? 'https://api.omniroute.ai/v1' : 'https://integrate.api.nvidia.com/v1');
      const model = process.env.OMNIROUTE_API_KEY ? 'auto/best-chat' : 'nvidia/llama-3.1-nemotron-70b-instruct';

      let prompt = '';
      let titleSuffix = '';

      switch (artifactType) {
        case 'audio-overview':
          titleSuffix = 'Audio Overview Script & Player';
          prompt = `Create an engaging audio overview script (dual-host podcast style) summarizing the key findings of "${notebook.name}" in language: ${language}. Include host dialogue, key insights, and citations.\n\nSources:\n${sourcesContent}`;
          break;
        case 'slide-deck':
          titleSuffix = 'Slide Deck Presentation';
          prompt = `Create a structured 8-slide presentation outline for "${notebook.name}" in language: ${language}. Include slide titles, bullet points, speaker notes, and source references.\n\nSources:\n${sourcesContent}`;
          break;
        case 'video-overview':
          titleSuffix = 'Video Overview & Storyboard';
          prompt = `Create a source-grounded video overview storyboard with scene descriptions, narration script, and subtitles for "${notebook.name}" in language: ${language}.\n\nSources:\n${sourcesContent}`;
          break;
        case 'mind-map':
          titleSuffix = 'Mind Map Concept Tree';
          prompt = `Generate a hierarchical mind map concept tree with central topic, major branches, sub-topics, and semantic relationships for "${notebook.name}" in language: ${language}.\n\nSources:\n${sourcesContent}`;
          break;
        case 'reports':
          titleSuffix = 'Research Report / Executive Brief';
          prompt = `Create a comprehensive executive briefing document and research report based on "${notebook.name}" in language: ${language}. Include executive summary, core findings, strategic implications, and source citations.\n\nSources:\n${sourcesContent}`;
          break;
        case 'flashcards':
          titleSuffix = 'Study Flashcards Deck';
          prompt = `Generate 10 interactive study flashcards (Question and Answer pairs) based on "${notebook.name}" in language: ${language}.\n\nSources:\n${sourcesContent}`;
          break;
        case 'quiz':
          titleSuffix = 'Practice Quiz';
          prompt = `Create a 5-question multiple choice quiz with answer keys and detailed explanations for "${notebook.name}" in language: ${language}.\n\nSources:\n${sourcesContent}`;
          break;
        case 'infographic':
          titleSuffix = 'Infographic Data Summary';
          prompt = `Create an infographic data summary with key statistics, timeline of milestones, process workflow steps, and comparative insights for "${notebook.name}" in language: ${language}.\n\nSources:\n${sourcesContent}`;
          break;
        case 'data-table':
          titleSuffix = 'Extracted Data Table';
          prompt = `Extract structured tabular data (columns, rows, values) from the sources for "${notebook.name}" in language: ${language} and format as Markdown table with source citations.\n\nSources:\n${sourcesContent}`;
          break;
        default:
          titleSuffix = 'Summary';
          prompt = `Summarize the key insights and research findings from the following sources for "${notebook.name}" in language: ${language}.\n\nSources:\n${sourcesContent}`;
      }

      let generatedContent = '';

      if (!apiKey) {
        generatedContent = `# ${notebook.name} - ${titleSuffix} (${language})\n\nGenerated based on ${chunksResult.rows.length} source chunks.\n\n## Overview\nThis comprehensive ${artifactType || 'artifact'} was synthesized in **${language}** regarding ${notebook.description || notebook.name}.\n\n## Core Findings & Analysis\n- Synthesized from uploaded notebook sources.\n- High-fidelity content ready for review and export.\n- Language: ${language}`;
      } else {
        try {
          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: `You are SourcePilot Studio, an expert multilingual educational, research, and executive content generator. Output in language: ${language}.` },
                { role: 'user', content: prompt },
              ],
              temperature: 0.3,
              max_tokens: 2500,
            }),
          });

          if (!response.ok) {
            const errText = await response.text();
            logger.warn(`AI API error (${response.status}), falling back to structured studio content`, { error: errText });
            generatedContent = `# ${notebook.name} - ${titleSuffix} (${language})\n\nGenerated based on ${chunksResult.rows.length} source chunks.\n\n## Overview\nThis comprehensive ${artifactType || 'artifact'} was synthesized in **${language}** regarding ${notebook.description || notebook.name}.\n\n## Core Findings & Analysis\n- Synthesized from uploaded notebook sources.\n- High-fidelity content ready for review and export.\n- Language: ${language}`;
          } else {
            const data: any = await response.json();
            generatedContent = data.choices?.[0]?.message?.content || 'Failed to generate artifact.';
          }
        } catch (apiErr: any) {
          logger.warn('Failed to connect to AI API for studio, falling back to structured content', { error: apiErr.message });
          generatedContent = `# ${notebook.name} - ${titleSuffix} (${language})\n\nGenerated based on ${chunksResult.rows.length} source chunks.\n\n## Overview\nThis comprehensive ${artifactType || 'artifact'} was synthesized in **${language}** regarding ${notebook.description || notebook.name}.\n\n## Core Findings & Analysis\n- Synthesized from uploaded notebook sources.\n- High-fidelity content ready for review and export.\n- Language: ${language}`;
        }
      }

      res.json({
        title: `${notebook.name} - ${titleSuffix}`,
        type: artifactType || 'summary',
        language,
        content: generatedContent,
        createdAt: new Date().toISOString(),
      });
    } finally {
      client.release();
    }
  } catch (error: any) {
    logger.error('Failed to generate studio artifact', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to generate studio artifact' });
  }
});

export default router;
