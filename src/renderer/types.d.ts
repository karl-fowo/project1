import type { KnowledgeBaseApi } from '../shared/types';

declare global {
  interface Window {
    knowledgeBase: KnowledgeBaseApi;
  }
}

export {};
