import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { FileText, Globe, Filter, CheckSquare, Square, FileSpreadsheet, Image as ImageIcon, Trash2, AlertTriangle, X } from 'lucide-react';

interface SourceListProps {
  notebookId: string;
  onRefresh?: () => void;
}

export default function SourceList({ notebookId }: SourceListProps) {
  const queryClient = useQueryClient();
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filterActive, setFilterActive] = useState(false);
  const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

  // Confirmation dialog state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    sourceIds: string[];
    sourceNames: string[];
  }>({
    isOpen: false,
    sourceIds: [],
    sourceNames: [],
  });

  const [errorMsg, setErrorMsg] = useState('');

  const { data: sources, isLoading, error } = useQuery({
    queryKey: ['sources', notebookId],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${notebookId}/sources`);
      return response.data;
    },
  });

  // Delete mutation
  const deleteSourcesMutation = useMutation({
    mutationFn: async (sourceIds: string[]) => {
      if (sourceIds.length === 1) {
        return api.delete(`/notebooks/${notebookId}/sources/${sourceIds[0]}`);
      } else {
        return api.delete(`/notebooks/${notebookId}/sources`, {
          data: { sourceIds },
        });
      }
    },
    onSuccess: () => {
      setSelectedSources([]);
      setSelectAll(false);
      setConfirmModal({ isOpen: false, sourceIds: [], sourceNames: [] });
      queryClient.invalidateQueries({ queryKey: ['sources', notebookId] });
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.error || 'Failed to delete source(s)');
    },
  });

  const handleToggleSelectAll = () => {
    if (selectAll) {
      setSelectedSources([]);
      setSelectAll(false);
    } else if (sources) {
      setSelectedSources(sources.map((s: any) => s.id));
      setSelectAll(true);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedSources.includes(id)) {
      const next = selectedSources.filter((sId) => sId !== id);
      setSelectedSources(next);
      setSelectAll(false);
    } else {
      const next = [...selectedSources, id];
      setSelectedSources(next);
      if (sources && next.length === sources.length) {
        setSelectAll(true);
      }
    }
  };

  const getSourceIcon = (fileType: string) => {
    if (fileType?.includes('url') || fileType?.includes('web') || fileType?.includes('html')) return <Globe style={{ width: '14px', height: '14px', color: 'var(--accent-color)' }} />;
    if (fileType?.includes('csv') || fileType?.includes('xlsx') || fileType?.includes('sheet')) return <FileSpreadsheet style={{ width: '14px', height: '14px', color: '#059669' }} />;
    if (fileType?.includes('png') || fileType?.includes('jpg') || fileType?.includes('jpeg') || fileType?.includes('webp') || fileType?.includes('image')) return <ImageIcon style={{ width: '14px', height: '14px', color: '#d97706' }} />;
    return <FileText style={{ width: '14px', height: '14px', color: 'var(--text-secondary)' }} />;
  };

  if (isLoading) {
    return <div className="loading" style={{ padding: '16px', fontFamily: 'var(--font-ui)' }}>Loading sources...</div>;
  }

  if (error) {
    return <div className="error" style={{ margin: '12px', fontFamily: 'var(--font-ui)' }}>Failed to load sources</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-ui)' }}>
      {errorMsg && (
        <div className="error" style={{ fontSize: '12px', margin: '0 0 8px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>
            <X style={{ width: '12px', height: '12px' }} />
          </button>
        </div>
      )}

      {/* Source-list toolbar with filter icon, Select all, and Bulk Delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleToggleSelectAll}
            style={{ background: 'transparent', border: 'none', padding: '2px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'var(--font-ui)' }}
            title={selectAll ? 'Deselect all' : 'Select all'}
          >
            {selectAll ? <CheckSquare style={{ width: '14px', height: '14px', color: 'var(--accent-color)' }} /> : <Square style={{ width: '14px', height: '14px' }} />}
            <span>Select all</span>
          </button>

          {selectedSources.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const names = sources
                  ?.filter((s: any) => selectedSources.includes(s.id))
                  .map((s: any) => s.file_name) || [];
                setConfirmModal({
                  isOpen: true,
                  sourceIds: selectedSources,
                  sourceNames: names,
                });
              }}
              style={{
                background: 'rgba(220, 38, 38, 0.1)',
                color: '#f87171',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontWeight: 500,
              }}
              title="Delete selected sources"
            >
              <Trash2 style={{ width: '12px', height: '12px' }} />
              Delete ({selectedSources.length})
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setFilterActive(!filterActive)}
            style={{ background: filterActive ? 'var(--bg-tertiary)' : 'transparent', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '4px', cursor: 'pointer', color: filterActive ? 'var(--accent-color)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Filter sources"
          >
            <Filter style={{ width: '14px', height: '14px' }} />
          </button>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>{sources?.length || 0} sources</span>
        </div>
      </div>

      {sources && sources.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {sources.map((source: any) => {
            const isSelected = selectedSources.includes(source.id);
            const isHovered = hoveredSourceId === source.id;
            return (
              <div
                key={source.id}
                onMouseEnter={() => setHoveredSourceId(source.id)}
                onMouseLeave={() => setHoveredSourceId(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease, border-color 0.15s ease',
                  fontFamily: 'var(--font-ui)',
                }}
                onClick={() => handleToggleSelect(source.id)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSelect(source.id);
                  }}
                  style={{ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: isSelected ? 'var(--accent-color)' : 'var(--text-muted)' }}
                >
                  {isSelected ? <CheckSquare style={{ width: '14px', height: '14px' }} /> : <Square style={{ width: '14px', height: '14px' }} />}
                </button>

                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getSourceIcon(source.file_type)}
                </div>

                <div style={{ flex: 1, minWidth: '0', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span
                    style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-ui)', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={source.file_name}
                  >
                    {source.file_name}
                  </span>
                  <span style={{ fontSize: '11px', fontFamily: 'var(--font-ui)', color: 'var(--text-muted)' }}>
                    {source.file_type || 'document'} · {source.extraction_status}
                  </span>
                </div>

                {/* Delete button on hover / touch */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmModal({
                      isOpen: true,
                      sourceIds: [source.id],
                      sourceNames: [source.file_name],
                    });
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    display: isHovered || isSelected ? 'flex' : 'none',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    borderRadius: '4px',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  title="Delete source"
                  aria-label="Delete source"
                >
                  <Trash2 style={{ width: '14px', height: '14px' }} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'var(--font-ui)', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <FileText style={{ width: '18px', height: '18px' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No sources yet</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Upload documents or add web URLs above to get started.</span>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', width: '100%', maxWidth: '400px', padding: '24px', boxShadow: 'var(--shadow-md)', display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: 'var(--font-ui)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(220, 38, 38, 0.1)', color: '#f87171', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle style={{ width: '18px', height: '18px' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  {confirmModal.sourceIds.length === 1 ? 'Delete source?' : `Delete ${confirmModal.sourceIds.length} sources?`}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This action cannot be undone.</span>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '10px 12px', maxHeight: '120px', overflowY: 'auto', fontSize: '13px', color: 'var(--text-primary)' }}>
              {confirmModal.sourceNames.map((name, i) => (
                <div key={i} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '2px 0' }}>
                  • {name}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, sourceIds: [], sourceNames: [] })}
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSourcesMutation.isPending}
                onClick={() => deleteSourcesMutation.mutate(confirmModal.sourceIds)}
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: deleteSourcesMutation.isPending ? 'not-allowed' : 'pointer' }}
              >
                {deleteSourcesMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
