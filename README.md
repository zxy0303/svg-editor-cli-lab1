# SVG 编辑器 CLI · Lab1 Phase 1

使用 TypeScript、Command 与 Composite 完成的课程项目。

## 环境和运行

需要 Node.js 22 或更新版本以及 npm。

```sh
npm ci
npm run cli
npm run build
npm start
```

作业原文见 [phase_cli_1.md](phase_cli_1.md)，架构、开发过程和验收说明见 [doc/README.md](doc/README.md)。

已实现六类图形、容器编辑、显示、撤销重做和 SVG 文件读写。

运行验证：`npm run check`（编译、测试类型检查、自动化测试）。

## 示例

```sh
npm run --silent cli < examples/flowchart.commands
npm run --silent cli < examples/session.commands
```

第一条生成 `examples/flowchart.svg`，可在浏览器直接打开。第二条回放题目典型会话，包含两条预期错误（非法分组、save 后撤销）。
