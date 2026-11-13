// 播种器静态与 apply 级校验：
// 1. 种子 profile 满足 llm-pi-ai 路由的硬性要求（api、baseURL、非空
//    models —— 缺失会提交到 Host 才被拒）；
// 2. 规格基准守卫：单模型种子的关键字段与官方文档 / pi-ai 同族目录条目
//    一致（模型跟进改种子时须同步本基准）；
// 3. patch 不目标 `llm-pi-ai` 行（多 bundle 覆盖问题的回归守卫）；
// 4. shouldSeed 判定：路由缺失或与种子不深度一致（任意层来源）即覆写，
//    深度一致才跳过；
// 5. apply 级守卫：不一致经 settings 覆写为种子、一致不写、缺 settings /
//    缺 llm-pi-ai 条目时告警跳过不抛错。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { apply, name, ROUTE, seedProfile, shouldSeed } from '../src/index.ts'

const root = fileURLToPath(new URL('..', import.meta.url))

test('seed profile satisfies the route requirements', () => {
  const profile = seedProfile()
  assert.ok(profile.api.length > 0, 'api 必填')
  assert.ok(/^https?:\/\//.test(profile.baseURL), 'baseURL 必须是 http(s) URL')
  assert.ok(profile.apiKeyEnv.length > 0, 'apiKeyEnv 必填（凭证引用名）')
  assert.ok(profile.models.length > 0, '至少一个模型，否则 Host 以 resolves no models 拒绝')
  for (const model of profile.models) {
    assert.ok(model.id.length > 0, '模型 id 必填')
    assert.ok(model.contextWindow > 0, '模型 contextWindow 必须为正')
    assert.ok(model.maxTokens > 0, '模型 maxTokens 必须为正')
    assert.ok(model.input.length > 0, '模型 input 非空')
    assert.ok(Object.keys(model.reasoningEfforts).length > 0, '模型需声明推理等级映射')
  }
})

test('seed offers exactly deepseek/deepseek-v4.1-flash-1017 with the documented specs', () => {
  const profile = seedProfile()
  assert.equal(ROUTE, 'openrouter')
  assert.equal(profile.displayName, 'OpenRouter')
  assert.equal(profile.apiKeyEnv, 'OPENROUTER_API_KEY')
  assert.equal(profile.api, 'openai-completions')
  assert.equal(profile.baseURL, 'https://openrouter.ai/api/v1')
  // 路由级默认推理等级 = 模型原生默认 high（官方 Thinking Mode 指南）
  assert.equal(profile.reasoning, 'high')

  // 仅提供这一个模型
  assert.deepEqual(profile.models.map((m) => m.id), ['deepseek/deepseek-v4.1-flash-1017'])
  const [model] = profile.models
  assert.equal(model.name, 'DeepSeek-V4.1-Flash-1017')
  // 1M 上下文（OpenRouter 模型页）；384K 最大输出（DeepSeek 官方 Models & Pricing）
  assert.equal(model.contextWindow, 1048576)
  assert.equal(model.maxTokens, 384000)
  // 原生视觉（官方 Vision ✓）
  assert.deepEqual(model.input, ['text', 'image'])
  // 推理等级 none/low/high/max（官方 Thinking Mode；off 线上发送 none），
  // 与安装版 pi-ai 目录 ~deepseek/deepseek-v4-flash-latest 的映射一致
  assert.deepEqual(model.reasoningEfforts, { off: 'none', low: 'low', high: 'high', max: 'max' })
  // 同族目录条目携带、而 openrouter 自动检测不覆盖的两项
  assert.deepEqual(model.compat, {
    supportsStrictMode: true,
    requiresReasoningContentOnAssistantMessages: true,
  })
})

test('patch inserts own row and never targets the llm-pi-ai row', () => {
  const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
  assert.ok(patch.includes('- id: dsh-openrouter-provider'), 'patch 应插入 dsh-openrouter-provider 自身挂载行')
  assert.ok(!/^\s*-\s+id:\s*llm-pi-ai\s*$/m.test(patch),
    'patch 不得目标 llm-pi-ai 行（整行替换会覆盖其他 bundle 的 providers）')
})

test('shouldSeed overwrites when the route is missing or does not match the seed', () => {
  // 缺失 / 其他路由 → 需要播种
  assert.equal(shouldSeed(undefined), true)
  assert.equal(shouldSeed({}), true)
  assert.equal(shouldSeed({ 'kimi-coding-plan': {} }), true)
  // 与种子深度一致（无论来自哪个层）才跳过
  assert.equal(shouldSeed({ openrouter: seedProfile() }), false)
  // 存在但不匹配：空对象 / 多余模型（目录全量）/ 用户编辑 → 覆写为种子
  assert.equal(shouldSeed({ openrouter: {} }), true)
  const extra = seedProfile()
  extra.models.push({ ...extra.models[0], id: 'deepseek/another-model' })
  assert.equal(shouldSeed({ openrouter: extra }), true)
  const edited = seedProfile()
  edited.displayName = 'My OpenRouter'
  assert.equal(shouldSeed({ openrouter: edited }), true)
})

test('seed overwrites a mismatched route through the settings service', async () => {
  // apply 级守卫：生效路由与种子不一致时经 settings.update 按 provider 键
  // 覆写为种子；一致时不产生写入。
  const updates: Array<[string, unknown]> = []
  const makeSettings = (mismatch: boolean) => ({
    describe: () => [
      { ns: 'llm-pi-ai', value: { providers: { openrouter: mismatch ? {} : seedProfile() } } },
    ],
    update: async (ns: string, patch: unknown) => {
      updates.push([ns, patch])
    },
  })
  const makeCtx = (mismatch: boolean) => ({
    logger: { warn: () => {}, info: () => {} },
    loader: { await: async () => {} },
    get: (n: string) => (n === 'settings' ? makeSettings(mismatch) : undefined),
  })
  // 不一致 → 恰好写入一次，payload 为种子
  apply(makeCtx(true))
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(updates.length, 1, '不匹配时应恰好写入一次')
  const [ns, patch] = updates[0] as [string, { providers: Record<string, unknown> }]
  assert.equal(ns, 'llm-pi-ai')
  assert.deepEqual(patch.providers[ROUTE], seedProfile())
  // 一致 → 不再写入
  apply(makeCtx(false))
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(updates.length, 1, '与种子一致时不应写入')
  assert.equal(name, 'dsh-openrouter-provider')
})

test('seed skips quietly when settings or the pi-ai row is absent', async () => {
  const warnings: unknown[] = []
  const baseCtx = {
    logger: { warn: (msg: unknown) => warnings.push(msg), info: () => {} },
    loader: { await: async () => {} },
  }
  // 缺 settings 服务 → 告警跳过，不抛错
  apply({ ...baseCtx, get: () => undefined })
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(warnings.length, 1)
  // 有 settings 但组合无活跃 llm-pi-ai 条目 → 告警跳过，不写入
  const updates: unknown[] = []
  apply({
    ...baseCtx,
    get: (n: string) => n === 'settings'
      ? { describe: () => [], update: async (...args: unknown[]) => { updates.push(args) } }
      : undefined,
  })
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(warnings.length, 2)
  assert.equal(updates.length, 0)
})
