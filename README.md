# Lab1 Phase 1：SVG 编辑器

**Git 仓库地址：[https://github.com/zxy0303/svg-editor-cli-lab1](https://github.com/zxy0303/svg-editor-cli-lab1)**

**提交版本：[final](https://github.com/zxy0303/svg-editor-cli-lab1/tree/final)**

## 作业说明

本次作业我使用 TypeScript 实现了一个命令行 SVG 编辑器，支持矩形、圆、椭圆、直线、文字和分组容器六种类型。可以通过命令创建和修改图形、调整分组和显示顺序，并进行撤销重做、读取和保存 SVG 文件。

在设计上，使用 Command 模式组织编辑命令，使用 Composite 模式处理容器和普通图形，撤销重做采用文档快照。项目在 Codex 辅助下分步完成，开发过程和后续修改保留在仓库的提交记录中。

完整的[课程作业报告](https://github.com/zxy0303/svg-editor-cli-lab1/blob/final/doc/README.md)保存在 `doc/README.md`，包含架构方案、过程记录、一致性自查和质量保证四部分。仓库中还提供了自动化测试、PlantUML 架构图，以及课程案例的命令脚本和 SVG 文件。

## 运行方法

需要 Node.js 22 或更新版本。下载仓库中的 final 版本后，在项目根目录执行：

```sh
npm ci
npm run cli
```

进入程序后输入 `help` 查看命令，按 Ctrl+D 退出。运行 `npm run check` 可以进行编译、类型检查和自动化测试。
