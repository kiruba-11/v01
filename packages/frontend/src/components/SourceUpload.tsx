import { useRef, useState } from 'react';
import api from '../lib/api';

interface SourceUploadProps {
  notebookId: string;
  onUploadComplete: () => void;
}

export default function SourceUpload({ notebookId, onUploadComplete }: SourceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
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

      // In a real implementation, track upload progress with XMLHttpRequest
      // For now, use a simple POST
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

  return (
    <div className="card">
      <h2>Upload Source</h2>
      {error && <div className="error">{error}</div>}
      <div
        style={{
          border: '2px dashed #cccccc',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          backgroundColor: uploading ? '#f5f5f5' : 'transparent',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          disabled={uploading}
          accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg,.webp"
          style={{ display: 'none' }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ cursor: uploading ? 'not-allowed' : 'pointer' }}
        >
          {uploading ? `Uploading... ${progress}%` : 'Click to upload file'}
        </button>
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666666' }}>
          Supported: PDF, DOCX, TXT, Markdown, CSV, XLSX, PNG, JPG, WebP (Max 100MB)
        </p>
      </div>
    </div>
  );
}
