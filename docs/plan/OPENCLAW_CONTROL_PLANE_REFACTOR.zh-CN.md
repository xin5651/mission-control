# OpenClaw 控制面重构计划（v1）

## A. 问题定义
当前多 Agent 配置分散在命令行/配置文件中，难以统一管理、审计、回滚。

## B. 目标
提供一个控制面：通过可视化配置，自动同步 OpenClaw 实际配置，支持角色分工和子 Agent 管理。

## C. 架构草图
1. UI 层：项目、角色、模型、cron、策略开关
2. 控制器层：Desired/Actual/Diff/Apply/Rollback
3. 适配层：OpenClaw Gateway/CLI
4. 审计层：操作记录、命令记录、前后配置快照

## D. 开发里程碑
- M1: 配置模型与角色模板（只读）
- M2: 变更计划生成器（dry-run）
- M3: 安全执行器（apply + rollback）
- M4: 子 Agent 分工编排面板

## E. MVP 验收标准
- 可以创建一个项目配置（角色+模型+cron）
- 可以生成变更预览（JSON patch）
- 可以一键应用到 OpenClaw（经确认）
- 可以一键回滚到上一个快照
