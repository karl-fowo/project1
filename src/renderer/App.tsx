import { useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeBaseAnswer, KnowledgeBaseDocument } from '../shared/types';

type MessageRole = 'user' | 'assistant';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  citations: KnowledgeBaseDocument[];
  createdAt: string;
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function createMessage(role: MessageRole, text: string, citations: KnowledgeBaseDocument[] = []): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    text,
    citations,
    createdAt: new Date().toISOString(),
  };
}

export function App(): JSX.Element {
  const [documents, setDocuments] = useState<KnowledgeBaseDocument[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadDocuments = async (): Promise<void> => {
      try {
        setIsLoadingDocuments(true);
        const loadedDocuments = await window.knowledgeBase.documents.list();

        if (cancelled) {
          return;
        }

        setDocuments(loadedDocuments);
        setSelectedDocumentId(loadedDocuments[0]?.id ?? null);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : '无法读取本地文档。');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDocuments(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const selectedDocument = useMemo(
    () => documents.find((document) => document.id === selectedDocumentId) ?? null,
    [documents, selectedDocumentId],
  );

  const handleAsk = async (): Promise<void> => {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isAsking) {
      return;
    }

    setError(null);
    setIsAsking(true);
    setMessages((currentMessages) => [...currentMessages, createMessage('user', trimmedQuestion)]);
    setQuestion('');

    try {
      const response = await window.knowledgeBase.qa.ask({
        question: trimmedQuestion,
        documentId: selectedDocumentId,
      });

      setMessages((currentMessages) => [
        ...currentMessages,
        createAssistantMessage(response),
      ]);
    } catch (askError) {
      const message = askError instanceof Error ? askError.message : '提问失败。';
      setError(message);
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', message),
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const createAssistantMessage = (response: KnowledgeBaseAnswer): ChatMessage => ({
    id: response.id,
    role: 'assistant',
    text: response.answer,
    citations: response.citedDocuments,
    createdAt: response.createdAt,
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="section-label">文档</div>
          <div className="section-title">{isLoadingDocuments ? '正在读取本地资料' : `${documents.length} 份资料`}</div>
        </div>

        <div className="document-list" role="list">
          {documents.map((document) => {
            const isSelected = document.id === selectedDocumentId;

            return (
              <button
                key={document.id}
                type="button"
                className={`document-item${isSelected ? ' selected' : ''}`}
                onClick={() => setSelectedDocumentId(document.id)}
              >
                <div className="document-item-top">
                  <span className="document-title">{document.title}</span>
                  <span className="document-time">{formatTime(document.updatedAt)}</span>
                </div>
                <p className="document-summary">{document.summary}</p>
                <div className="tag-row">
                  {document.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}

          {!isLoadingDocuments && documents.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-title">暂无文档</div>
              <div className="empty-state-copy">本地目录会在首次启动时自动建立。</div>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div>
            <div className="section-label">问答</div>
            <h1 className="workspace-title">{selectedDocument?.title ?? '未选中文档'}</h1>
          </div>
          <div className="workspace-meta">
            <span className="meta-pill">{documents.length} 份资料</span>
            {error ? <span className="meta-pill danger">{error}</span> : null}
          </div>
        </header>

        <section className="document-focus">
          <p className="focus-summary">{selectedDocument?.summary ?? '从左侧选择一份文档开始。'}</p>
          {selectedDocument ? (
            <div className="tag-row">
              {selectedDocument.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        <section className="thread">
          {messages.length === 0 ? (
            <div className="empty-thread">
              <div className="empty-thread-title">开始提问</div>
              <div className="empty-thread-copy">输入一个问题，答案会结合当前文档与本地资料返回。</div>
            </div>
          ) : null}

          {messages.map((message) => (
            <article key={message.id} className={`message ${message.role}`}>
              <div className="message-header">
                <span className="message-role">{message.role === 'user' ? '你' : '知识库'}</span>
                <span className="message-time">{formatTime(message.createdAt)}</span>
              </div>
              <p className="message-text">{message.text}</p>
              {message.citations.length > 0 ? (
                <div className="citation-row">
                  {message.citations.map((document) => (
                    <span key={document.id} className="citation">
                      {document.title}
                    </span>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          <div ref={threadEndRef} />
        </section>

        <form
          className="composer"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAsk();
          }}
        >
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            className="question-input"
            placeholder="输入问题"
            disabled={isLoadingDocuments}
          />
          <button type="submit" className="ask-button" disabled={isLoadingDocuments || isAsking}>
            {isAsking ? '提问中…' : '提问'}
          </button>
        </form>
      </main>
    </div>
  );
}
