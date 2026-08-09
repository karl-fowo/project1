# project1

Electron 知识库应用。提示词如下：
用 Electron 做一个知识库应用，窗口左边是文档列表区域，右边是问答面板区域，应用需要创建并使用本地数据目录运行方式


```bash
npm install
npm start
```

应用会在 Electron 的本地数据目录里创建并使用知识库数据。
如果 Electron 下载超时，可以改用：

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ npm install
```
