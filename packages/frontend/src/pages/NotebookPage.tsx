import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import SourceUpload from '../components/SourceUpload';
import SourceList from '../components/SourceList';

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notebook, isLoading, error } = useQuery({
    queryKey: ['notebook', id],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${id}`);
      return response.data;
    },
  });

  const handleUploadComplete = () => {
    // Refresh sources list
    queryClient.invalidateQueries({ queryKey: ['sources', id] });
  };

  if (error) {
    return (
      <div className="container">
        <button onClick={() => navigate('/dashboard')}>← Back</button>
        <div className="error">Failed to load notebook</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container">
        <div className="loading">Loading notebook...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <button onClick={() => navigate('/dashboard')} style={{ marginBottom: '16px' }}>
        ← Back to Dashboard
      </button>
      <h1>{notebook?.name}</h1>
      <p>{notebook?.description}</p>

      <SourceUpload notebookId={id!} onUploadComplete={handleUploadComplete} />
      <SourceList notebookId={id!} />

      <div className="card">
        <h2>Chat</h2>
        <p>Chat functionality coming in Phase 4...</p>
      </div>
    </div>
  );
}
