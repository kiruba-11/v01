import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function NotebookPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: notebook, isLoading, error } = useQuery({
    queryKey: ['notebook', id],
    queryFn: async () => {
      const response = await api.get(`/notebooks/${id}`);
      return response.data;
    },
  });

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
      <button onClick={() => navigate('/dashboard')}>← Back to Dashboard</button>
      <h1>{notebook?.name}</h1>
      <p>{notebook?.description}</p>
      <div className="card">
        <h2>Sources</h2>
        <p>Source management coming soon...</p>
      </div>
      <div className="card">
        <h2>Chat</h2>
        <p>Chat functionality coming soon...</p>
      </div>
    </div>
  );
}
