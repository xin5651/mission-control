# Mission Control 中文快速指南（v1）

> 本文为 `feature/openclaw-control-plane` 分支新增的中文导读，目标是降低上手门槛并支撑二次开发。

## 1. 项目是什么
Mission Control（Autensa）是一个面向 OpenClaw 的多 Agent 管理面板，覆盖任务编排、Agent 可视化、网关连接、监控和审计。

## 2. 本项目当前重构目标
我们不是重造轮子，而是在现有项目上新增“OpenClaw 控制面能力”：

- 面板配置 -> 生成期望状态（Desired State）
- 对比当前状态（Actual State）
- 生成变更计划（Diff/Plan）
- 用户确认后执行（Apply）
- 可审计可回滚（Audit + Rollback）

## 3. 我们这次先做什么（MVP）
第一阶段只做 4 件事：

1. 角色分工模板（planner/writer/reviewer/publisher/patrol）
2. 模型映射（每角色不同模型）
3. 定时任务策略（cron）
4. OpenClaw 配置下发（先 dry-run，再 apply）

## 4. 建议运行方式
- 开发分支：`feature/openclaw-control-plane`
- 主仓同步：`upstream/main`
- 发布策略：PR 合并，不直推 main。

## 5. 风险提示
- 网关配置属于高风险写操作，必须先出变更预览。
- 任何自动下发都要保留“人工确认开关”。
- 所有写操作要输出命令日志和前后对比。
