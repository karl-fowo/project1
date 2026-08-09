import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { DocumentService } from '../services/documentService';
import { PersistenceService } from '../services/persistenceService';
import { QaService } from '../services/qaService';
import { IPC_CHANNELS, type AskQuestionRequest } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let documentService: DocumentService | null = null;
let qaService: QaService | null = null;
let ipcRegistered = false;

function registerIpcHandlers(): void {
  if (ipcRegistered) {
    return;
  }

  ipcMain.handle(IPC_CHANNELS.DOCUMENTS_GET_ALL, async () => {
    if (!documentService) {
      return [];
    }

    return documentService.listDocuments();
  });

  ipcMain.handle(IPC_CHANNELS.QA_ASK, async (_event, request: AskQuestionRequest) => {
    if (!qaService) {
      throw new Error('Q&A service is not ready.');
    }

    return qaService.ask(request);
  });

  ipcRegistered = true;
}

async function createMainWindow(): Promise<void> {
  const persistenceService = new PersistenceService();
  await persistenceService.ready;

  documentService = new DocumentService(persistenceService);
  qaService = new QaService(persistenceService, documentService);
  registerIpcHandlers();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 680,
    title: 'Knowledge Base',
    backgroundColor: '#f6f7fb',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await createMainWindow();

  app.on('activate', () => {
    if (!mainWindow) {
      void createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
