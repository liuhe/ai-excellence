# DCDDP 系统建模方法论

## 是什么

一套描述系统结构的语言：4 视图分层（业务 / 领域模型 / 系统逻辑 / 系统部署）+ Overview-Details 递归 + 三层用例结构（业务用例 / 系统用例 / 应用用例）+ 声明式 What/How 分离。

适用场景：人和 AI 在同一个项目内沟通系统逻辑（讨论现状、变更前对齐、实现拆解）。

## 内容

- `vision.md` — 方法论定位与三件交付物
- `modeling-conventions.md` — 建模约定细则
- `system-modeling-prompt.md` — AI 建模 prompt
- `meta-model.schema.yaml` — 元模型 schema
- `examples/chargable-proxy/` — 参考样板（端到端模型 + 生成代码）
- `app/` — viewer 应用（React + Vite）
- `diagrams/` — 通用图示

## 启用到具体项目

通过 `/aie-apply` 命令把本方法论作为可选规范启用到受管工程。详见 `../docs/system-modeling-methodology.md`。
