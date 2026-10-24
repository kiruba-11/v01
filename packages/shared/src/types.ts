// Shared types for SourcePilot

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Notebook {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface Source {
  id: string;
  notebook_id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at: string;
}

export interface Citation {
  source_id: string;
  chunk_id: string;
  passage_text: string;
  location_metadata?: any;
}
