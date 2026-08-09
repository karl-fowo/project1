import type { SeedDocument } from './types';

export const SEED_DOCUMENTS: SeedDocument[] = [
  {
    id: 'welcome-guide',
    title: '欢迎指南',
    summary: '介绍知识库应用的基本结构和使用方式。',
    tags: ['入门', '导航'],
    fileName: 'welcome-guide.md',
    body: [
      '# 欢迎指南',
      '',
      '这里是一份用于启动体验的本地资料。它说明了文档列表区域和问答面板如何协作。',
      '',
      '你可以在左侧选择资料，再在右侧输入问题。系统会优先围绕当前选中文档给出回答。',
    ].join('\n'),
  },
  {
    id: 'workspace-layout',
    title: '工作区结构',
    summary: '解释左侧文档列表和右侧问答面板的职责。',
    tags: ['界面', '工作区'],
    fileName: 'workspace-layout.md',
    body: [
      '# 工作区结构',
      '',
      '左边是文档列表，用来切换当前资料。',
      '右边是问答面板，用来发起提问、查看答案和引用到的资料。',
      '',
      '这种布局适合快速浏览与追问。',
    ].join('\n'),
  },
  {
    id: 'local-storage',
    title: '本地存储',
    summary: '说明应用如何在用户数据目录中保存资料和问答记录。',
    tags: ['数据', '持久化'],
    fileName: 'local-storage.md',
    body: [
      '# 本地存储',
      '',
      '应用在用户数据目录下创建 `knowledge-base-data`。',
      '其中包含 `documents` 和 `index` 两个子目录，用来分别保存文档正文和索引记录。',
      '',
      '这样可以保证重启后资料仍然可用。',
    ].join('\n'),
  },
];
