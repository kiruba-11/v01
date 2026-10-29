import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import SourceUpload from '../components/SourceUpload';
import SourceList from '../components/SourceList';
import ChatPanel from '../components/ChatPanel';
import StudioPanel from '../components/StudioPanel';
import NotesPanel from '../components/NotesPanel';
import PaintThemeBrush from '../components/PaintThemeBrush';
import AIStatusBadge from '../components/AIStatusBadge';
import { PanelLeft, PanelRight, PanelLeftClose, PanelRightClose, ArrowLeft, MessageSquare, FileText } from 'lucide-react';

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [centerView, setCenterView] = useState<'chat' | 'notes'>('chat');

  const { data: notebook, isLoading, error } = useQuery({
    queryKey: ['notebook', id],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${id}`);
      return response.data;
    },
  });

  const handleUploadComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['sources', id] });
  };

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '16px' }}>← Back to Dashboard</button>
        <div className="error">Failed to load notebook</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading notebook workspace...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)' }}>
      {/* Top Header Bar */}
      <header style={{ height: '56px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '6px 10px', fontSize: '13px' }}
            title="Back to Dashboard"
          >
            <ArrowLeft style={{ width: '16px', height: '16px' }} /> Dashboard
          </button>
          <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{notebook?.name}</span>
            {notebook?.description && (
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                · {notebook.description}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AIStatusBadge />
          <div style={{ display: 'flex', background: 'var(--bg-tertiary)', borderRadius: '6px', padding: '2px', border: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={() => setCenterView('chat')}
              style={{
                background: centerView === 'chat' ? 'var(--accent-color)' : 'transparent',
                color: centerView === 'chat' ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <MessageSquare style={{ width: '13px', height: '13px' }} /> Chat
            </button>
            <button
              type="button"
              onClick={() => setCenterView('notes')}
              style={{
                background: centerView === 'notes' ? 'var(--accent-color)' : 'transparent',
                color: centerView === 'notes' ? 'var(--accent-text)' : 'var(--text-secondary)',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <FileText style={{ width: '13px', height: '13px' }} /> Notes
            </button>
          </div>

          <button
            type="button"
            onClick={() => setLeftOpen(!leftOpen)}
            style={{
              background: leftOpen ? 'var(--bg-tertiary)' : 'transparent',
              color: leftOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={leftOpen ? 'Collapse sources' : 'Expand sources'}
            aria-label={leftOpen ? 'Collapse sources' : 'Expand sources'}
          >
            {leftOpen ? <PanelLeftClose style={{ width: '16px', height: '16px' }} /> : <PanelLeft style={{ width: '16px', height: '16px' }} />}
            <span>Sources</span>
          </button>
          <button
            type="button"
            onClick={() => setRightOpen(!rightOpen)}
            style={{
              background: rightOpen ? 'var(--bg-tertiary)' : 'transparent',
              color: rightOpen ? 'var(--accent-color)' : 'var(--text-secondary)',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={rightOpen ? 'Collapse Studio' : 'Expand Studio'}
            aria-label={rightOpen ? 'Collapse Studio' : 'Expand Studio'}
          >
            <span>Studio</span>
            {rightOpen ? <PanelRightClose style={{ width: '16px', height: '16px' }} /> : <PanelRight style={{ width: '16px', height: '16px' }} />}
          </button>
          <div style={{ height: '20px', width: '1px', background: 'var(--border-color)' }} />
          <PaintThemeBrush />
        </div>
      </header>

      {/* Three-Panel Flex Workspace */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* Left Panel: Sources */}
        {leftOpen && (
          <div
            style={{
              width: '320px',
              minWidth: '280px',
              maxWidth: '380px',
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)' }}>Sources</h2>
              <button
                type="button"
                onClick={() => setLeftOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}
                title="Collapse sources"
                aria-label="Collapse sources"
              >
                <PanelLeftClose style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <SourceUpload notebookId={id!} onUploadComplete={handleUploadComplete} />
            <SourceList notebookId={id!} />
          </div>
        )}

        {/* Center Panel: Chat and Research Content */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            background: 'var(--bg-primary)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
          }}
        >
          {centerView === 'chat' ? (
            <ChatPanel notebookId={id!} />
          ) : (
            <NotesPanel notebookId={id!} />
          )}
        </div>

        {/* Right Panel: Studio and Workspace */}
        {rightOpen && (
          <div
            style={{
              width: '360px',
              minWidth: '300px',
              maxWidth: '420px',
              overflowY: 'auto',
              background: 'var(--bg-secondary)',
              borderLeft: '1px solid var(--border-color)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}
          >
            <StudioPanel notebookId={id!} onCloseStudio={() => setRightOpen(false)} />
          </div>
        )}
      </div>
    </div>
  );
}
