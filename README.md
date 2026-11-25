# dsh-openrouter-provider

DSH 插件：向 `llm-pi-ai` 用户层播种 OpenRouter 供应商路由（`https://openrouter.ai/api/v1`），**提供下表九个精选模型**。与 dsh-zhipu / dsh-kimi / dsh-aliyun-bailian-provider 同款「种子权威」播种机制，不含用量 pill。

## 功能范围

- **播种**：每次启动 loader settle 后，把生效配置中的 `openrouter` 路由与种子深度比对（`node:util` isDeepStrictEqual），缺失或不一致即经 settings 服务按 provider 键覆写用户层（profile `cordis.patch.yml`）——与 Web Models 页「自定义模型 API」同一条写入路径，只影响 `openrouter` 这一个路由；
- **模型种子**（路由走 `openai-completions`，全部模型 text+image 输入；规格据 OpenRouter 目录数据源 [models.dev](https://models.dev)，2026-11-25 核实）。**排序**：按训练方分组（模型 id 前缀字典序：anthropic → deepseek → google → openai），组内按厂商官方能力定位由高到低（旗舰 → 均衡 → 轻量）：

  | 模型 id | 显示名 | 训练方定位 | 上下文 | 最大输出 | 推理档位 |
  | --- | --- | --- | --- | --- | --- |
  | `anthropic/claude-fable-5.2` | Claude Fable 5.2 | 旗舰：苛刻推理与长程 agentic 工作 | 1,000,000 | 128,000 | off / low / medium / high / xhigh / max |
  | `anthropic/claude-opus-5.5` | Claude Opus 5.5 | 次旗舰：多数工作负载的起点 | 1,000,000 | 128,000 | off / low / medium / high / xhigh / max |
  | `anthropic/claude-sonnet-5.5` | Claude Sonnet 5.5 | 均衡档 | 1,000,000 | 128,000 | off / low / medium / high / xhigh / max |
  | `deepseek/deepseek-v4.1-flash-1017` | DeepSeek-V4.1-Flash-1017 | Flash 档 | 1,048,576 | 384,000 | off / low / high / max |
  | `google/gemini-4-carbon` | Gemini 4 Carbon | 旗舰：最难的长程项目 | 1,048,576 | 65,536 | off / low / medium / high |
  | `google/gemini-4-neon` | Gemini 4 Neon | 中杯：介于最高智能与最高效率之间 | 1,048,576 | 65,536 | off / low / medium / high / xhigh |
  | `google/gemini-4-hydrogen` | Gemini 4 Hydrogen | 日常高频：追求响应速度 | 1,048,576 | 65,536 | off / low / medium / high / xhigh |
  | `openai/gpt-6.2-astra` | GPT-6.2 Astra | 旗舰：复杂推理与编程 | 1,050,000 | 128,000 | off / low / medium / high / xhigh / max |
  | `openai/gpt-6.2-sol` | GPT-6.2 Sol | 均衡档：兼顾能力与成本的日常首选 | 1,050,000 | 128,000 | off / low / medium / high / xhigh / max |

  路由默认推理等级 `high`（全部模型支持）。档位映射与 compat 开关对齐安装版 pi-ai 目录的 openrouter 同族条目：档位按线上拼写恒等映射，`off` 发送 OpenRouter `reasoning.effort: none`；Claude 三项在 pi-ai 目录中走 anthropic-messages 协议，本路由统一走 OpenAI 兼容端点（llm-pi-ai 的路由级 `api` 对整条路由生效，且 GPT-6.2 / Gemini 4 新型号尚未进入安装版目录），其请求兼容交 pi-ai 的 openrouter 自动检测；
- **凭证**：路由经 `apiKeyEnv` 引用 `OPENROUTER_API_KEY`，由 DSH 凭证机制按请求解析。凭证只存放于 DSH 凭证机制，不入库、不写入日志与文档。

## 种子权威的含义

种子是 `openrouter` 路由的唯一事实源：模型跟进只需改种子并重启，生效配置自动同步。代价是用户在 Models 页对该路由的手工编辑会在下次启动被种子覆平；要自定义或移除请卸载本插件，或在 profile patch 中禁用本挂载行（`disabled: true`）。播种会把当时生效的 providers 全量快照进用户层（与手动使用一次 Models 页相同），此后其他 bundle 层对该字典的更新被这份快照遮蔽，直至用户手动编辑用户层文件。

## 构建与测试

```sh
pnpm install
pnpm build   # tsdown：src/index.ts → lib/index.js（host 半面，ESM）
pnpm test    # Node ≥24 原生 type-strip 跑 node:test，单进程聚合入口 test/run-all.ts
```

## 安装

```powershell
dsh plugin --profile web add https://github.com/youmu129/dsh-openrouter-provider
```

或本地开发安装：先 `pnpm install && pnpm build`（link 安装不构建被链目录），再经 DSH **Plugins > Add plugin** 选择本目录，或 `dsh plugin --profile <name> add <本目录绝对路径>`。安装后重启 profile，Models 页应出现 OpenRouter 供应商且含上表九个模型；已装旧版的 profile 在下次重启时由种子权威自动把路由覆写为九模型，无需手工同步用户层。

## 状态

- 初版：单模型种子（DeepSeek-V4.1-Flash-1017），build + 单测全绿；种子经本机安装版 dsh-llm-pi-ai（0.2.2-rc.1）严格解析校验；已 link 安装进 web profile。
- 2026-11-25：种子新增八个模型（GPT-6.2 Sol / Astra、Gemini 4 Carbon / Hydrogen / Neon、Claude Fable 5.2 / Sonnet 5.5 / Opus 5.5），规格据 models.dev；同日按「训练方分组 → 组内能力定位」重排为上表顺序。build + 单测全绿，九模型种子经本机安装版 dsh-llm-pi-ai（0.2.2-rc.1）严格解析校验；GUI 目检与 OPENROUTER_API_KEY 凭证录入待做。

## 约定

- 提交遵循元仓库 `git-commit` 技能规范（Conventional Commits 本地化变体）；
- 临时文件放工作台 `tmp/`，不进本仓库；
- 插件机制与 API 以 `repos/deepseek-harness` 源码及本机安装的 DSH 为基准。
