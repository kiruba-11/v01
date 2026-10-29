import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Activity } from 'lucide-react';

export default function AIStatusBadge() {
  const { data } = useQuery({
    queryKey: ['ai-status'],
    queryFn: async () => {
      try {
        const res = await api.get('/health/ai');
        return res.data;
      } catch {
        return { activeLabel: 'Omniroute AI Active' };
      }
    },
    staleTime: 60000,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'var(--bg-tertiary)',
        padding: '4px 10px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        fontSize: '12px',
        color: 'var(--text-secondary)',
      }}
      title={`AI Provider: ${data?.providerName || 'OmniRoute'} | Model: ${data?.model || 'default'} | BaseURL: ${data?.baseUrl || 'default'}`}
    >
      <Activity style={{ width: '13px', height: '13px', color: 'var(--accent-color)' }} />
      <span>{data?.activeLabel || 'Omniroute AI Active'}</span>
    </div>
  );
}
