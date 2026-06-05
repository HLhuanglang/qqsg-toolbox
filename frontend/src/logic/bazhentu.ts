/**
 * 八阵图修炼 —— 数据规格 & 计算
 * ────────────────────────────────────────────────────────────
 *
 * 玩法规则：
 *  - 八阵图围绕 8 个核心属性进行修炼：
 *      武智 / 攻击 / 物防 / 驭兽 / 术防 / 生命 / 防御 / 攻击
 *  - 每周可执行修炼最多 30 次（普通 / 高级 修炼）；
 *  - 每次修炼随机提升 1~4 个属性；
 *  - 用 4项 / 3项 / 2项 / 1项 次数分别记录命中"4 个、3 个、2 个、1 个"属性的次数；
 *  - 评分（战阵评分）由 8 个属性按一定权重折算，本周加分 = 本周评分 − 上周评分；
 *  - 材料：常用「精要」，每次修炼消耗若干，每周记录数量 + 单价 → 材料成本。
 */

import { scopedKey } from './account'
import { storage } from './kvStore'

/* ────────────────────────────────────────────────────────── */
/* 8 属性                                                      */
/* ────────────────────────────────────────────────────────── */

export type AttrKey =
  | 'wuzhi'       // 武智
  | 'sxAttack'    // 四象攻击
  | 'wufang'      // 物防
  | 'yushou'      // 驭兽
  | 'shufang'     // 术防 / 魔防
  | 'hp'          // 生命
  | 'sxDefense'   // 四象防御
  | 'attack'      // 攻击

export interface AttrSpec {
  key: AttrKey
  /** 八卦盘上显示的主名 */
  label: string
  /** 简称（用于表格紧凑列头） */
  short: string
  /** 主题色（标签 / 数值高亮） */
  color: string
  /** 类别：进攻 / 防御 / 辅助 */
  group: 'atk' | 'def' | 'aux'
  /** 八卦盘上的位置（0..7，从顶部偏左开始顺时针） */
  pos: number
}

/**
 * 位置编号（与图 1 一致）：
 *
 *        0 ─────  1
 *      2             3
 *      4             5
 *        6 ─────  7
 *
 * 0=武智  1=攻击
 * 2=物防  3=驭兽
 * 4=术防  5=生命
 * 6=防御  7=攻击
 */
export const ATTRS: AttrSpec[] = [
  { key: 'wuzhi',     label: '武智',     short: '武智',   color: '#b77dee', group: 'aux', pos: 0 },
  { key: 'sxAttack',  label: '四象攻击', short: '四象攻', color: '#e59266', group: 'atk', pos: 1 },
  { key: 'wufang',    label: '物防',     short: '物防',   color: '#889df0', group: 'def', pos: 2 },
  { key: 'yushou',    label: '驭兽',     short: '驭兽',   color: '#8ac68a', group: 'aux', pos: 3 },
  { key: 'shufang',   label: '术防',     short: '术防',   color: '#5fbcb3', group: 'def', pos: 4 },
  { key: 'hp',        label: '生命',     short: '生命',   color: '#ee6c8a', group: 'aux', pos: 5 },
  { key: 'sxDefense', label: '四象防御', short: '四象防', color: '#7a8db5', group: 'def', pos: 6 },
  { key: 'attack',    label: '攻击',     short: '攻击',   color: '#d97706', group: 'atk', pos: 7 },
]

export const ATTR_BY_KEY: Record<AttrKey, AttrSpec> = ATTRS.reduce(
  (m, a) => ((m[a.key] = a), m),
  {} as Record<AttrKey, AttrSpec>,
)

/** 按八卦盘位置有序 */
export const ATTRS_BY_POS: AttrSpec[] = [...ATTRS].sort((a, b) => a.pos - b.pos)

/* ────────────────────────────────────────────────────────── */
/* 类型                                                       */
/* ────────────────────────────────────────────────────────── */

export type AttrValues = Record<AttrKey, number>

export interface WeeklyCounts {
  /** 一次命中 4 个属性的次数 */
  n4: number
  /** 命中 3 个属性的次数 */
  n3: number
  /** 命中 2 个属性的次数 */
  n2: number
  /** 命中 1 个属性的次数 */
  n1: number
}

/** 每周修炼次数上限（参考游戏内 30/30） */
export const WEEKLY_LIMIT = 30

/** 每天最多可培养的次数 */
export const DAILY_RUN_LIMIT = 99

/** 一条周记录 */
export interface WeekRecord {
  id: string
  /** 记录日期 YYYY-MM-DD（一般为周末） */
  date: string
  /** 备注 / 进度（如 "第 N 周"、"无出战"） */
  note: string
  /** 周末 8 项属性快照 */
  attrs: AttrValues
  /** 战阵评分（手动录入） */
  score: number
  /** 当周修炼次数 */
  counts: WeeklyCounts
  /** 材料名（如 "精要"） */
  material: string
  /** 当周消耗的材料数量 */
  materialQty: number
  /** 当周材料单价（万 / 个） */
  materialPrice: number
}

/* ────────────────────────────────────────────────────────── */
/* 工厂 & 计算                                                 */
/* ────────────────────────────────────────────────────────── */

export function emptyAttrs(): AttrValues {
  return {
    wuzhi: 0, sxAttack: 0, wufang: 0, yushou: 0,
    shufang: 0, hp: 0, sxDefense: 0, attack: 0,
  }
}

export function emptyCounts(): WeeklyCounts {
  return { n4: 0, n3: 0, n2: 0, n1: 0 }
}

/** 总次数 = 4 项 + 3 项 + 2 项 + 1 项 */
export function totalCounts(c: WeeklyCounts): number {
  return (c.n1 || 0) + (c.n2 || 0) + (c.n3 || 0) + (c.n4 || 0)
}

/** 命中属性总人次 = 4×n4 + 3×n3 + 2×n2 + 1×n1（用于平均"每次修炼提升属性数"） */
export function totalHits(c: WeeklyCounts): number {
  return 4 * (c.n4 || 0) + 3 * (c.n3 || 0) + 2 * (c.n2 || 0) + (c.n1 || 0)
}

/** 当周材料成本（万） */
export function weeklyCost(r: Pick<WeekRecord, 'materialQty' | 'materialPrice'>): number {
  return (Number(r.materialQty) || 0) * (Number(r.materialPrice) || 0)
}

/** 与上一条记录的评分差（加分） */
export function scoreDelta(curr: WeekRecord, prev?: WeekRecord): number {
  if (!prev) return 0
  return (curr.score || 0) - (prev.score || 0)
}

/** 平均每次修炼命中的属性数 */
export function avgHitsPerRun(c: WeeklyCounts): number {
  const n = totalCounts(c)
  return n > 0 ? totalHits(c) / n : 0
}

/* ────────────────────────────────────────────────────────── */
/* 境界                                                       */
/* ────────────────────────────────────────────────────────── */

export type RealmName = '入门' | '小成' | '中成' | '大成' | '完美' | '神境'

export interface RealmSpec {
  name: RealmName
  /** 阶层 1..6 */
  tier: number
  /** 主题色 */
  color: string
  /** 该境界已解锁的全部属性（按累计） */
  unlocks: AttrKey[]
  /** 描述：该境界新解锁的属性（用于表格展示） */
  unlockText: string
  /** 该境界的"基础属性"（达成此境界即附带的固定数值，未列出的属性默认为 0） */
  base: Partial<AttrValues>
  /**
   * 由上一境界升入本境界的消耗
   * - runs：累计需要进行的修炼次数
   * - sundays：每次修炼消耗的日月数
   * - gold：每次修炼消耗的三国币（万）
   * - 入门 = 全 0
   */
  upgrade: { runs: number; sundays: number; gold: number }
}

export const REALMS: RealmSpec[] = [
  {
    name: '入门', tier: 1, color: '#8a7a55',
    unlocks: ['sxAttack', 'sxDefense', 'yushou'],
    unlockText: '四象攻/防、驭兽',
    base: { sxAttack: 5, sxDefense: 5, yushou: 75 },
    upgrade: { runs: 0, sundays: 0, gold: 0 },
  },
  {
    name: '小成', tier: 2, color: '#3f7a3f',
    unlocks: ['sxAttack', 'sxDefense', 'yushou', 'attack'],
    unlockText: '+ 攻击',
    base: { sxAttack: 10, sxDefense: 10, yushou: 150, attack: 36 },
    upgrade: { runs: 200, sundays: 1, gold: 10 },
  },
  {
    name: '中成', tier: 3, color: '#4a90c8',
    unlocks: ['sxAttack', 'sxDefense', 'yushou', 'attack', 'shufang'],
    unlockText: '+ 术防',
    base: { sxAttack: 15, sxDefense: 15, yushou: 225, attack: 54, shufang: 126 },
    upgrade: { runs: 350, sundays: 2, gold: 20 },
  },
  {
    name: '大成', tier: 4, color: '#b56e3f',
    unlocks: ['sxAttack', 'sxDefense', 'yushou', 'attack', 'shufang', 'wufang'],
    unlockText: '+ 物防',
    base: { sxAttack: 20, sxDefense: 20, yushou: 300, attack: 72, shufang: 168, wufang: 144 },
    upgrade: { runs: 500, sundays: 3, gold: 30 },
  },
  {
    name: '完美', tier: 5, color: '#d97706',
    unlocks: ['sxAttack', 'sxDefense', 'yushou', 'attack', 'shufang', 'wufang', 'hp'],
    unlockText: '+ 生命',
    base: { sxAttack: 25, sxDefense: 25, yushou: 375, attack: 90, shufang: 216, wufang: 180, hp: 15000 },
    upgrade: { runs: 625, sundays: 4, gold: 40 },
  },
  {
    name: '神境', tier: 6, color: '#a13c8c',
    unlocks: ['sxAttack', 'sxDefense', 'yushou', 'attack', 'shufang', 'wufang', 'hp', 'wuzhi'],
    unlockText: '+ 武智',
    base: { sxAttack: 30, sxDefense: 30, yushou: 450, attack: 108, shufang: 264, wufang: 216, hp: 18000, wuzhi: 24 },
    upgrade: { runs: 800, sundays: 5, gold: 50 },
  },
]

export const REALM_BY_NAME: Record<RealmName, RealmSpec> = REALMS.reduce(
  (m, r) => ((m[r.name] = r), m),
  {} as Record<RealmName, RealmSpec>,
)

export const DEFAULT_REALM: RealmName = '神境'

/** 单段升级消耗（每次 × 总次数） */
export function realmStepCost(name: RealmName): { runs: number; sundays: number; gold: number } {
  const r = REALM_BY_NAME[name]
  if (!r) return { runs: 0, sundays: 0, gold: 0 }
  return {
    runs: r.upgrade.runs,
    sundays: r.upgrade.runs * r.upgrade.sundays,
    gold: r.upgrade.runs * r.upgrade.gold,
  }
}

/** 累计：从入门升至指定境界的总消耗 */
export function realmCumCost(name: RealmName): { runs: number; sundays: number; gold: number } {
  let runs = 0, sundays = 0, gold = 0
  for (const r of REALMS) {
    runs += r.upgrade.runs
    sundays += r.upgrade.runs * r.upgrade.sundays
    gold += r.upgrade.runs * r.upgrade.gold
    if (r.name === name) break
  }
  return { runs, sundays, gold }
}

/** 估算从入门修炼到指定境界所需天数（按每天 99 次） */
export function realmDays(name: RealmName): number {
  const { runs } = realmCumCost(name)
  return Math.ceil(runs / DAILY_RUN_LIMIT)
}

/**
 * 从 `from` 境界升到 `to` 境界的累计消耗（不含 from 本身的进入消耗）。
 * 若 to.tier <= from.tier，返回全 0。
 */
export function realmRangeCost(
  from: RealmName,
  to: RealmName,
): { runs: number; sundays: number; gold: number } {
  const fromTier = REALM_BY_NAME[from]?.tier ?? 1
  const toTier = REALM_BY_NAME[to]?.tier ?? 1
  if (toTier <= fromTier) return { runs: 0, sundays: 0, gold: 0 }
  let runs = 0, sundays = 0, gold = 0
  for (const r of REALMS) {
    if (r.tier > fromTier && r.tier <= toTier) {
      runs += r.upgrade.runs
      sundays += r.upgrade.runs * r.upgrade.sundays
      gold += r.upgrade.runs * r.upgrade.gold
    }
  }
  return { runs, sundays, gold }
}

/** 估算 from→to 所需天数（按每天 99 次） */
export function realmRangeDays(from: RealmName, to: RealmName): number {
  const { runs } = realmRangeCost(from, to)
  return Math.ceil(runs / DAILY_RUN_LIMIT)
}

/** 返回某境界的基础属性（未列出的属性 = 0） */
export function realmBaseAttrs(name: RealmName): AttrValues {
  const out = emptyAttrs()
  const spec = REALM_BY_NAME[name]
  if (!spec) return out
  for (const k of Object.keys(spec.base) as AttrKey[]) {
    out[k] = spec.base[k] || 0
  }
  return out
}

/** 是否合法的境界名 */
export function isRealmName(v: unknown): v is RealmName {
  return typeof v === 'string' && (v in REALM_BY_NAME)
}

/* ────────────────────────────────────────────────────────── */
/* 持久化（按账户分桶）                                        */
/* ────────────────────────────────────────────────────────── */

/**
 * v2 起，WeekRecord.attrs 表示「本周培养带来的增量」，score 表示「本周加分」。
 * 之前的 v1 存的是周末绝对快照值，语义不同，故升级 key 让旧数据不再被读取。
 */
const STORE_KEY_BASE = 'qqsg.record.bazhentu.v2'

interface Store {
  records: WeekRecord[]
  /** 上次使用过的材料 / 价格（添加新记录时预填） */
  lastMaterial?: string
  lastMaterialPrice?: number
  /** 起点境界（开始记录前所处的境界） */
  initialRealm?: RealmName
  /** 目标境界（要修炼到的最高境界，默认 = initialRealm） */
  targetRealm?: RealmName
  /** 日月单价（万 / 个），可选；用于把日月折算成成本 */
  sundayPrice?: number
  /** 起点属性快照（开始记录时各项属性的初始值） */
  startAttrs?: AttrValues
  /** 起点战阵评分 */
  startScore?: number
  /** 起点日期 */
  startDate?: string
}

function keyFor(accountId?: string): string {
  return scopedKey(STORE_KEY_BASE, accountId)
}

function normalizeAttrs(raw: any): AttrValues {
  const out = emptyAttrs()
  if (raw && typeof raw === 'object') {
    for (const a of ATTRS) {
      const v = Number(raw[a.key])
      out[a.key] = isFinite(v) ? v : 0
    }
  }
  return out
}

function normalizeRecord(r: any): WeekRecord {
  const attrs = normalizeAttrs(r?.attrs)
  const counts: WeeklyCounts = {
    n4: Number(r?.counts?.n4) || 0,
    n3: Number(r?.counts?.n3) || 0,
    n2: Number(r?.counts?.n2) || 0,
    n1: Number(r?.counts?.n1) || 0,
  }
  return {
    id: typeof r?.id === 'string' ? r.id : genId(),
    date: typeof r?.date === 'string' ? r.date : todayStr(),
    note: typeof r?.note === 'string' ? r.note : '',
    attrs,
    score: Number(r?.score) || 0,
    counts,
    material: typeof r?.material === 'string' ? r.material : '',
    materialQty: Number(r?.materialQty) || 0,
    materialPrice: Number(r?.materialPrice) || 0,
  }
}

export function loadStore(): Store {
  try {
    const raw = storage.get(keyFor())
    if (!raw) return { records: [] }
    const obj = JSON.parse(raw) as Store
    const records = Array.isArray(obj.records) ? obj.records.map(normalizeRecord) : []
    return {
      records,
      lastMaterial: typeof obj.lastMaterial === 'string' ? obj.lastMaterial : undefined,
      lastMaterialPrice:
        typeof obj.lastMaterialPrice === 'number' ? obj.lastMaterialPrice : undefined,
      initialRealm: isRealmName(obj.initialRealm) ? obj.initialRealm : undefined,
      targetRealm: isRealmName(obj.targetRealm) ? obj.targetRealm : undefined,
      sundayPrice: typeof obj.sundayPrice === 'number' ? obj.sundayPrice : undefined,
      startAttrs: obj.startAttrs ? normalizeAttrs(obj.startAttrs) : undefined,
      startScore: typeof obj.startScore === 'number' ? obj.startScore : undefined,
      startDate: typeof obj.startDate === 'string' ? obj.startDate : undefined,
    }
  } catch {
    return { records: [] }
  }
}

export function saveStore(s: Store): void {
  try {
    storage.set(keyFor(), JSON.stringify(s))
  } catch (e) {
    console.error('[bazhentu] save failed', e)
  }
}

/** 删除某账户的八阵图数据（账户被删除时调用） */
export function clearAccountData(accountId: string): void {
  try {
    storage.remove(keyFor(accountId))
  } catch (e) {
    console.warn('[bazhentu] clearAccountData failed', e)
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

/** 成本（万 → 万 / 亿） */
export function fmtCost(n: number): string {
  if (!n) return '0'
  const v = Number(n)
  if (Math.abs(v) >= 10000) return (v / 10000).toFixed(2).replace(/\.?0+$/, '') + '亿'
  return v.toFixed(2).replace(/\.?0+$/, '') + '万'
}
