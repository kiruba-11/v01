import { useState, useEffect } from 'react';
import TiltedCard from './TiltedCard';
import { FileText, Plus, Trash2, Edit3, X, Save, Calendar, MoreVertical } from 'lucide-react';

interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface NotesPanelProps {
  notebookId: string;
}

export default function NotesPanel({ notebookId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Load notes from localStorage per notebookId
  useEffect(() => {
    const savedNotes = localStorage.getItem(`sourcepilot_notes_${notebookId}`);
    if (savedNotes) {
      try {
        setNotes(JSON.parse(savedNotes));
      } catch (e) {
        console.error('Failed to parse saved notes', e);
      }
    } else {
      // Default initial note if empty
      const initialNotes: Note[] = [
        {
          id: 'note-1',
          notebookId,
          title: 'Executive Summary',
          content: 'Key findings and takeaways from the uploaded sources and research materials in this notebook.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      setNotes(initialNotes);
      localStorage.setItem(`sourcepilot_notes_${notebookId}`, JSON.stringify(initialNotes));
    }
  }, [notebookId]);

  const saveNotesToStorage = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem(`sourcepilot_notes_${notebookId}`, JSON.stringify(updatedNotes));
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      notebookId,
      title: 'Untitled Note',
      content: 'Write your notes or paste key takeaways here...',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newNote, ...notes];
    saveNotesToStorage(updated);
    setActiveNote(newNote);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
    setIsEditing(true);
  };

  const handleSaveNote = () => {
    if (!activeNote) return;
    const updated = notes.map(n =>
      n.id === activeNote.id
        ? { ...n, title: editTitle.trim() || 'Untitled Note', content: editContent, updatedAt: new Date().toISOString() }
        : n
    );
    saveNotesToStorage(updated);
    setActiveNote(null);
    setIsEditing(false);
  };

  const handleDeleteNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = notes.filter(n => n.id !== id);
    saveNotesToStorage(updated);
    if (activeNote?.id === id) {
      setActiveNote(null);
      setIsEditing(false);
    }
    setDeleteConfirmId(null);
    setMenuOpenId(null);
  };

  const openNoteEditor = (note: Note) => {
    setActiveNote(note);
    setEditTitle(note.title);
    setEditContent(note.content);
    setIsEditing(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', background: 'var(--bg-primary)', fontFamily: 'var(--font-ui)', overflowY: 'auto' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
            Notebook Notes ({notes.length})
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
            Interactive 3D Tilted Cards for your research notes and summaries.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateNote}
          style={{
            background: 'var(--accent-color)',
            color: 'var(--accent-text)',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: 'var(--shadow)',
          }}
        >
          <Plus style={{ width: '15px', height: '15px' }} /> New Note
        </button>
      </div>

      {/* Notes Grid with TiltedCard */}
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>
          <FileText style={{ width: '36px', height: '36px', marginBottom: '12px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>No notes yet</h3>
          <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>Create your first note to capture insights and summaries.</p>
          <button
            type="button"
            onClick={handleCreateNote}
            style={{ background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
          >
            Create Note
          </button>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '16px',
            paddingBottom: '24px',
          }}
        >
          {notes.map(note => (
            <div key={note.id} style={{ position: 'relative' }}>
              <TiltedCard
                containerHeight="220px"
                containerWidth="100%"
                imageHeight="220px"
                imageWidth="100%"
                rotateAmplitude={6}
                scaleOnHover={1.02}
                glare={0.12}
                shadow={0.25}
                radius={14}
                perspective={900}
                smoothness={0.7}
                onClick={() => openNoteEditor(note)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', flexShrink: 0 }}>
                        <FileText style={{ width: '14px', height: '14px' }} />
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {note.title}
                      </span>
                    </div>

                    {/* Action Context Menu Button */}
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === note.id ? null : note.id);
                        }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title="Note options"
                      >
                        <MoreVertical style={{ width: '14px', height: '14px' }} />
                      </button>

                      {menuOpenId === note.id && (
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: '100%',
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            boxShadow: 'var(--shadow-md)',
                            zIndex: 50,
                            minWidth: '110px',
                            padding: '4px',
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              openNoteEditor(note);
                              setMenuOpenId(null);
                            }}
                            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 10px', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Edit3 style={{ width: '12px', height: '12px' }} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteConfirmId(note.id);
                              setMenuOpenId(null);
                            }}
                            style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '6px 10px', fontSize: '12px', color: '#f87171', cursor: 'pointer', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Content Preview */}
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.4', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', margin: '8px 0' }}>
                    {note.content}
                  </div>

                  {/* Card Footer Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                    <Calendar style={{ width: '11px', height: '11px' }} />
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </TiltedCard>

              {/* Delete Confirmation Modal for individual note */}
              {deleteConfirmId === note.id && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
                  <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '24px', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Delete note?</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>Are you sure you want to delete "{note.title}"? This cannot be undone.</p>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Note Editor Modal / Drawer */}
      {isEditing && activeNote && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', width: '100%', maxWidth: '600px', padding: '24px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit3 style={{ width: '18px', height: '18px', color: 'var(--accent-color)' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Edit Note</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveNote(null);
                  setIsEditing(false);
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Note Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Note title..."
                  style={{ padding: '8px 12px', borderRadius: '6px', fontSize: '14px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Note Content</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="Write your note content here..."
                  rows={8}
                  style={{ padding: '10px 12px', borderRadius: '6px', fontSize: '14px', background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font-ui)', lineHeight: '1.5' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveNote(null);
                  setIsEditing(false);
                }}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNote}
                style={{ background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', padding: '6px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save style={{ width: '14px', height: '14px' }} /> Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
