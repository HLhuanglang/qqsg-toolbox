/**
 * 统一持久化层
 * ────────────────────────────────────────────────────────────
 * 设计目标：
 *   1. 解决 wails dev / wails build 后 localStorage 互不可见的问题。
 *   2. 业务模块仍然用 同步 的 get / set / remove API（与原先的 localStorage 相同心智模型）。
 *   3. 启动时一次性把后端 KV 文件加载进内存缓存；任何写入「先改内存 → 异步落盘」。
 *   4. 在 Wails 桌面环境中持久化到磁盘文件（%APPDATA%\qqsg-toolbox\store.json 等）。
 *      在浏览器 / bindings 未就绪的极端情况下，自动 fallback 到 localStorage。
 *   5. 第一次启动若检测到旧版 localStorage 中有 `qqsg.*` 数据，自动迁移到后端文件。
 *
 * 仅托管 key 前缀为 `qqsg.` 的业务数据；其它 UI 偏好仍可直接用 localStorage。
 */

import { KVClear, KVGetAll, KVSet, KVDelete } from '../../wailsjs/go/backend/App'

const APP_PREFIX = 'qqsg.'
const MIGRATED_FLAG = 'qqsg.kv.migrated.v1'

let memCache: Map<string, string> = new Map()
let initialized = false
let initPromise: Promise<void> | null = null

/** 是否处于 Wails 运行时（有 bindings 可用） */
function isWailsAvailable(): boolean {
  // wails 注入 window.go 与 window.runtime；bindings 函数本身存在亦可
  return typeof window !== 'undefined' &&
    !!(window as any).go &&
    typeof KVGetAll === 'function'
}

/**
 * 初始化：必须在使用任何 storage.* 之前调用，且建议 await。
 *  - 将后端 KV 一次性灌入内存
 *  - 若后端为空且本地有遗留的 `qqsg.*` localStorage 项，则自动迁移
 *  - 即便后端不可用也不抛错（fallback 到 localStorage）
 */
export async function initKVStore(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    if (isWailsAvailable()) {
      try {
        const all = await KVGetAll()
        memCache = new Map(Object.entries(all || {}))

        // 一次性迁移：后端为空且 localStorage 里存在历史数据
        const alreadyMigrated = readLocalStorage(MIGRATED_FLAG) === '1'
        if (memCache.size === 0 && !alreadyMigrated) {
          await migrateFromLocalStorage()
        }
        if (!alreadyMigrated) {
          writeLocalStorage(MIGRATED_FLAG, '1')
        }
      } catch (e) {
        console.warn('[kvStore] 加载后端失败，降级到 localStorage：', e)
        loadFromLocalStorage()
      }
    } else {
      // 浏览器 / Vite 预览：完全使用 localStorage
      loadFromLocalStorage()
    }
    initialized = true
  })()

  return initPromise
}

/** 将 localStorage 中所有 qqsg.* 项灌入内存（fallback 模式） */
function loadFromLocalStorage(): void {
  memCache = new Map()
  if (typeof localStorage === 'undefined') return
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(APP_PREFIX)) continue
    if (k === MIGRATED_FLAG) continue
    const v = localStorage.getItem(k)
    if (v != null) memCache.set(k, v)
  }
}

/** 把 localStorage 中所有 qqsg.* 项写入后端，作为一次性迁移 */
async function migrateFromLocalStorage(): Promise<void> {
  if (typeof localStorage === 'undefined') return
  const entries: [string, string][] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k || !k.startsWith(APP_PREFIX)) continue
    if (k === MIGRATED_FLAG) continue
    const v = localStorage.getItem(k)
    if (v != null) entries.push([k, v])
  }
  if (entries.length === 0) return
  console.info(`[kvStore] 检测到 ${entries.length} 条 localStorage 历史数据，迁移中…`)
  for (const [k, v] of entries) {
    memCache.set(k, v)
    try {
      await KVSet(k, v)
    } catch (e) {
      console.error('[kvStore] 迁移失败:', k, e)
    }
  }
  console.info('[kvStore] 迁移完成')
}

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore quota / private mode errors */
  }
}

function removeLocalStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * 异步落盘：内存先改，磁盘失败仅打日志。
 * 同时同步写一份到 localStorage 作为兜底，保证 wails 极端崩溃也不丢。
 */
function persistAsync(key: string, value: string): void {
  writeLocalStorage(key, value)
  if (!isWailsAvailable()) return
  KVSet(key, value).catch((e) => {
    console.error('[kvStore] 写后端失败:', key, e)
  })
}

function deleteAsync(key: string): void {
  removeLocalStorage(key)
  if (!isWailsAvailable()) return
  KVDelete(key).catch((e) => {
    console.error('[kvStore] 删后端失败:', key, e)
  })
}

/* ─── 对外的同步 API（行为对齐 localStorage） ─── */

export const storage = {
  /** 读取；未初始化也安全（只是没数据） */
  get(key: string): string | null {
    return memCache.has(key) ? memCache.get(key)! : null
  },
  set(key: string, value: string): void {
    memCache.set(key, value)
    persistAsync(key, value)
  },
  remove(key: string): void {
    memCache.delete(key)
    deleteAsync(key)
  },
  /** 列出所有以 prefix 开头的 key（不含 prefix 自身的前缀过滤后的全 key） */
  keys(prefix = ''): string[] {
    const out: string[] = []
    memCache.forEach((_, k) => {
      if (!prefix || k.startsWith(prefix)) out.push(k)
    })
    return out
  },
  /** 清空所有由本模块管理的数据（仅 qqsg.* 前缀） */
  async clearAll(): Promise<void> {
    memCache.clear()
    if (typeof localStorage !== 'undefined') {
      const toDel: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(APP_PREFIX)) toDel.push(k)
      }
      for (const k of toDel) removeLocalStorage(k)
    }
    if (isWailsAvailable()) {
      try {
        await KVClear()
      } catch (e) {
        console.error('[kvStore] 清空后端失败:', e)
      }
    }
  },
  /** 初始化是否已完成 */
  isReady(): boolean {
    return initialized
  },
}

/** 暴露 init，便于 main.ts 在 mount 之前 await */
export { initialized as kvInitialized }
