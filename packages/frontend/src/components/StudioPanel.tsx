import { useState } from 'react';
import api from '../lib/api';
import {
  AudioLines,
  Presentation,
  Clapperboard,
  Brain,
  FileText,
  Layers,
  CircleHelp,
  ChartNoAxesColumn,
  Table2,
  PanelRightClose,
  RefreshCw,
  Download,
} from 'lucide-react';

interface StudioPanelProps {
  notebookId: string;
  onCloseStudio?: () => void;
}

const LANGUAGES = [
  { code: 'English', label: 'English' },
  { code: 'Hindi', label: 'हिन्दी (Hindi)' },
  { code: 'Bengali', label: 'বাংলা (Bengali)' },
  { code: 'Gujarati', label: 'ગુજરાતી (Gujarati)' },
  { code: 'Kannada', label: 'ಕನ್ನಡ (Kannada)' },
  { code: 'Malayalam', label: 'മലയാളം (Malayalam)' },
  { code: 'Marathi', label: 'मराठी (Marathi)' },
  { code: 'Punjabi', label: 'ਪੰਜਾਬੀ (Punjabi)' },
  { code: 'Tamil', label: 'தமிழ் (Tamil)' },
  { code: 'Telugu', label: 'తెలుగు (Telugu)' },
];

const TOOLS = [
  {
    id: 'audio-overview',
    title: 'Audio Overview',
    icon: AudioLines,
    desc: 'Listen to an engaging audio discussion summarizing your notebook sources with dual-host format.',
  },
  {
    id: 'slide-deck',
    title: 'Slide Deck',
    icon: Presentation,
    desc: 'Generate structured presentation slides with titles, bullet points, and speaker notes.',
  },
  {
    id: 'video-overview',
    title: 'Video Overview',
    icon: Clapperboard,
    desc: 'Create a storyboarded video overview with scene descriptions, narration, and subtitles.',
  },
  {
    id: 'mind-map',
    title: 'Mind Map',
    icon: Brain,
    desc: 'Visualize core concepts, hierarchical branches, and semantic relationships.',
  },
  {
    id: 'reports',
    title: 'Reports',
    icon: FileText,
    badge: 'New!',
    desc: 'Generate comprehensive executive briefings, research summaries, and study guides.',
  },
  {
    id: 'flashcards',
    title: 'Flashcards',
    icon: Layers,
    desc: 'Study with interactive question-and-answer flip cards and progress tracking.',
  },
  {
    id: 'quiz',
    title: 'Quiz',
    icon: CircleHelp,
    desc: 'Test your knowledge with AI-generated practice quizzes, scoring, and explanations.',
  },
  {
    id: 'infographic',
    title: 'Infographic',
    icon: ChartNoAxesColumn,
    desc: 'Summarize key statistics, timelines, and process workflows visually.',
  },
  {
    id: 'data-table',
    title: 'Data Table',
    icon: Table2,
    desc: 'Extract structured tabular data from sources with filters and CSV export.',
  },
];

export default function StudioPanel({ notebookId, onCloseStudio }: StudioPanelProps) {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('English');
  const [loading, setLoading] = useState(false);
  const [artifact, setArtifact] = useState<{ title: string; type: string; language: string; content: string } | null>(null);
  const [error, setError] = useState('');

  // Audio player state
  const [isPlaying, setIsPlaying] = useState(false);

  // Flashcards state
  const [isFlipped, setIsFlipped] = useState(false);

  const generateArtifact = async (type: string) => {
    setLoading(true);
    setError('');
    setArtifact(null);
    setIsPlaying(false);
    setIsFlipped(false);

    try {
      const res = await api.post(`/notebooks/${notebookId}/studio/generate`, {
        artifactType: type,
        language: selectedLanguage,
      });
      setArtifact(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate studio artifact');
      console.error('Studio error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToolSelect = (toolId: string) => {
    setSelectedTool(toolId);
    generateArtifact(toolId);
  };

  const handleDownload = (format: 'md' | 'csv' | 'txt') => {
    if (!artifact) return;
    const mimeType = format === 'csv' ? 'text/csv' : 'text/markdown';
    const ext = format;
    const blob = new Blob([artifact.content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.type}-${artifact.language.toLowerCase()}.${ext}`;
    a.click();
  };

  return (
    <div style={{ background: 'var(--card-bg)', color: 'var(--text-primary)', height: '100%', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      {/* Studio Header & Language Selector */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Studio Workspace</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', margin: '2px 0 0 0', fontFamily: 'var(--font-body)' }}>
            Generate AI artifacts & multimedia.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Lang:</label>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
          {onCloseStudio && (
            <button
              onClick={onCloseStudio}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
              title="Collapse Studio"
            >
              <PanelRightClose style={{ width: '16px', height: '16px' }} />
            </button>
          )}
        </div>
      </div>

      {/* If viewing a specific tool workflow */}
      {selectedTool ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <button
              onClick={() => {
                setSelectedTool(null);
                setArtifact(null);
              }}
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
            >
              ← Back to Tools
            </button>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--accent-color)' }}>
              {TOOLS.find(t => t.id === selectedTool)?.title} ({selectedLanguage})
            </div>
          </div>

          {error && <div className="error" style={{ fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

          {loading && (
            <div className="loading" style={{ padding: '32px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '15px', fontWeight: 500, marginBottom: '6px' }}>Generating {TOOLS.find(t => t.id === selectedTool)?.title}...</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Synthesizing notebook sources with AI in {selectedLanguage}...</p>
            </div>
          )}

          {artifact && !loading && (
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', background: 'var(--bg-secondary)', flex: 1, overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>{artifact.title}</h3>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => generateArtifact(selectedTool)}
                    style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <RefreshCw style={{ width: '12px', height: '12px' }} /> Regenerate
                  </button>
                  <button
                    onClick={() => handleDownload(selectedTool === 'data-table' ? 'csv' : 'md')}
                    style={{ padding: '4px 10px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Download style={{ width: '12px', height: '12px' }} /> Export {selectedTool === 'data-table' ? 'CSV' : 'MD'}
                  </button>
                </div>
              </div>

              {/* Special interactive widget for Audio Overview */}
              {selectedTool === 'audio-overview' && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--accent-color)', color: '#fff', border: 'none', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      {isPlaying ? '❚❚' : '▶'}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>Audio Overview ({selectedLanguage})</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>AI-generated podcast conversation</div>
                      <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                        <div style={{ width: isPlaying ? '65%' : '0%', height: '100%', background: 'var(--accent-color)', transition: 'width 0.5s linear' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Special interactive widget for Flashcards */}
              {selectedTool === 'flashcards' && (
                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', marginBottom: '16px', textAlign: 'center', minHeight: '120px', display: 'flex', flexDirection: 'column', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setIsFlipped(!isFlipped)}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Flashcard (Click to Flip)</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
                    {isFlipped ? 'Answer / Explanation from Sources' : 'Key Concept Question from Notebook Sources'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {artifact.content.slice(0, 180)}...
                  </div>
                </div>
              )}

              <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-primary)', background: 'var(--card-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                {artifact.content}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Compact 9 Studio Tools Grid matching NotebookLM / reference spec */
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
            }}
          >
            {TOOLS.map((tool) => {
              const IconComponent = tool.icon;
              return (
                <div
                  key={tool.id}
                  onClick={() => handleToolSelect(tool.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    minWidth: 0,
                    height: '48px',
                    padding: '0 14px',
                    borderRadius: '24px',
                    background: '#111111',
                    border: '1px solid #303030',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease, border-color 150ms ease',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#737373';
                    e.currentTarget.style.background = '#252525';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#303030';
                    e.currentTarget.style.background = '#111111';
                  }}
                  title={tool.desc}
                >
                  <div style={{ width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: '0', color: 'var(--text-secondary)' }}>
                    <IconComponent style={{ width: '16px', height: '16px' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                    <span
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {tool.title}
                    </span>
                    {tool.badge && (
                      <span
                        style={{
                          background: 'var(--accent-color)',
                          color: 'var(--accent-text)',
                          fontSize: '9px',
                          fontWeight: 600,
                          padding: '1px 5px',
                          borderRadius: '10px',
                          flexShrink: 0,
                        }}
                      >
                        {tool.badge}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
