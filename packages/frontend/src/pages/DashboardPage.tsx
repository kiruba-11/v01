import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';
import PaintThemeBrush from '../components/PaintThemeBrush';
import AIStatusBadge from '../components/AIStatusBadge';
import TiltedCard from '../components/TiltedCard';
import {
  BookOpen,
  Search,
  Plus,
  Folder,
  Clock,
  Star,
  Trash2,
  Settings,
  LogOut,
  Sparkles,
  LayoutDashboard,
  Library,
  X,
  ChevronRight,
  SlidersHorizontal,
  FileText,
  CheckCircle2,
  Key,
  Shield,
} from 'lucide-react';

const NOTEBOOK_TEMPLATES = [
  { id: 'blank', name: 'Blank Notebook', description: 'Start fresh with an empty workspace.', icon: BookOpen },
  { id: 'research', name: 'Research Synthesis', description: 'Deep literature review and paper analysis.', icon: FileText },
  { id: 'docs', name: 'Technical Documentation', description: 'Architecture notes, API specs, and guides.', icon: Shield },
  { id: 'brainstorm', name: 'Project Brainstorming', description: 'Ideas, exploratory notes, and source docs.', icon: Sparkles },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookDesc, setNewNotebookDesc] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('blank');
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'created'>('recent');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeNav, setActiveNav] = useState<'dashboard' | 'notebooks' | 'recent' | 'favorites' | 'trash' | 'settings'>('dashboard');

  // Check authentication
  React.useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Fetch notebooks
  const { data: notebooks, isLoading, refetch } = useQuery({
    queryKey: ['notebooks'],
    queryFn: async () => {
      const response = await api.get('/notebooks');
      return response.data;
    },
    enabled: isAuthenticated(),
  });

  // Create notebook mutation
  const createNotebookMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      console.log('Sending create notebook request with data:', data);
      const response = await api.post('/notebooks', data);
      console.log('Create notebook response:', response.data);
      return response;
    },
    onSuccess: (response) => {
      setNewNotebookName('');
      setNewNotebookDesc('');
      setSelectedTemplate('blank');
      setShowCreateModal(false);
      refetch();
      if (response?.data?.id) {
        navigate(`/notebooks/${response.data.id}`);
      }
    },
    onError: (err: any) => {
      console.error('Create notebook error details:', err);
      const backendError = err.response?.data?.error || err.message || 'Failed to create notebook';
      setError(backendError);
    },
  });

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tmpl = NOTEBOOK_TEMPLATES.find((t) => t.id === templateId);
    if (tmpl && templateId !== 'blank') {
      setNewNotebookName(tmpl.name);
      setNewNotebookDesc(tmpl.description);
    } else {
      setNewNotebookName('');
      setNewNotebookDesc('');
    }
  };

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim()) return;
    createNotebookMutation.mutate({
      name: newNotebookName.trim(),
      description: newNotebookDesc.trim() || undefined,
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated()) {
    return <div className="loading" style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Redirecting to login...</div>;
  }

  // Filter and sort notebooks
  const filteredNotebooks = notebooks?.filter((nb: any) =>
    nb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (nb.description && nb.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedNotebooks = filteredNotebooks ? [...filteredNotebooks].sort((a: any, b: any) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'created') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      // recent
      return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime();
    }
  }) : [];

  return (
    <div style={{ display: 'flex', height: '100dvh', width: '100vw', overflow: 'hidden', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarOpen ? '260px' : '0px',
          minWidth: sidebarOpen ? '260px' : '0px',
          background: 'var(--bg-secondary)',
          borderRight: sidebarOpen ? '1px solid var(--border-color)' : 'none',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease, min-width 0.2s ease',
          overflow: 'hidden',
          zIndex: 10,
        }}
      >
        <div style={{ height: '64px', display: 'flex', alignItems: 'center', padding: '0 20px', gap: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-color)', color: 'var(--accent-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Sparkles style={{ width: '18px', height: '18px' }} />
          </div>
          <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>SourcePilot</span>
        </div>

        <div style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '0 8px 6px 8px', letterSpacing: '0.05em' }}>WORKSPACE</div>
          <button
            onClick={() => setActiveNav('dashboard')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: activeNav === 'dashboard' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeNav === 'dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeNav === 'dashboard' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LayoutDashboard style={{ width: '16px', height: '16px', color: activeNav === 'dashboard' ? 'var(--accent-color)' : 'var(--text-muted)' }} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveNav('notebooks')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: activeNav === 'notebooks' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeNav === 'notebooks' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeNav === 'notebooks' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Library style={{ width: '16px', height: '16px', color: activeNav === 'notebooks' ? 'var(--accent-color)' : 'var(--text-muted)' }} />
            All Notebooks
          </button>
          <button
            onClick={() => setActiveNav('recent')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: activeNav === 'recent' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeNav === 'recent' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeNav === 'recent' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Clock style={{ width: '16px', height: '16px', color: activeNav === 'recent' ? 'var(--accent-color)' : 'var(--text-muted)' }} />
            Recent
          </button>
          <button
            onClick={() => setActiveNav('favorites')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: activeNav === 'favorites' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeNav === 'favorites' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeNav === 'favorites' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Star style={{ width: '16px', height: '16px', color: activeNav === 'favorites' ? 'var(--accent-color)' : 'var(--text-muted)' }} />
            Favorites
          </button>

          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', padding: '16px 8px 6px 8px', letterSpacing: '0.05em' }}>SYSTEM</div>
          <button
            onClick={() => setActiveNav('trash')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: activeNav === 'trash' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeNav === 'trash' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeNav === 'trash' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Trash2 style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
            Trash
          </button>
          <button
            onClick={() => setActiveNav('settings')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '6px',
              background: activeNav === 'settings' ? 'var(--bg-tertiary)' : 'transparent',
              color: activeNav === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: activeNav === 'settings' ? 600 : 400,
              fontSize: '13px',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <Settings style={{ width: '16px', height: '16px', color: activeNav === 'settings' ? 'var(--accent-color)' : 'var(--text-muted)' }} />
            Settings
          </button>
        </div>

        {/* User profile footer in sidebar */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'Researcher'}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Navbar */}
        <header style={{ height: '64px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              <Folder style={{ width: '16px', height: '16px' }} />
            </button>
            <div style={{ position: 'relative', width: '300px' }}>
              <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search notebooks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 32px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AIStatusBadge />
            <PaintThemeBrush />
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: 'var(--accent-color)',
                color: 'var(--accent-text)',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                border: 'none',
              }}
            >
              <Plus style={{ width: '16px', height: '16px' }} /> New Notebook
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '32px', display: 'flex', flexDirection: 'column', gap: '28px', background: 'var(--bg-primary)' }}>
          {activeNav === 'settings' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 8px 0' }}>Workspace Settings</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Manage your account preferences, API integrations, and workspace defaults.</p>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} /> Omniroute Gateway & AI Configuration
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  SourcePilot is connected to Omniroute AI gateway for high-performance embeddings, RAG chat, and study studio generation.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>API Gateway Base URL</label>
                  <input
                    type="text"
                    value="https://api.omniroute.ai/v1"
                    disabled
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-muted)', fontSize: '13px' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>API Key Status</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', fontSize: '13px', color: 'var(--text-primary)' }}>
                    <CheckCircle2 style={{ width: '16px', height: '16px', color: '#10b981' }} />
                    <span>Configured (sk-24772...f6f0ec)</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} /> Account Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Name</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>{user?.name || 'Researcher'}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>Email</label>
                    <div style={{ fontSize: '14px', fontWeight: 500, marginTop: '4px' }}>{user?.email || 'user@example.com'}</div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeNav === 'trash' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '720px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: '0 0 8px 0' }}>Trash</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>Deleted notebooks and archived sources. Items in trash are automatically purged after 30 days.</p>
              </div>
              <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Trash2 style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }} />
                <div style={{ fontSize: '15px', fontWeight: 600 }}>Trash is empty</div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>No deleted notebooks found.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', width: '100%' }}>
              {/* Welcome Banner */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0, letterSpacing: '-0.02em' }}>
                  Welcome back, {user?.name || 'Researcher'} 👋
                </h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
                  Organize your thoughts, ingest sources, and generate AI insights in one place.
                </p>
              </div>

              {error && (
                <div className="error" style={{ margin: 0 }}>
                  {error}
                </div>
              )}

              {/* Notebooks Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    {activeNav === 'favorites' ? 'Favorite Notebooks' : activeNav === 'recent' ? 'Recent Notebooks' : 'Your Notebooks'} ({sortedNotebooks.length})
                  </h2>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="recent">Most Recent</option>
                      <option value="name">Alphabetical (A-Z)</option>
                      <option value="created">Creation Date</option>
                    </select>
                  </div>
                </div>

                {isLoading ? (
                  <div className="loading" style={{ padding: '48px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Loading your notebooks...
                  </div>
                ) : sortedNotebooks && sortedNotebooks.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {sortedNotebooks.map((notebook: any) => (
                      <div key={notebook.id} style={{ position: 'relative' }}>
                        <TiltedCard
                          containerHeight="210px"
                          containerWidth="100%"
                          imageHeight="210px"
                          imageWidth="100%"
                          rotateAmplitude={6}
                          scaleOnHover={1.02}
                          glare={0.12}
                          shadow={0.25}
                          radius={14}
                          perspective={900}
                          smoothness={0.7}
                          onClick={() => navigate(`/notebooks/${notebook.id}`)}
                        >
                          <div
                            style={{
                              background: 'transparent',
                              border: 'none',
                              padding: '20px',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'space-between',
                              boxSizing: 'border-box',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                                <BookOpen style={{ width: '18px', height: '18px' }} />
                              </div>
                              <ChevronRight style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {notebook.name}
                              </h3>
                              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                                {notebook.description || 'No description provided. Click to open and add sources.'}
                              </p>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <span>Updated {new Date(notebook.updated_at || notebook.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </TiltedCard>
                      </div>
                    ))}
                  </div>
                ) : searchQuery ? (
                  <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <Search style={{ width: '32px', height: '32px', color: 'var(--text-muted)' }} />
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>No notebooks found</div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>No notebooks match "{searchQuery}". Try a different search term.</p>
                  </div>
                ) : (
                  <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)' }}>
                      <BookOpen style={{ width: '24px', height: '24px' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '16px', fontWeight: 600 }}>No notebooks yet</div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, maxWidth: '360px' }}>
                        Create your first notebook to start uploading documents, ingesting web URLs, and chatting with your sources.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      style={{
                        background: 'var(--accent-color)',
                        color: 'var(--accent-text)',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        border: 'none',
                        marginTop: '8px',
                      }}
                    >
                      <Plus style={{ width: '16px', height: '16px' }} /> Create First Notebook
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create Notebook Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', width: '100%', maxWidth: '480px', padding: '24px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)' }}>Create New Notebook</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Close"
              >
                <X style={{ width: '18px', height: '18px' }} />
              </button>
            </div>

            <form onSubmit={handleCreateNotebook} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Choose Template</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                  {NOTEBOOK_TEMPLATES.map((tmpl) => {
                    const IconComp = tmpl.icon;
                    const isSelected = selectedTemplate === tmpl.id;
                    return (
                      <div
                        key={tmpl.id}
                        onClick={() => handleTemplateSelect(tmpl.id)}
                        style={{
                          background: isSelected ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                          border: `1px solid ${isSelected ? 'var(--accent-color)' : 'var(--border-color)'}`,
                          borderRadius: '8px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)' }}>
                          <IconComp style={{ width: '15px', height: '15px' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600 }}>{tmpl.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Notebook Name</label>
                <input
                  type="text"
                  placeholder="e.g., Q4 Research, Quantum Computing, etc."
                  value={newNotebookName}
                  onChange={(e) => setNewNotebookName(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Description (Optional)</label>
                <textarea
                  placeholder="Brief summary of what this notebook is about..."
                  value={newNotebookDesc}
                  onChange={(e) => setNewNotebookDesc(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', fontFamily: 'var(--font-ui)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createNotebookMutation.isPending || !newNotebookName.trim()}
                  style={{ background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: createNotebookMutation.isPending || !newNotebookName.trim() ? 'not-allowed' : 'pointer' }}
                >
                  {createNotebookMutation.isPending ? 'Creating...' : 'Create Notebook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
