import { defineConfig } from 'tsdown'

// host 半面：TS → ESM（lib/index.js）。无运行时依赖（仅 node:util 内置），
// 无 client 半面（纯播种插件，不提供 UI）。
export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    outDir: 'lib',
    platform: 'node',
    minify: true,
    sourcemap: false,
    dts: false,
    outExtensions: () => ({ js: '.js' }),
  },
])
