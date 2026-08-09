import { randomUUID } from 'node:crypto';
import type {
  AskQuestionRequest,
  KnowledgeBaseAnswer,
  KnowledgeBaseDocument,
  QaHistoryEntry,
} from '../shared/types';
import { DocumentService } from './documentService';
import { PersistenceService } from './persistenceService';

interface RankedDocument {
  document: KnowledgeBaseDocument;
  score: number;
  excerpt: string;
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s,.;!?，。！？、/\\(){}\[\]<>:"'`~@#$%^&*-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function summarizeBody(body: string): string {
  const collapsed = body.replace(/\s+/g, ' ').trim();
  return collapsed.length > 180 ? `${collapsed.slice(0, 180)}…` : collapsed;
}

export class QaService {
  constructor(
    private readonly persistence: PersistenceService,
    private readonly documentService: DocumentService,
  ) {}

  async ask(request: AskQuestionRequest): Promise<KnowledgeBaseAnswer> {
    await this.persistence.ready;
    const question = request.question.trim();
    const documents = await this.documentService.listDocuments();
    const selectedDocument = request.documentId
      ? documents.find((document) => document.id === request.documentId) ?? null
      : null;

    const rankedDocuments = await this.rankDocuments(question, documents, selectedDocument);
    const citedDocuments = rankedDocuments.slice(0, 3).map((entry) => entry.document);
    const answerText = this.composeAnswer(question, selectedDocument, rankedDocuments);
    const response: KnowledgeBaseAnswer = {
      id: randomUUID(),
      question,
      answer: answerText,
      selectedDocumentId: selectedDocument?.id ?? null,
      citedDocuments,
      createdAt: new Date().toISOString(),
    };

    await this.appendHistory(response);

    return response;
  }

  private async rankDocuments(
    question: string,
    documents: KnowledgeBaseDocument[],
    selectedDocument: KnowledgeBaseDocument | null,
  ): Promise<RankedDocument[]> {
    const tokens = tokenize(question);
    const ranked = await Promise.all(
      documents.map(async (document) => {
        const body = (await this.documentService.readDocumentBody(document.id)) ?? '';
        const haystack = `${document.title} ${document.summary} ${body}`.toLowerCase();
        let score = 0;

        for (const token of tokens) {
          if (haystack.includes(token)) {
            score += token.length > 3 ? 2 : 1;
          }
        }

        if (selectedDocument?.id === document.id) {
          score += 5;
        }

        return {
          document,
          score,
          excerpt: summarizeBody(body || document.summary),
        };
      }),
    );

    return ranked
      .sort((left, right) => right.score - left.score || left.document.title.localeCompare(right.document.title, 'zh-Hans-CN'))
      .filter((entry) => entry.score > 0);
  }

  private composeAnswer(
    question: string,
    selectedDocument: KnowledgeBaseDocument | null,
    rankedDocuments: RankedDocument[],
  ): string {
    if (rankedDocuments.length === 0) {
      return '当前资料里还没有直接匹配的问题线索。可以先在左侧选择一份文档，再继续追问。';
    }

    const leadDocument = rankedDocuments[0];
    const citedTitles = rankedDocuments.slice(0, 3).map((entry) => `《${entry.document.title}》`).join('、');
    const leadSnippet = leadDocument.excerpt || leadDocument.document.summary;
    const focusText = selectedDocument ? `你当前选中的是《${selectedDocument.title}》。` : '';

    return [
      focusText,
      `我先对「${question}」做了资料匹配，重点看了 ${citedTitles}。`,
      `从最相关的资料来看：${leadSnippet}`,
      '如果你想继续，我可以基于当前选中的文档继续展开。',
    ].join(' ');
  }

  private async appendHistory(answer: KnowledgeBaseAnswer): Promise<void> {
    const history = await this.persistence.readJson<QaHistoryEntry[]>(this.persistence.getHistoryPath(), []);
    history.push({
      id: answer.id,
      question: answer.question,
      answer: answer.answer,
      selectedDocumentId: answer.selectedDocumentId,
      citedDocumentIds: answer.citedDocuments.map((document) => document.id),
      createdAt: answer.createdAt,
    });
    await this.persistence.writeJson(this.persistence.getHistoryPath(), history);
  }
}
