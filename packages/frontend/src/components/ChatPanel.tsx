import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any[];
  created_at: string;
}

interface ChatPanelProps {
  notebookId: string;
}

export default function ChatPanel({ notebookId }: ChatPanelProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, [notebookId]);

  useEffect(() => {
    if (activeConvoId) {
      loadMessages(activeConvoId);
    } else {
      setMessages([]);
    }
  }, [activeConvoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await api.get(`/notebooks/${notebookId}/chat`);
      setConversations(res.data);
      if (res.data.length > 0 && !activeConvoId) {
        setActiveConvoId(res.data[0].id);
      } else if (res.data.length === 0) {
        createNewConversation();
      }
    } catch (err) {
      console.error('Failed to load conversations', err);
    }
  };

  const createNewConversation = async () => {
    try {
      const res = await api.post(`/notebooks/${notebookId}/chat`, {
        title: 'New Research Chat',
      });
      setConversations([res.data, ...conversations]);
      setActiveConvoId(res.data.id);
    } catch (err) {
      console.error('Failed to create conversation', err);
    }
  };

  const loadMessages = async (convoId: string) => {
    try {
      const res = await api.get(`/notebooks/${notebookId}/chat/${convoId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvoId || loading) return;

    const userQuery = input.trim();
    setInput('');
    setLoading(true);

    // Optimistic user message
    const tempUserMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userQuery,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await api.post(`/notebooks/${notebookId}/chat/${activeConvoId}/messages`, {
        content: userQuery,
      });

      setMessages(prev => [...prev, res.data]);
    } catch (err: any) {
      console.error('Failed to send message', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${err.response?.data?.error || 'Failed to generate response'}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '16px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>AI Research Chat (RAG)</h2>
        <button
          onClick={createNewConversation}
          style={{ padding: '6px 12px', background: 'var(--accent-color)', color: 'var(--accent-text)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
        >
          + New Chat
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        {/* Conversations sidebar */}
        <div style={{ width: '180px', borderRight: '1px solid var(--border-color)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '8px' }}>
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveConvoId(c.id)}
              style={{
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeConvoId === c.id ? 'var(--bg-tertiary)' : 'transparent',
                color: activeConvoId === c.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontWeight: activeConvoId === c.id ? 600 : 400,
                fontSize: '13px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {c.title}
            </button>
          ))}
        </div>

        {/* Messages area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
            {messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '80px' }}>
                <p style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Ask any question about your notebook sources.</p>
                <p style={{ fontSize: '13px' }}>Answers are grounded directly in your uploaded files and web URLs with citations.</p>
              </div>
            ) : (
              messages.map(m => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '88%',
                    background: m.role === 'user' ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                    color: m.role === 'user' ? 'var(--accent-text)' : 'var(--text-primary)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    lineHeight: '1.5',
                  }}
                >
                  <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(0,0,0,0.1)', fontSize: '12px', opacity: 0.85 }}>
                      <strong>Sources:</strong> {m.citations.map((cit: any) => cit.fileName).join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '10px 16px', borderRadius: '8px', fontSize: '14px' }}>
                Thinking and analyzing sources...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Ask a question about your sources..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                padding: '10px 20px',
                background: 'var(--accent-color)',
                color: 'var(--accent-text)',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 500,
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
