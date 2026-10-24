import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface SourceListProps {
  notebookId: string;
  onRefresh?: () => void;
}

export default function SourceList({ notebookId }: SourceListProps) {
  const { data: sources, isLoading, error } = useQuery({
    queryKey: ['sources', notebookId],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${notebookId}/sources`);
      return response.data;
    },
  });

  if (isLoading) {
    return <div className="loading">Loading sources...</div>;
  }

  if (error) {
    return <div className="error">Failed to load sources</div>;
  }

  return (
    <div className="card">
      <h2>Sources</h2>
      {sources && sources.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
              <th style={{ textAlign: 'left', padding: '8px' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Type</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Size</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px' }}>Date</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source: any) => (
              <tr key={source.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '8px' }}>{source.file_name}</td>
                <td style={{ padding: '8px' }}>{source.file_type}</td>
                <td style={{ padding: '8px' }}>{(source.file_size / 1024 / 1024).toFixed(2)} MB</td>
                <td style={{ padding: '8px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      backgroundColor:
                        source.extraction_status === 'completed'
                          ? '#e8f5e9'
                          : source.extraction_status === 'processing'
                          ? '#fff3e0'
                          : source.extraction_status === 'failed'
                          ? '#ffebee'
                          : '#f5f5f5',
                      color:
                        source.extraction_status === 'completed'
                          ? '#2e7d32'
                          : source.extraction_status === 'processing'
                          ? '#f57f17'
                          : source.extraction_status === 'failed'
                          ? '#c62828'
                          : '#333333',
                    }}
                  >
                    {source.extraction_status}
                  </span>
                </td>
                <td style={{ padding: '8px' }}>
                  {new Date(source.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No sources uploaded yet. Upload a document to get started.</p>
      )}
    </div>
  );
}
