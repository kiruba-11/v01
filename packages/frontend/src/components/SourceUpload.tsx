import { useRef, useState } from 'react';
import api from '../lib/api';
import { Upload, Globe, Plus, Search, ArrowRight, FileUp, ChevronDown, Languages } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect language', nativeName: 'Auto-detect' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
];

interface SourceUploadProps {
  notebookId: string;
  onUploadComplete: () => void;
}

export default function SourceUpload({ notebookId, onUploadComplete }: SourceUploadProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const [searchScope, setSearchScope] = useState<'all' | 'web' | 'fast'>('all');
  const [showScopeDropdown, setShowScopeDropdown] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', selectedLanguage);

      await api.post(
        `/notebooks/${notebookId}/sources`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setProgress(100);
      setTimeout(() => {
        onUploadComplete();
        setProgress(0);
        setShowAddMenu(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setUploading(true);
    setError('');

    try {
      await api.post(`/notebooks/${notebookId}/sources/url`, {
        url: urlInput.trim(),
        language: selectedLanguage,
      });

      setUrlInput('');
      setShowAddMenu(false);
      onUploadComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to ingest URL');
      console.error('URL ingestion error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: 'var(--font-ui)' }}>
      {/* Full-width rounded "Add sources" button with plus icon (14px, medium) */}
      <button
        type="button"
        onClick={() => setShowAddMenu(!showAddMenu)}
        style={{
          width: '100%',
          height: '42px',
          borderRadius: '21px',
          background: 'var(--accent-color)',
          color: 'var(--accent-text)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 500,
          fontFamily: 'var(--font-ui)',
          cursor: 'pointer',
          boxShadow: 'var(--shadow)',
        }}
        title="Add sources"
      >
        <Plus style={{ width: '16px', height: '16px' }} /> Add sources
      </button>

      {/* Rounded web-source search / ingestion field with scope selectors */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '8px 12px',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search style={{ width: '16px', height: '16px', color: 'var(--text-secondary)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search sources or add web URL..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && urlInput.trim()) {
                if (urlInput.startsWith('http')) {
                  handleUrlSubmit(e as any);
                }
              }
            }}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '13px',
              fontFamily: 'var(--font-ui)',
              color: 'var(--text-primary)',
              padding: '4px 0',
            }}
          />
          <button
            type="button"
            onClick={() => {
              if (urlInput.trim().startsWith('http')) {
                handleUrlSubmit({ preventDefault: () => {} } as any);
              } else if (urlInput.trim()) {
                setShowAddMenu(false);
              } else {
                setShowAddMenu(true);
              }
            }}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--accent-color)',
              color: 'var(--accent-text)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              flexShrink: 0,
            }}
            title="Submit search or web URL"
          >
            <ArrowRight style={{ width: '14px', height: '14px' }} />
          </button>
        </div>

        {/* Compact Web and Fast Research selectors */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowScopeDropdown(!showScopeDropdown)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Select search scope"
            >
              {searchScope === 'all' && <Globe style={{ width: '12px', height: '12px' }} />}
              {searchScope === 'web' && <Globe style={{ width: '12px', height: '12px', color: 'var(--accent-color)' }} />}
              {searchScope === 'fast' && <Search style={{ width: '12px', height: '12px', color: '#059669' }} />}
              <span>{searchScope === 'all' ? 'All Sources' : searchScope === 'web' ? 'Web' : 'Fast Research'}</span>
              <ChevronDown style={{ width: '10px', height: '10px' }} />
            </button>

            {showScopeDropdown && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '6px', boxShadow: 'var(--shadow-md)', zIndex: 20, minWidth: '130px', padding: '4px' }}>
                <button
                  type="button"
                  onClick={() => { setSearchScope('all'); setShowScopeDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 8px', background: searchScope === 'all' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--font-ui)', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  All Sources
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchScope('web'); setShowScopeDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 8px', background: searchScope === 'web' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--font-ui)', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  Web
                </button>
                <button
                  type="button"
                  onClick={() => { setSearchScope('fast'); setShowScopeDropdown(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '6px 8px', background: searchScope === 'fast' ? 'var(--bg-tertiary)' : 'transparent', border: 'none', borderRadius: '4px', fontSize: '12px', fontFamily: 'var(--font-ui)', cursor: 'pointer', color: 'var(--text-primary)' }}
                >
                  Fast Research
                </button>
              </div>
            )}
          </div>

          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>
            {searchScope === 'web' ? 'Web search enabled' : searchScope === 'fast' ? 'Fast research mode' : 'Notebook sources'}
          </span>
        </div>
      </div>

      {/* Expanded Add Menu Modal / Drawer */}
      {showAddMenu && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setMode('file')}
                style={{
                  background: mode === 'file' ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                  color: mode === 'file' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Upload style={{ width: '13px', height: '13px' }} /> File Upload
              </button>
              <button
                type="button"
                onClick={() => setMode('url')}
                style={{
                  background: mode === 'url' ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                  color: mode === 'url' ? 'var(--accent-text)' : 'var(--text-secondary)',
                  border: 'none',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <Globe style={{ width: '13px', height: '13px' }} /> Web URL
              </button>
            </div>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Languages style={{ width: '13px', height: '13px', color: 'var(--text-secondary)' }} />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '3px 6px',
                  fontSize: '11px',
                  fontFamily: 'var(--font-ui)',
                  cursor: 'pointer',
                  outline: 'none',
                }}
                title="Select document language or Auto-detect"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="error" style={{ fontSize: '12px', marginBottom: '0' }}>{error}</div>}

          {mode === 'file' ? (
            <div style={{ textAlign: 'center', padding: '12px' }}>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                disabled={uploading}
                accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{ padding: '8px 14px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-ui)', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: uploading ? 'not-allowed' : 'pointer' }}
              >
                <FileUp style={{ width: '14px', height: '14px' }} />
                {uploading ? `Uploading... ${progress}%` : 'Select Document File'}
              </button>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', fontFamily: 'var(--font-ui)' }}>PDF, DOCX, TXT, CSV, Images • Language: {selectedLanguage === 'auto' ? 'Auto-detect' : selectedLanguage}</div>
            </div>
          ) : (
            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input
                type="url"
                placeholder="https://example.com/article"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={uploading}
                required
                style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-ui)', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
              />
              <button
                type="submit"
                disabled={uploading || !urlInput.trim()}
                style={{ padding: '6px 12px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', fontSize: '12px', fontFamily: 'var(--font-ui)', fontWeight: 500, cursor: uploading || !urlInput.trim() ? 'not-allowed' : 'pointer' }}
              >
                {uploading ? 'Ingesting URL...' : `Ingest Web URL (${selectedLanguage === 'auto' ? 'Auto-detect' : selectedLanguage})`}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
