import { app } from 'electron';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export class PersistenceService {
  private readonly rootDir: string;
  private readonly documentsDir: string;
  private readonly indexDir: string;
  public readonly ready: Promise<void>;

  constructor(baseDir?: string) {
    this.rootDir = baseDir ?? path.join(app.getPath('userData'), 'knowledge-base-data');
    this.documentsDir = path.join(this.rootDir, 'documents');
    this.indexDir = path.join(this.rootDir, 'index');
    this.ready = this.ensureDirectories();
  }

  async ensureDirectories(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true });
    await mkdir(this.documentsDir, { recursive: true });
    await mkdir(this.indexDir, { recursive: true });
  }

  getRootDir(): string {
    return this.rootDir;
  }

  getDocumentsDir(): string {
    return this.documentsDir;
  }

  getIndexDir(): string {
    return this.indexDir;
  }

  getCatalogPath(): string {
    return path.join(this.indexDir, 'catalog.json');
  }

  getHistoryPath(): string {
    return path.join(this.indexDir, 'qa-history.json');
  }

  getDocumentPath(fileName: string): string {
    return path.join(this.documentsDir, fileName);
  }

  async pathExists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readJson<T>(filePath: string, fallback: T): Promise<T> {
    if (!(await this.pathExists(filePath))) {
      return fallback;
    }

    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw) as T;
  }

  async writeJson<T>(filePath: string, value: T): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }

  async readText(filePath: string): Promise<string> {
    return readFile(filePath, 'utf8');
  }

  async writeText(filePath: string, value: string): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, value, 'utf8');
  }
}
