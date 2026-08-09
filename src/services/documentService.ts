import { SEED_DOCUMENTS } from '../shared/seedDocuments';
import type { KnowledgeBaseDocument, SeedDocument } from '../shared/types';
import { PersistenceService } from './persistenceService';

function toDocumentRecord(seed: SeedDocument): KnowledgeBaseDocument {
  return {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    tags: [...seed.tags],
    fileName: seed.fileName,
    updatedAt: new Date().toISOString(),
  };
}

export class DocumentService {
  constructor(private readonly persistence: PersistenceService) {}

  async listDocuments(): Promise<KnowledgeBaseDocument[]> {
    await this.persistence.ready;
    const catalog = await this.loadOrSeedCatalog();
    return [...catalog].sort((left, right) => left.title.localeCompare(right.title, 'zh-Hans-CN'));
  }

  async getDocumentById(documentId: string): Promise<KnowledgeBaseDocument | null> {
    const documents = await this.listDocuments();
    return documents.find((document) => document.id === documentId) ?? null;
  }

  async readDocumentBody(documentId: string): Promise<string | null> {
    const document = await this.getDocumentById(documentId);
    if (!document) {
      return null;
    }

    const documentPath = this.persistence.getDocumentPath(document.fileName);
    if (!(await this.persistence.pathExists(documentPath))) {
      return null;
    }

    return this.persistence.readText(documentPath);
  }

  private async loadOrSeedCatalog(): Promise<KnowledgeBaseDocument[]> {
    const catalog = await this.persistence.readJson<KnowledgeBaseDocument[]>(
      this.persistence.getCatalogPath(),
      [],
    );

    if (catalog.length > 0) {
      return catalog.map((document) => ({ ...document, tags: [...document.tags] }));
    }

    return this.seedCatalog();
  }

  private async seedCatalog(): Promise<KnowledgeBaseDocument[]> {
    const seededDocuments = SEED_DOCUMENTS.map(toDocumentRecord);

    for (const seedDocument of SEED_DOCUMENTS) {
      await this.persistence.writeText(this.persistence.getDocumentPath(seedDocument.fileName), seedDocument.body);
    }

    await this.persistence.writeJson(this.persistence.getCatalogPath(), seededDocuments);
    await this.persistence.writeJson(this.persistence.getHistoryPath(), []);

    return seededDocuments.map((document) => ({ ...document, tags: [...document.tags] }));
  }
}
