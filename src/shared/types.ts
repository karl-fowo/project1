export const IPC_CHANNELS = {
  DOCUMENTS_GET_ALL: 'documents:get-all',
  QA_ASK: 'qa:ask',
} as const;

export interface KnowledgeBaseDocument {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  fileName: string;
  updatedAt: string;
}

export interface SeedDocument {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  fileName: string;
  body: string;
}

export interface AskQuestionRequest {
  question: string;
  documentId?: string | null;
}

export interface QaHistoryEntry {
  id: string;
  question: string;
  answer: string;
  selectedDocumentId: string | null;
  citedDocumentIds: string[];
  createdAt: string;
}

export interface KnowledgeBaseAnswer {
  id: string;
  question: string;
  answer: string;
  selectedDocumentId: string | null;
  citedDocuments: KnowledgeBaseDocument[];
  createdAt: string;
}

export interface KnowledgeBaseApi {
  documents: {
    list(): Promise<KnowledgeBaseDocument[]>;
  };
  qa: {
    ask(request: AskQuestionRequest): Promise<KnowledgeBaseAnswer>;
  };
}
