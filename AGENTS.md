# AGENTS.md —— 项目 01：基准版 vs 精简版

## 启动规则

在编写任何代码之前，请按顺序完成以下步骤：

1. **完整阅读本文件。** 它定义了本项目的边界和规范。
2. **阅读 `docs/ARCHITECTURE.md`**，理解 Electron 的层级结构。
3. **阅读 `docs/PRODUCT.md`**，理解功能需求。
4. **运行 `bash init.sh`**，验证项目能正常构建。如果构建失败，请在继续之前修复构建错误。
5. **阅读 `feature_list.json`**，了解所有功能的当前状态。

## Electron 层级边界

本项目有四个严格的层级，代码必须遵守这些边界：

### 主进程 (`src/main/`)
- 管理 `BrowserWindow` 的生命周期和 IPC 注册。
- 可以导入服务模块，但不能导入渲染进程代码。
- 所有文件系统访问都通过服务模块在此层进行。

### 预加载 (`src/preload/`)
- 主进程与渲染进程之间的**唯一桥梁**。
- 使用 `contextBridge.exposeInMainWorld` 暴露类型化 API。
- 绝不能导入 React 或渲染进程代码。

### 渲染进程 (`src/renderer/`)
- React + TypeScript UI 层。
- 仅通过 `window.knowledgeBase` API 与主进程通信。
- 绝不能导入 Node.js 模块（`fs`、`path`、`electron`）。
- 使用 `types.d.ts` 中的类型声明。

### 服务层 (`src/services/`)
- 在主进程中运行的纯 TypeScript 业务逻辑。
- 服务可以导入 `src/shared/` 中的内容，但不能导入 `src/renderer/` 中的内容。
- 每个服务通过构造函数注入的方式接收 `PersistenceService`。

## 编码规范

- 启用了 TypeScript strict 模式。不允许使用 `any` 类型，除非添加注释说明原因。
- 使用命名导出（不使用默认导出）。
- IPC 通道名称在 `src/shared/types.ts`（`IPC_CHANNELS`）中统一定义。
- 所有异步操作返回 Promises；绝不在渲染进程中使用同步 I/O。

## 完成标准

当以下所有条件满足时，一个功能才算"完成"：

1. TypeScript 编译无错误（`npm run check`）。
2. 应用能够启动且窗口可见（`npm run dev`）。
3. 功能在 `feature_list.json` 中状态为 `"pass"`，并附有证据。
4. 代码遵守上述 Electron 层级边界。
5. 正常运行期间无控制台错误。
6. 打开应用无报错，内容正确显示，无闪烁。

## 功能列表的使用

`feature_list.json` 文件是项目进度的唯一事实来源：

- 每个功能都有一个 `status`：`"pass"`（通过）、`"fail"`（失败）、`"not-started"`（未开始）。
- 实现某个功能后，将其状态更新为 `"pass"` 并附上证据。
- 如果某个功能被阻塞，将状态设为 `"fail"` 并附上原因。
- 绝不能从列表中删除功能条目。
