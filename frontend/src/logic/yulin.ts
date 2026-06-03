/**
 * 羽灵培养 —— 数据规格 & 计算
 *
 * 每周可培养 20 次，使用 4 种羽毛之一：
 *   - 七彩鸾羽毛：1 + 紫气×3 + 25w三国币 → exp 300/600/900
 *   - 五级羽毛  ：1 + 紫气×2 + 20w三国币 → exp 210/420/630
 *   - 四级羽毛  ：1 + 紫气×2 +  8w三国币 → exp 150/300/450
 *   - 三级羽毛  ：2 + 紫气×2 +  8w三国币 → exp 100/200/300
 *
 * 三种结果（按从低到高）：成功 / 大成 / 完美
 *
 * 价格单位：羽毛 & 紫气 = 每个的"万"价（与项目其它模块一致）
 * 三国币消耗：以"万"为单位记入成本
 */

export const WEEKLY_LIMIT = 20

export type FeatherKey = 'caihong' | 'lv5' | 'lv4' | 'lv3'
export type Outcome = 'succ' | 'great' | 'perfect'

export interface FeatherSpec {
  key: FeatherKey
  label: string
  short: string
  color: string
  /** 单次消耗 */
  cost: {
    feather: number   // 羽毛个数
    ziqi: number      // 紫气个数
    coin: number      // 三国币（万）
  }
  /** 三种结果对应经验 */
  exp: Record<Outcome, number>
}

export const FEATHERS: FeatherSpec[] = [
  {
    key: 'caihong',
    label: '七彩鸾羽毛',
    short: '七彩鸾',
    color: '#e59266',
    cost: { feather: 1, ziqi: 3, coin: 25 },
    exp: { succ: 300, great: 600, perfect: 900 },
  },
  {
    key: 'lv5',
    label: '五级羽毛',
    short: '五级',
    color: '#b77dee',
    cost: { feather: 1, ziqi: 2, coin: 20 },
    exp: { succ: 210, great: 420, perfect: 630 },
  },
  {
    key: 'lv4',
    label: '四级羽毛',
    short: '四级',
    color: '#889df0',
    cost: { feather: 1, ziqi: 2, coin: 8 },
    exp: { succ: 150, great: 300, perfect: 450 },
  },
  {
    key: 'lv3',
    label: '三级羽毛',
    short: '三级',
    color: '#8ac68a',
    cost: { feather: 2, ziqi: 2, coin: 8 },
    exp: { succ: 100, great: 200, perfect: 300 },
  },
]

export const FEATHER_BY_KEY: Record<FeatherKey, FeatherSpec> = FEATHERS.reduce(
  (m, f) => ((m[f.key] = f), m),
  {} as Record<FeatherKey, FeatherSpec>,
)

export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: 'succ', label: '成功' },
  { key: 'great', label: '大成' },
  { key: 'perfect', label: '完美' },
]

/* ────────────────────────────────────────────────────────── */

export interface Counts {
  succ: number
  great: number
  perfect: number
}

/** 每个羽毛的当周次数 */
export type WeeklyCounts = Record<FeatherKey, Counts>

/** 当周输入的材料价格（每个的"万"） */
export interface WeeklyPrices {
  caihong: number   // 七彩鸾羽毛单价
  lv5: number
  lv4: number
  lv3: number
  ziqi: number      // 紫气单价
  lingzhu: number   // 灵珠原石单价（用于初始兑换成本）
}

/** 初始兑换羽灵所需材料（一次性成本） */
export const INITIAL_COST_MATERIALS = {
  caihong: 10,
  lingzhu: 100,
} as const

/** 一条周记录 */
export interface WeekRecord {
  id: string
  /** YYYY-MM-DD */
  date: string
  /** 备注（"第N周" / "初始兑换" 等） */
  note: string
  /** 周末当前等级 */
  level: number
  /** 当前等级内经验 */
  expIn: number
  /** 当周材料价格 */
  prices: WeeklyPrices
  /** 当周培养次数 */
  counts: WeeklyCounts
}

/* ────────────────────────────────────────────────────────── */

export function emptyCounts(): Counts {
  return { succ: 0, great: 0, perfect: 0 }
}

export function emptyWeeklyCounts(): WeeklyCounts {
  return {
    caihong: emptyCounts(),
    lv5: emptyCounts(),
    lv4: emptyCounts(),
    lv3: emptyCounts(),
  }
}

export function defaultPrices(): WeeklyPrices {
  return { caihong: 0, lv5: 0, lv4: 0, lv3: 0, ziqi: 0, lingzhu: 0 }
}

/** 修补旧数据缺失字段（lingzhu 是后加的） */
function normalizePrices(p: Partial<WeeklyPrices> | undefined | null): WeeklyPrices {
  return { ...defaultPrices(), ...(p ?? {}) }
}

/** 总次数 */
export function totalAttempts(c: WeeklyCounts): number {
  let n = 0
  for (const f of FEATHERS) {
    const x = c[f.key]
    n += x.succ + x.great + x.perfect
  }
  return n
}

/** 当周经验 */
export function weeklyExp(c: WeeklyCounts): number {
  let exp = 0
  for (const f of FEATHERS) {
    const x = c[f.key]
    exp += x.succ * f.exp.succ + x.great * f.exp.great + x.perfect * f.exp.perfect
  }
  return exp
}

/** 当周消耗的羽毛/紫气总数（用于成本与显示） */
export function weeklyMaterials(c: WeeklyCounts): {
  feathers: Record<FeatherKey, number>
  ziqi: number
  coin: number
} {
  const feathers: Record<FeatherKey, number> = {
    caihong: 0, lv5: 0, lv4: 0, lv3: 0,
  }
  let ziqi = 0
  let coin = 0
  for (const f of FEATHERS) {
    const x = c[f.key]
    const times = x.succ + x.great + x.perfect
    feathers[f.key] = times * f.cost.feather
    ziqi += times * f.cost.ziqi
    coin += times * f.cost.coin
  }
  return { feathers, ziqi, coin }
}

/** 当周成本（万） */
export function weeklyCost(c: WeeklyCounts, p: WeeklyPrices): number {
  const m = weeklyMaterials(c)
  return (
    m.feathers.caihong * p.caihong +
    m.feathers.lv5 * p.lv5 +
    m.feathers.lv4 * p.lv4 +
    m.feathers.lv3 * p.lv3 +
    m.ziqi * p.ziqi +
    m.coin
  )
}

/** 初始兑换羽灵的成本（万）—— 七彩鸾×10 + 灵珠原石×100，按给定价格折算 */
export function initialCost(p: WeeklyPrices): number {
  return (
    INITIAL_COST_MATERIALS.caihong * p.caihong +
    INITIAL_COST_MATERIALS.lingzhu * p.lingzhu
  )
}

/* ────────────────────────────────────────────────────────── */
/* 持久化（按当前活跃账户分桶）                                */
/* ────────────────────────────────────────────────────────── */

import { scopedKey } from './account'

const STORE_KEY_BASE = 'qqsg.record.yulin.v1'

interface Store {
  records: WeekRecord[]
  /** 上次使用过的价格（用于添加新记录时预填） */
  lastPrices?: WeeklyPrices
}

function keyFor(accountId?: string): string {
  return scopedKey(STORE_KEY_BASE, accountId)
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(keyFor())
    if (!raw) return { records: [] }
    const obj = JSON.parse(raw) as Store
    if (!obj.records) obj.records = []
    // 旧数据补齐新增字段（如 lingzhu）
    for (const r of obj.records) {
      r.prices = normalizePrices(r.prices)
    }
    if (obj.lastPrices) obj.lastPrices = normalizePrices(obj.lastPrices)
    return obj
  } catch {
    return { records: [] }
  }
}

export function saveStore(s: Store): void {
  try {
    localStorage.setItem(keyFor(), JSON.stringify(s))
  } catch (e) {
    console.error('[yulin] save failed', e)
  }
}

/** 删除某账户的羽灵记录数据（账户被删除时调用） */
export function clearAccountData(accountId: string): void {
  try {
    localStorage.removeItem(keyFor(accountId))
  } catch (e) {
    console.warn('[yulin] clearAccountData failed', e)
  }
}

/* ────────────────────────────────────────────────────────── */
/* 工具                                                       */
/* ────────────────────────────────────────────────────────── */

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export function todayStr(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function fmtNum(n: number): string {
  return (n ?? 0).toLocaleString('zh-CN')
}

export function fmtCost(n: number): string {
  if (!n) return '0'
  if (Math.abs(n) >= 10000) return (n / 10000).toFixed(2) + '亿'
  return n.toFixed(2).replace(/\.?0+$/, '') + '万'
}
