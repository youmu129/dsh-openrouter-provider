# dsh-openrouter-provider

DSH 插件：向 `llm-pi-ai` 用户层播种 OpenRouter 供应商路由（`https://openrouter.ai/api/v1`），**仅提供 `deepseek/deepseek-v4.1-flash-1017` 这一个模型**。与 dsh-zhipu / dsh-kimi / dsh-aliyun-bailian-provider 同款「种子权威」播种机制，不含用量 pill。

## 功能范围

- **播种**：每次启动 loader settle 后，把生效配置中的 `openrouter` 路由与种子深度比对（`node:util` isDeepStrictEqual），缺失或不一致即经 settings 服务按 provider 键覆写用户层（profile `cordis.patch.yml`）——与 Web Models 页「自定义模型 API」同一条写入路径，只影响 `openrouter` 这一个路由；
- **单模型种子**：`deepseek/deepseek-v4.1-flash-1017`（DeepSeek V4.1 Flash 的 2026-10-17 快照），1M 上下文（1,048,576）、384K 最大输出、text+image 输入、推理等级 off/low/high/max（线上 `none/low/high/max`，默认 high）；
- **凭证**：路由经 `apiKeyEnv` 引用 `OPENROUTER_API_KEY`，由 DSH 凭证机制按请求解析。凭证只存放于 DSH 凭证机制，不入库、不写入日志与文档。

## 种子权威的含义

种子是 `openrouter` 路由的唯一事实源：模型跟进只需改种子并重启，生效配置自动同步。代价是用户在 Models 页对该路由的手工编辑会在下次启动被种子覆平；要自定义或移除请卸载本插件，或在 profile patch 中禁用本挂载行（`disabled: true`）。播种会把当时生效的 providers 全量快照进用户层（与手动使用一次 Models 页相同），此后其他 bundle 层对该字典的更新被这份快照遮蔽，直至用户手动编辑用户层文件。

## 构建与测试

```sh
pnpm install
pnpm build   # tsdown：src/index.ts → lib/index.js（host 半面，ESM）
pnpm test    # Node 原生测试（tsx 加载 TS），单进程聚合入口 test/run-all.ts
```

## 安装

先 `pnpm install && pnpm build`（link 安装不构建被链目录），再经 DSH **Plugins > Add plugin** 选择本目录，或 `dsh plugin --profile <name> add <本目录绝对路径>`。安装后重启 profile，Models 页应出现 OpenRouter 供应商且仅含一个模型。

## 状态

初版开发中。

## 约定

- 提交遵循元仓库 `git-commit` 技能规范（Conventional Commits 本地化变体）；
- 临时文件放工作台 `tmp/`，不进本仓库；
- 插件机制与 API 以 `repos/deepseek-harness` 源码及本机安装的 DSH 为基准。
