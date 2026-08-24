/**
 * 资产记录器（装备价格 & 走势）
 * ────────────────────────────────────────────────────────────
 *
 * 玩法/需求：
 *  - 记录购入的每件装备名称与价格；
 *  - 价格可用两种方式录入：
 *      a) 三国币数量 + 币价（币价单位：元 / 亿三国币）
 *      b) 直接输入人民币（RMB）
 *  - 为保证两种口径可互算，方式 b 录入时同样记录当时币价；
 *  - 每件装备除购入价外，可按不同日期多次追加"估值快照"，形成价格走势；
 *  - 趋势图：每件装备一条价格走势曲线 + 一条总体资产走势曲线，
 *    支持在 RMB / 三国币 两种口径间切换。
 *
 * 换算规则：
 *  - RMB       = 三国币数量 ÷ 1e8 × 币价(元/亿)
 *  - 三国币数量 = RMB ÷ 币价(元/亿) × 1e8
 */

import { scopedKey } from './account'
import { storage } from './kvStore'

/* ────────────────────────────────────────────────────────── */
/* 类型 & 常量                                                */
/* ────────────────────────────────────────────────────────── */

/** 价格录入方式：coin=三国币+币价；rmb=人民币 */
export type PriceMode = 'coin' | 'rmb'

/** 一亿 */
export const YI = 1e8

/** 一条价格记录（购入价或估值快照） */
export interface PriceEntry {
  id: string
  /** 记录日期 YYYY-MM-DD */
  date: string
  /** 录入方式 */
  mode: PriceMode
  /** 三国币数量（coin 模式录入；rmb 模式下由 rmb+coinPrice 反推） */
  coinAmount: number
  /** 币价：元 / 亿三国币（两种模式都需要，用于双口径互算） */
  coinPrice: number
  /** 人民币（rmb 模式录入；coin 模式下由 coinAmount+coinPrice 推导） */
  rmb: number
  /** 备注 */
  note?: string
}

/** 一件装备 */
export interface AssetRecord {
  id: string
  /** 装备名称 */
  name: string
  /** 备注 */
  note?: string
  /** 创建时间戳 */
  createdAt: number
  /** 价格记录，按 date 升序；[0] 为购入价 */
  entries: PriceEntry[]
}

/** 汇总口径 */
export type Unit = 'rmb' | 'coin'

/* ────────────────────────────────────────────────────────── */
/* 双口径换算                                                 */
/* ────────────────────────────────────────────────────────── */

/** 单条记录换算为人民币 */
export function entryRmb(e: PriceEntry): number {
  if (e.mode === 'rmb') return e.rmb || 0
  return ((e.coinAmount || 0) / YI) * (e.coinPrice || 0)
}

/** 单条记录换算为三国币数量 */
export function entryCoin(e: PriceEntry): number {
  if (e.mode === 'coin') return e.coinAmount || 0
  const price = e.coinPrice || 0
  return price > 0 ? ((e.rmb || 0) / price) * YI : 0
}

/** 按指定口径取单条记录的值 */
export function entryValue(e: PriceEntry, unit: Unit): number {
  return unit === 'rmb' ? entryRmb(e) : entryCoin(e)
}

/* ────────────────────────────────────────────────────────── */
/* 派生：单件装备指标                                         */
/* ────────────────────────────────────────────────────────── */

/** 装备的购入记录（首条，按日期升序后的 [0]） */
export function purchaseEntry(r: AssetRecord): PriceEntry | null {
  return r.entries.length ? r.entries[0] : null
}

/** 装备的最新估值记录（末条） */
export function latestEntry(r: AssetRecord): PriceEntry | null {
  return r.entries.length ? r.entries[r.entries.length - 1] : null
}

/** 装备在指定日期（含）之前最近一次记录 */
export function latestEntryOnOrBefore(
  r: AssetRecord,
  date: string,
): PriceEntry | null {
  let found: PriceEntry | null = null
  for (const e of r.entries) {
    if (e.date <= date) found = e
    else break
  }
  return found
}

export interface AssetMetrics {
  /** 购入价（RMB / 三国币双口径） */
  buyRmb: number
  buyCoin: number
  /** 当前估值（最新记录，RMB / 三国币双口径） */
  nowRmb: number
  nowCoin: number
  /** 涨跌额（当前 - 购入，RMB） */
  deltaRmb: number
  /** 涨跌幅（基于 RMB） */
  deltaPct: number
}

export function assetMetrics(r: AssetRecord): AssetMetrics {
  const buy = purchaseEntry(r)
  const now = latestEntry(r)
  const buyRmb = buy ? entryRmb(buy) : 0
  const buyCoin = buy ? entryCoin(buy) : 0
  const nowRmb = now ? entryRmb(now) : 0
  const nowCoin = now ? entryCoin(now) : 0
  const deltaRmb = nowRmb - buyRmb
  const deltaPct = buyRmb > 0 ? deltaRmb / buyRmb : 0
  return { buyRmb, buyCoin, nowRmb, nowCoin, deltaRmb, deltaPct }
}

/* ────────────────────────────────────────────────────────── */
/* 总览汇总                                                   */
/* ────────────────────────────────────────────────────────── */

export interface AssetTotals {
  /** 装备数量 */
  count: number
  /** 累计购入成本（RMB / 三国币） */
  costRmb: number
  costCoin: number
  /** 当前总资产（RMB / 三国币） */
  nowRmb: number
  nowCoin: number
  /** 总涨跌额（RMB） */
  deltaRmb: number
  /** 总涨跌幅（基于成本 RMB） */
  deltaPct: number
}

export function assetTotals(records: AssetRecord[]): AssetTotals {
  let costRmb = 0
  let costCoin = 0
  let nowRmb = 0
  let nowCoin = 0
  for (const r of records) {
    const m = assetMetrics(r)
    costRmb += m.buyRmb
    costCoin += m.buyCoin
    nowRmb += m.nowRmb
    nowCoin += m.nowCoin
  }
  const deltaRmb = nowRmb - costRmb
  const deltaPct = costRmb > 0 ? deltaRmb / costRmb : 0
  return {
    count: records.length,
    costRmb,
    costCoin,
    nowRmb,
    nowCoin,
    deltaRmb,
    deltaPct,
  }
}

/* ────────────────────────────────────────────────────────── */
/* 趋势聚合                                                   */
/* ────────────────────────────────────────────────────────── */

/** 单条趋势系列 */
export interface TrendSeries {
  /** 系列 id（装备 id；总体为 '__total__'） */
  id: string
  /** 系列名称 */
  name: string
  /** 是否总体资产线 */
  isTotal: boolean
  /** 与 dates 对齐的数据点；null 表示该时间点尚无有效值 */
  points: (number | null)[]
}

export interface TrendData {
  /** 统一 X 轴：去重并升序的所有日期 */
  dates: string[]
  /** 每件装备一条 + 总体资产一条（末位） */
  series: TrendSeries[]
}

export const TOTAL_SERIES_ID = '__total__'

/**
 * 构建趋势数据（前向填充 / 阶梯保持）。
 *  - X 轴 = 所有记录中出现过的去重日期，升序；
 *  - 每件装备：在每个日期取"该日期(含)之前最近一次记录"的值，未出现则为 null；
 *  - 总体资产：每个日期 = 各装备在该时刻最近一次估值之和（未出现的装备计 0）。
 */
export function buildTrendSeries(
  records: AssetRecord[],
  unit: Unit,
): TrendData {
  // 收集去重日期
  const dateSet = new Set<string>()
  for (const r of records) {
    for (const e of r.entries) dateSet.add(e.date)
  }
  const dates = Array.from(dateSet).sort((a, b) => a.localeCompare(b))

  const series: TrendSeries[] = []
  const totalPoints: number[] = new Array(dates.length).fill(0)
  let anyTotal = false

  for (const r of records) {
    const points: (number | null)[] = dates.map((d) => {
      const e = latestEntryOnOrBefore(r, d)
      if (!e) return null
      const v = entryValue(e, unit)
      return v
    })
    // 累加到总体（null 记 0）
    points.forEach((v, i) => {
      if (v != null) {
        totalPoints[i] += v
        anyTotal = true
      }
    })
    series.push({
      id: r.id,
      name: r.name || '未命名',
      isTotal: false,
      points,
    })
  }

  if (records.length > 0) {
    series.push({
      id: TOTAL_SERIES_ID,
      name: '总体资产',
      isTotal: true,
      points: anyTotal ? totalPoints.slice() : dates.map(() => null),
    })
  }

  return { dates, series }
}

/* ────────────────────────────────────────────────────────── */
/* 持久化（按账户分桶）                                       */
/* ────────────────────────────────────────────────────────── */

const STORE_KEY_BASE = 'qqsg.record.asset.v1'

export interface Store {
  records: AssetRecord[]
  /** 上次使用的币价（元/亿），新增记录时预填 */
  lastCoinPrice?: number
}

function keyFor(accountId?: string): string {
  return scopedKey(STORE_KEY_BASE, accountId)
}

/** 修补/规范化单条价格记录 */
function normalizeEntry(e: any): PriceEntry {
  const mode: PriceMode = e?.mode === 'rmb' ? 'rmb' : 'coin'
  return {
    id: typeof e?.id === 'string' ? e.id : genId(),
    date: typeof e?.date === 'string' ? e.date : todayStr(),
    mode,
    coinAmount: Number(e?.coinAmount) || 0,
    coinPrice: Number(e?.coinPrice) || 0,
    rmb: Number(e?.rmb) || 0,
    note: typeof e?.note === 'string' ? e.note : '',
  }
}

/** 修补/规范化单件装备（兼容旧数据） */
function normalizeRecord(r: any): AssetRecord {
  const entries: PriceEntry[] = Array.isArray(r?.entries)
    ? r.entries.map(normalizeEntry)
    : []
  entries.sort((a, b) => a.date.localeCompare(b.date))
  return {
    id: typeof r?.id === 'string' ? r.id : genId(),
    name: typeof r?.name === 'string' ? r.name : '',
    note: typeof r?.note === 'string' ? r.note : '',
    createdAt: Number(r?.createdAt) || Date.now(),
    entries,
  }
}

export function loadStore(): Store {
  try {
    const raw = storage.get(keyFor())
    if (!raw) return { records: [] }
    const obj = JSON.parse(raw) as Store
    const records = Array.isArray(obj.records)
      ? obj.records.map(normalizeRecord)
      : []
    const lastCoinPrice =
      typeof obj.lastCoinPrice === 'number' && isFinite(obj.lastCoinPrice)
        ? obj.lastCoinPrice
        : undefined
    return { records, lastCoinPrice }
  } catch {
    return { records: [] }
  }
}

export function saveStore(s: Store): void {
  try {
    storage.set(keyFor(), JSON.stringify(s))
  } catch (e) {
    console.error('[asset] save failed', e)
  }
}

/** 删除某账户的资产数据（账户被删除时调用） */
export function clearAccountData(accountId: string): void {
  try {
    storage.remove(keyFor(accountId))
  } catch (e) {
    console.warn('[asset] clearAccountData failed', e)
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

export function emptyEntry(mode: PriceMode, coinPrice = 0): PriceEntry {
  return {
    id: genId(),
    date: todayStr(),
    mode,
    coinAmount: 0,
    coinPrice,
    rmb: 0,
    note: '',
  }
}

/** 千分位整数 */
export function fmtInt(n: number): string {
  return Math.round(n || 0).toLocaleString('zh-CN')
}

/** 保留 N 位小数（去尾随 0） */
export function fmtDec(n: number, digits = 2): string {
  if (!isFinite(n)) return '—'
  const s = (n || 0).toFixed(digits)
  return s.replace(/\.?0+$/, '')
}

/** 百分比（带正负号） */
export function fmtPctSigned(ratio: number, digits = 2): string {
  if (!isFinite(ratio)) return '—'
  const v = ratio * 100
  const sign = v > 0 ? '+' : ''
  return sign + v.toFixed(digits) + '%'
}

/** 人民币金额（¥ + 2 位小数 + 千分位） */
export function fmtRmb(n: number): string {
  const v = n || 0
  return '¥' + v.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** 三国币缩写：万 / 亿 */
export function fmtCoin(n: number): string {
  const v = n || 0
  const a = Math.abs(v)
  if (a >= 1e8) return (v / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (a >= 1e4) return (v / 1e4).toFixed(2).replace(/\.?0+$/, '') + '万'
  return fmtInt(v)
}

/** 按口径格式化数值 */
export function fmtByUnit(n: number, unit: Unit): string {
  return unit === 'rmb' ? fmtRmb(n) : fmtCoin(n)
}
