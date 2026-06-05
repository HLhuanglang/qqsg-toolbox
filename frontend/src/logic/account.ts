/**
 * 账户管理
 * ────────────────────────────────────────────────────────────
 * - 支持多账户（主号 / 小号 / 仓库号 等）
 * - 记录器相关数据均按当前活跃账户 id 隔离存储
 * - 通过 `scopedKey(base)` 给业务模块拼接命名空间化的 localStorage key
 * - 账户列表 / 当前账户均为响应式，组件内 `import` 即可监听
 */
import { computed, ref } from 'vue'
import { storage } from './kvStore'

export interface Account {
  id: string
  nickname: string
  /** emoji 头像 */
  avatar: string
  /** 创建时间 */
  createdAt: number
}

interface AccountStoreData {
  accounts: Account[]
  activeId: string | null
}

const STORE_KEY = 'qqsg.accounts.v1'
/** 旧版未做账户隔离的 yulin 数据，迁移用 */
const LEGACY_YULIN_KEY = 'qqsg.record.yulin.v1'

export const AVATAR_PRESETS = [
  '🦊', '🐯', '🐉', '🐼', '🐰', '🐺', '🦁',
  '🐲', '🐱', '🦝', '🐸', '🦄', '🐧', '🐢',
] as const

/* ─── 内部工具 ─── */

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function loadFromStorage(): AccountStoreData {
  try {
    const raw = storage.get(STORE_KEY)
    if (!raw) return { accounts: [], activeId: null }
    const obj = JSON.parse(raw) as AccountStoreData
    if (!Array.isArray(obj.accounts)) obj.accounts = []
    if (!obj.activeId && obj.accounts.length > 0) {
      obj.activeId = obj.accounts[0].id
    }
    return obj
  } catch {
    return { accounts: [], activeId: null }
  }
}

/**
 * 注意：模块顶层不再立即调用 loadFromStorage()/bootstrap()。
 * 必须由 main.ts 在 `await initKVStore()` 完成之后调用 `initAccountStore()`，
 * 否则 storage 还没准备好，会导致读到空数据并错误地创建一个新的"默认账户"，
 * 进而把磁盘上恢复出来的真实账户记录覆盖掉。
 */
const _data = ref<AccountStoreData>({ accounts: [], activeId: null })
let _initialized = false

function persist(): void {
  // 在 init 完成前的写入会污染恢复数据，直接拒绝（理论上业务代码不会走到这里）
  if (!_initialized) return
  try {
    storage.set(STORE_KEY, JSON.stringify(_data.value))
  } catch (e) {
    console.error('[account] save failed', e)
  }
}

/**
 * 启动引导：
 *  - 若一个账户都没有 → 创建「默认账户」并把 legacy 羽灵数据迁移过去
 *  - 若 activeId 失效 → 回退到第一个账户
 */
function bootstrap(): void {
  if (_data.value.accounts.length === 0) {
    const id = genId()
    _data.value.accounts.push({
      id,
      nickname: '默认账户',
      avatar: '🦊',
      createdAt: Date.now(),
    })
    _data.value.activeId = id
    persist()

    // 把旧版未隔离的羽灵数据迁移到当前默认账户下
    try {
      const legacy = storage.get(LEGACY_YULIN_KEY)
      if (legacy) {
        storage.set(`${LEGACY_YULIN_KEY}::${id}`, legacy)
        storage.remove(LEGACY_YULIN_KEY)
      }
    } catch (e) {
      console.warn('[account] migrate legacy yulin failed', e)
    }
    return
  }

  if (
    !_data.value.activeId ||
    !_data.value.accounts.some((a) => a.id === _data.value.activeId)
  ) {
    _data.value.activeId = _data.value.accounts[0].id
    persist()
  }
}

/**
 * 必须在 `initKVStore()` 完成之后调用一次。
 * 重复调用幂等；可以在 main.ts 中放心 await。
 */
export function initAccountStore(): void {
  if (_initialized) return
  _data.value = loadFromStorage()
  _initialized = true
  bootstrap()
}

/* ─── 对外响应式状态 ─── */

export const accounts = computed<Account[]>(() => _data.value.accounts)

export const activeAccountId = computed<string | null>(() => _data.value.activeId)

export const activeAccount = computed<Account | null>(
  () => _data.value.accounts.find((a) => a.id === _data.value.activeId) ?? null,
)

/* ─── 操作 API ─── */

export function switchAccount(id: string): boolean {
  if (!_data.value.accounts.some((a) => a.id === id)) return false
  _data.value.activeId = id
  persist()
  return true
}

export function addAccount(nickname: string, avatar = '🦊'): Account {
  const acc: Account = {
    id: genId(),
    nickname: (nickname || '').trim() || '新账户',
    avatar: avatar || '🦊',
    createdAt: Date.now(),
  }
  _data.value.accounts.push(acc)
  if (!_data.value.activeId) _data.value.activeId = acc.id
  persist()
  return acc
}

export function updateAccount(
  id: string,
  patch: Partial<Pick<Account, 'nickname' | 'avatar'>>,
): void {
  const a = _data.value.accounts.find((x) => x.id === id)
  if (!a) return
  if (patch.nickname !== undefined) {
    const v = patch.nickname.trim()
    if (v) a.nickname = v
  }
  if (patch.avatar !== undefined && patch.avatar) {
    a.avatar = patch.avatar
  }
  persist()
}

/**
 * 删除账户。若同时希望清理该账户的业务数据，
 * 由调用方在 onCleanup 中处理（避免在 account 模块直接依赖业务模块）。
 */
export function removeAccount(
  id: string,
  opts?: { onCleanup?: (id: string) => void },
): void {
  const idx = _data.value.accounts.findIndex((a) => a.id === id)
  if (idx < 0) return

  _data.value.accounts.splice(idx, 1)
  opts?.onCleanup?.(id)

  if (_data.value.activeId === id) {
    _data.value.activeId = _data.value.accounts[0]?.id ?? null
  }

  // 至少保留一个账户
  if (_data.value.accounts.length === 0) {
    const fallback: Account = {
      id: genId(),
      nickname: '默认账户',
      avatar: '🦊',
      createdAt: Date.now(),
    }
    _data.value.accounts.push(fallback)
    _data.value.activeId = fallback.id
  }

  persist()
}

/**
 * 业务模块拼接命名空间 key 用：
 *   scopedKey('qqsg.record.yulin.v1') → 'qqsg.record.yulin.v1::<accountId>'
 */
export function scopedKey(base: string, accountId?: string): string {
  const id = accountId ?? _data.value.activeId
  return id ? `${base}::${id}` : base
}
