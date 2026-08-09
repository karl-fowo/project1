import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type AskQuestionRequest, type KnowledgeBaseAnswer, type KnowledgeBaseDocument } from '../shared/types';

const api = {
  documents: {
    list: async (): Promise<KnowledgeBaseDocument[]> => {
      return ipcRenderer.invoke(IPC_CHANNELS.DOCUMENTS_GET_ALL) as Promise<KnowledgeBaseDocument[]>;
    },
  },
  qa: {
    ask: async (request: AskQuestionRequest): Promise<KnowledgeBaseAnswer> => {
      return ipcRenderer.invoke(IPC_CHANNELS.QA_ASK, request) as Promise<KnowledgeBaseAnswer>;
    },
  },
};

contextBridge.exposeInMainWorld('knowledgeBase', api);
