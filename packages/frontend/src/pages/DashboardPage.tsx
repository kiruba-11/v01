import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/auth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [newNotebookName, setNewNotebookName] = useState('');
  const [error, setError] = useState('');

  // Check if authenticated
  React.useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    }
  }, []);

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
    mutationFn: (name: string) => api.post('/notebooks', { name }),
    onSuccess: () => {
      setNewNotebookName('');
      refetch();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to create notebook');
    },
  });

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotebookName.trim()) return;
    createNotebookMutation.mutate(newNotebookName);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!isAuthenticated()) {
    return <div className="loading">Redirecting to login...</div>;
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1>Dashboard</h1>
        <div>
          <span style={{ marginRight: '16px' }}>Welcome, {user?.name || user?.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <h2>New Notebook</h2>
        <form onSubmit={handleCreateNotebook}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Notebook name"
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" disabled={createNotebookMutation.isPending}>
              Create
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2>Your Notebooks</h2>
        {isLoading ? (
          <div className="loading">Loading notebooks...</div>
        ) : notebooks && notebooks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {notebooks.map((notebook: any) => (
              <div
                key={notebook.id}
                className="card"
                onClick={() => navigate(`/notebooks/${notebook.id}`)}
                style={{ cursor: 'pointer' }}
              >
                <h3>{notebook.name}</h3>
                <p>{notebook.description}</p>
                <small>Created: {new Date(notebook.created_at).toLocaleDateString()}</small>
              </div>
            ))}
          </div>
        ) : (
          <p>No notebooks yet. Create one to get started!</p>
        )}
      </div>
    </div>
  );
}
