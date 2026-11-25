// host 半面入口：settings 播种器（种子权威，与 dsh-zhipu / dsh-kimi /
// dsh-aliyun-bailian-provider 同款机制，无用量 pill）。
//
// 本插件不拥有 `llm-pi-ai` 行（patch 层对目标行是整行替换 `config`，多个
// bundle 的 providers 无法合并），改在每次启动、全部条目挂载 settle 后读
// 生效配置，比对 openrouter 路由与种子：缺失或不一致即经 settings 服务把
// 种子覆写进用户层（profile cordis.patch.yml）——与 Web Models 页「自定义
// 模型 API」完全同一条写入路径（update → mergeLayers，按 provider 键合并，
// 只覆写本路由、不整段覆盖）。种子因此是该路由的唯一事实源：模型跟进只需
// 改种子，重启即自动同步生效配置；代价是用户在 Models 页对该路由的编辑会在
// 下次启动被种子覆平——要自定义或移除请卸载本插件，或在 patch 中禁用本
// 挂载行（disabled: true）。
//
// 路由键取 pi-ai 内置目录的 `openrouter`：目录提供端点/协议/兼容检测的
// 默认值，显式 models 列表把供给目录替换为种子列出的精选模型。路由级
// `api` 对整条路由生效（llm-pi-ai 的模型条目不带 api），而 openrouter 目录
// 横跨 openai-completions 与 anthropic-messages 两种协议、且部分种子模型
// 尚未进入安装版目录，所以路由必须显式声明 `openai-completions`——OpenRouter
// 的统一 OpenAI 兼容端点对全部供应商模型可用，pi-ai 按 provider/baseURL
// 自动检测 OpenRouter 线上约定（thinkingFormat=openrouter、
// maxTokensField=max_completion_tokens、会话亲和头，以及对 anthropic/* 的
// developer 角色与 anthropic cache_control 标记），无需在此配置。
//
// 已知代价（与用户手动使用一次 Models 页相同）：播种会把当时生效的
// providers 全量快照进用户层；此后其他 bundle 层对该字典的更新被这份
// 快照遮蔽，直至用户手动编辑用户层文件。
//
// 凭证不落配置：路由经 apiKeyEnv 引用 OPENROUTER_API_KEY，由 harness
// 凭证机制按请求解析。

import { isDeepStrictEqual } from 'node:util'

/** The settings namespace (= profile entry id) of the pi-ai adapter row. */
const NS = 'llm-pi-ai'

/** The provider route this plugin seeds (exported for tests). */
export const ROUTE = 'openrouter'

/** One seeded model; fields follow PiAiProviderProfile's model entry. */
interface SeedModel {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  input: string[]
  /**
   * 推理档位 → 线上值。声明的档位可选；未声明的档位被 llm-pi-ai 钉为
   * 不支持。`off: null` 表示 off 可选但不在此指定线上值（pi-ai 的
   * openrouter 档位分发对缺省 off 发送 effort none）；`off: 'none'` 同线。
   */
  reasoningEfforts: Record<string, string | null>
  /**
   * 仅声明 pi-ai 按 provider/baseURL 自动检测不覆盖的开关（字段级覆盖，
   * 其余仍交自动检测）；省略即全部交自动检测。
   */
  compat?: {
    supportsStrictMode?: boolean
    requiresReasoningContentOnAssistantMessages?: boolean
  }
}

/** The seeded provider profile; fields follow @deepseek-ai/dsh-llm-pi-ai's PiAiProviderProfile. */
interface SeedProfile {
  displayName: string
  apiKeyEnv: string
  api: string
  baseURL: string
  reasoning: string
  models: SeedModel[]
}

/**
 * The openrouter route: the nine curated models below, in picker order.
 *
 * 规格来源（2026-11-25 核实）：OpenRouter 模型目录的数据源 models.dev
 * （openrouter 供应商条目）给出上下文 / 最大输出 / 输入模态 / 推理档位；
 * 输入模态按 llm-pi-ai profile 词汇（仅 text / image）声明为 text+image，
 * 与 pi-ai 目录同族条目一致。档位映射与 compat 开关对齐安装版 pi-ai 目录
 * （1.5.2）的 openrouter 同族条目：档位按线上拼写恒等映射，目录未列出的
 * 档位不声明；自动检测已给出且与目录条目相同的开关（thinkingFormat、
 * developer 角色、会话亲和头）不重复声明。
 */
const PROFILE: SeedProfile = {
  displayName: 'OpenRouter',
  apiKeyEnv: 'OPENROUTER_API_KEY',
  api: 'openai-completions',
  baseURL: 'https://openrouter.ai/api/v1',
  // 路由级默认推理等级：全部种子模型均支持 high
  reasoning: 'high',
  models: [
    {
      // DeepSeek V4.1 Flash 的 2026-10-17 快照。规格依据（2026-11-14 核实）：
      // - 上下文 1,048,576：OpenRouter 模型对比页；
      // - 最大输出 384K：DeepSeek 官方 Models & Pricing（deepseek-flash 即本快照）；
      // - text+image：官方 Vision ✓，OpenRouter 描述原生图像理解；
      // - 推理等级 none/low/high/max、默认 high：官方 Thinking Mode 指南
      //   （none 关闭思考）；与安装版 pi-ai 目录的同族条目
      //   ~deepseek/deepseek-v4-flash-latest 的 thinkingLevelMap 一致；
      // - compat 两项沿用该同族目录条目：DeepSeek 要求带 tools 的请求回传
      //   reasoning_content（否则 400），OpenRouter 对本模型支持 strict 工具模式；
      //   pi-ai 的 openrouter 自动检测不覆盖这两项，须显式声明。
      id: 'deepseek/deepseek-v4.1-flash-1017',
      name: 'DeepSeek-V4.1-Flash-1017',
      contextWindow: 1048576,
      maxTokens: 384000,
      input: ['text', 'image'],
      reasoningEfforts: { off: 'none', low: 'low', high: 'high', max: 'max' },
      compat: {
        supportsStrictMode: true,
        requiresReasoningContentOnAssistantMessages: true,
      },
    },
    {
      // OpenAI GPT-6.2 Sol（2026-11-17 上线）：档位 low/medium/high/xhigh/max；
      // 目录未列关闭思考档位，off 沿用同族目录条目（openai/gpt-6.1-sol、
      // openai/gpt-6-astra）的无值声明；strict 工具模式同该族条目。
      id: 'openai/gpt-6.2-sol',
      name: 'GPT-6.2 Sol',
      contextWindow: 1050000,
      maxTokens: 128000,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
      compat: { supportsStrictMode: true },
    },
    {
      // Google Gemini 4 Carbon（2026-11-10 上线）：档位 low/medium/high；
      // strict 工具模式沿用 pi-ai 目录同族条目（google/gemini-4-argon）的声明。
      id: 'google/gemini-4-carbon',
      name: 'Gemini 4 Carbon',
      contextWindow: 1048576,
      maxTokens: 65536,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high' },
      compat: { supportsStrictMode: true },
    },
    {
      // Google Gemini 4 Hydrogen（2026-11-12 上线）：档位 low/medium/high/xhigh。
      id: 'google/gemini-4-hydrogen',
      name: 'Gemini 4 Hydrogen',
      contextWindow: 1048576,
      maxTokens: 65536,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh' },
      compat: { supportsStrictMode: true },
    },
    {
      // Google Gemini 4 Neon（2026-11-18 上线）：档位 low/medium/high/xhigh。
      id: 'google/gemini-4-neon',
      name: 'Gemini 4 Neon',
      contextWindow: 1048576,
      maxTokens: 65536,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh' },
      compat: { supportsStrictMode: true },
    },
    {
      // OpenAI GPT-6.2 Astra（2026-11-17 上线）：档位同 GPT-6.2 Sol。
      id: 'openai/gpt-6.2-astra',
      name: 'GPT-6.2 Astra',
      contextWindow: 1050000,
      maxTokens: 128000,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
      compat: { supportsStrictMode: true },
    },
    {
      // Anthropic Claude Fable 5.2（2026-11-09 上线）：档位 low/medium/high/xhigh/max，
      // 与安装版 pi-ai 目录同 id 条目的 thinkingLevelMap 一致。该目录条目走
      // anthropic-messages 协议，本路由统一走 openai-completions：其 compat
      // （forceAdaptiveThinking 等）属 anthropic-messages 专用字段，pi-ai 按
      // 协议逐字段读取 compat，在本协议下不参与请求；本条不声明 compat，
      // 全部交 openrouter 自动检测。
      id: 'anthropic/claude-fable-5.2',
      name: 'Claude Fable 5.2',
      contextWindow: 1000000,
      maxTokens: 128000,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
    },
    {
      // Anthropic Claude Sonnet 5.5（2026-09-28 上线）：档位同 Claude Fable 5.2。
      id: 'anthropic/claude-sonnet-5.5',
      name: 'Claude Sonnet 5.5',
      contextWindow: 1000000,
      maxTokens: 128000,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
    },
    {
      // Anthropic Claude Opus 5.5（2026-09-22 上线）：档位同 Claude Fable 5.2。
      id: 'anthropic/claude-opus-5.5',
      name: 'Claude Opus 5.5',
      contextWindow: 1000000,
      maxTokens: 128000,
      input: ['text', 'image'],
      reasoningEfforts: { off: null, low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'max' },
    },
  ],
}

/**
 * 播种判定：生效 providers 里本路由缺失、或与种子不深度一致（无论来自哪个
 * 层：滞后快照、用户在 Models 页的编辑、其他 bundle 的同名注册）即需要覆写；
 * 写入按 provider 键合并，只影响 openrouter 这一个路由。
 * @param providers 生效配置的 providers 字典（describe().value.providers）。
 * @returns 是否需要播种/覆写。
 */
export function shouldSeed(providers: unknown): boolean {
  const route =
    typeof providers === 'object' && providers !== null
      ? (providers as Record<string, unknown>)[ROUTE]
      : undefined
  return !isDeepStrictEqual(route, PROFILE)
}

/**
 * 种子 profile 的深拷贝（导出供测试断言形状；调用方拿到独立副本）。
 * @returns openrouter 的 PiAiProviderProfile。
 */
export function seedProfile(): SeedProfile {
  return structuredClone(PROFILE)
}

export const name = 'dsh-openrouter-provider'

export function apply(ctx: any): void {
  // 等 loader settle 再读生效配置：apply 时 llm-pi-ai 可能尚未 ACTIVE，
  // describe() 会过滤非 ACTIVE 条目导致误判「组合里没有该适配器」。
  void ctx.loader.await().then(seed).catch(report)

  async function seed(): Promise<void> {
    // settings 为可选依赖（组合里可能没有 dsh-settings），缺失时告警跳过
    const settings = ctx.get('settings')
    if (settings === undefined) {
      ctx.logger.warn('dsh-openrouter-provider: settings 服务不可用，跳过 provider 播种（需要 dsh-base 组合）')
      return
    }
    const descriptor = settings.describe().find((row: { ns: string }) => row.ns === NS)
    if (descriptor === undefined) {
      ctx.logger.warn(`dsh-openrouter-provider: 组合中没有活跃的 ${NS} 条目，跳过 provider 播种`)
      return
    }
    if (!shouldSeed((descriptor.value ?? {}).providers)) return
    // 无 expectedRevision：启动期没有交互写入方，last-write-wins 即正确语义
    await settings.update(NS, { providers: { [ROUTE]: seedProfile() } })
    ctx.logger.info(`dsh-openrouter-provider: ${ROUTE} 缺失或与种子不一致，已覆写为种子到用户层（profile cordis.patch.yml）`)
  }

  function report(error: unknown): void {
    // 播种失败不阻断启动：路由缺失的后果（UNKNOWN_MODEL）比整进程退出轻
    ctx.logger.warn('dsh-openrouter-provider: provider 播种失败')
    ctx.logger.warn(error)
  }
}
