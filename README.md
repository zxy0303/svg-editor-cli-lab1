# SVG 编辑器 CLI · Lab1 Phase 1

使用 TypeScript、Command 与 Composite 完成的课程项目。

Git 仓库地址：[https://github.com/zxy0303/svg-editor-cli-lab1](https://github.com/zxy0303/svg-editor-cli-lab1)。

[![CI](https://github.com/zxy0303/svg-editor-cli-lab1/actions/workflows/ci.yml/badge.svg)](https://github.com/zxy0303/svg-editor-cli-lab1/actions/workflows/ci.yml)

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

进入交互模式后可尝试：

```text
init
create g scene
create rect r1 20 30 100 60 #4a90d9 in scene
create text t1 40 65 "Hello SVG" in scene
move scene 20 0
undo
tree
save example.svg
```

输入 `help` 查看全部 19 个命令，按 Ctrl+D 结束。`#` 开头的整行视为注释；带空格参数用双引号包裹。

## 行为约定

- 编辑命令可撤销/重做；失败不会改变文档或历史。显示和 canvas 查询不进入历史。
- init/read/save/canvas 修改成功后清空历史并锁定 undo/redo，下一条编辑命令重新解禁。
- 无参数 save 使用最近一次 read 的路径；显式另存为不会改变该路径。init 后须显式指定保存路径。
- group 按原文档遍历顺序收编，并放在首个选中图形原来的位置。根级容器按题目要求不能 ungroup。
- 本阶段只支持 rect/circle/ellipse/line/text/g。box 和完整插件框架不在本阶段范围。
- 外部额外属性保留，已有 transform 使用局部坐标编辑；支持范围与限制详见课程文档。

## 提交材料

- [架构、过程记录、一致性自查与质量保证](doc/README.md)
- [PlantUML 源码](doc/architecture.puml)及[架构图](doc/architecture.svg)
- [课程原始要求](phase_cli_1.md)
- [流程图示例](examples/flowchart.svg)与[回放脚本](examples/flowchart.commands)

最终版本通过 [`final` tag](https://github.com/zxy0303/svg-editor-cli-lab1/tree/final) 标识。仓库已公开，可直接查看代码、文档和分步提交历史。课程系统上传文件请使用 [doc/README.md](doc/README.md)，其中包含仓库地址及课程要求的四节完整文档。
