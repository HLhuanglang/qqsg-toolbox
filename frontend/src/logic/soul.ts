/**
 * 灵魄路线计算（主灵魄 + 副灵魄模型）
 *
 * 路线 = 紫灵路线 / 蓝灵路线（不再涉及绿→蓝→紫的进化路径，
 * 主灵魄从 1 级 1 阶 直接成长，副灵魄按需新购 1 级 seed 培养）
 *
 * 各路线的目标阶段：
 *   紫: 1阶20 → 2阶20 → 2阶30 → 3阶30 → 3阶40 → 3阶40·开灵
 *   蓝: 1阶20 → 2阶20 → 2阶30 → 2阶30·开灵
 *
 * 关键规则：
 *   tier-up: 当前阶 + 1 副(同阶同等级) → 下一阶(等级保持)
 *   level-up: 同阶 lv → lv'，消耗 ΔGreen 个 1级绿灵 + ΔGreen × 9 万游戏币
 *   awaken: 当前态 + 1 副(同态) → 开灵态（合成本身不消耗其它材料）
 *     注：高级聚灵石 / 灵心 是开灵后「重置属性」时使用，不计入合成成本
 *
 * 副灵魄成本（fresh subsoul）= 1级seed×1 + (raise to 20)绿灵 + 嵌套 tier-up/level-up/awaken
 *
 * 数据：data/soul/soul_levels.json（由调用方通过 setSoulLevels 注入）
 */

// ─── 基础类型 ──────────────────────────────────────────────────────────────

export type Quality = 'G' | 'B' | 'P'
export const QUALITY_LABEL: Record<Quality, string> = { G: '绿', B: '蓝', P: '紫' }

export type Tier = 1 | 2 | 3
export type Path = 'P' | 'B'

/** 灵魄 SKU（决定一个状态点） */
export interface SKU {
  quality: Quality
  tier: Tier
  level: number
  awakened?: boolean
}

export function skuId(s: SKU): string {
  return `${s.quality}${s.tier}-${s.level}${s.awakened ? '-K' : ''}`
}

export function skuLabel(s: SKU): string {
  const base = `${s.tier}阶${s.level}级${QUALITY_LABEL[s.quality]}灵`
  return s.awakened ? `${base}·开灵` : base
}

// ─── 路线阶段定义 ──────────────────────────────────────────────────────────

/** 各路线按顺序的阶段列表（从初始 1阶20 → 终态） */
export const STAGES_BY_PATH: Record<Path, SKU[]> = {
  P: [
    { quality: 'P', tier: 1, level: 20 },
    { quality: 'P', tier: 2, level: 20 },
    { quality: 'P', tier: 2, level: 30 },
    { quality: 'P', tier: 3, level: 30 },
    { quality: 'P', tier: 3, level: 40 },
    { quality: 'P', tier: 3, level: 40, awakened: true },
  ],
  B: [
    { quality: 'B', tier: 1, level: 20 },
    { quality: 'B', tier: 2, level: 20 },
    { quality: 'B', tier: 2, level: 30 },
    { quality: 'B', tier: 2, level: 30, awakened: true },
  ],
}

/** 阶段的简短按钮标签（如「20级未进阶」） */
export function stageLabel(s: SKU): string {
  if (s.awakened) return '开灵'
  if (s.tier === 1 && s.level === 20) return '20级未进阶'
  if (s.tier === 2 && s.level === 20) return '20级已进阶'
  if (s.tier === 2 && s.level === 30) {
    return s.quality === 'B' ? '30级未开灵' : '30级未进阶'
  }
  if (s.tier === 3 && s.level === 30) return '30级已进阶'
  if (s.tier === 3 && s.level === 40) return '40级未开灵'
  return skuLabel(s)
}

/** 顶部右侧角标用：完整名称 */
export function stageFullLabel(s: SKU): string {
  const q = QUALITY_LABEL[s.quality]
  if (s.awakened) return `${s.tier}阶${s.level}级开灵${q}灵`
  return `${s.level}级${stageLabel(s).includes('已进阶') ? '已进阶' : stageLabel(s).includes('未进阶') ? '未进阶' : stageLabel(s).includes('未开灵') ? '未开灵' : ''}${q}灵`
}

/** 起始状态描述 */
export function startStateLabel(
  quality: Quality,
  level: number,
  tier: number = 1,
): string {
  return `${tier}阶${level}级未进阶${QUALITY_LABEL[quality]}灵`
}

/**
 * 给定路线和等级，返回该等级在该路线下可能的所有阶（用于起始状态选择）。
 *   紫: tier1 (L 1-20), tier2 (L 20-30), tier3 (L 30-40)
 *   蓝: tier1 (L 1-20), tier2 (L 20-30)
 */
export function tierCandidates(quality: Quality, level: number): number[] {
  const tiers: number[] = []
  if (level >= 1 && level <= 20) tiers.push(1)
  if (level >= 20 && level <= 30) tiers.push(2)
  if (quality === 'P' && level >= 30 && level <= 40) tiers.push(3)
  return tiers.length ? tiers : [1]
}

/** 该路线下未开灵主灵魄的最大等级 */
export function maxStartLevel(quality: Quality): number {
  return quality === 'P' ? 40 : 30
}

// ─── 价格 / 资源 ───────────────────────────────────────────────────────────

export interface Prices {
  /** 1级绿灵 单价（万） */
  green1: number
  /** 20级绿灵 单价（万）— 仅作市场参考，实际计算用 green1 + 游戏币 */
  green20: number
  /** 1级紫灵/蓝灵（副灵魄 seed）单价（万） */
  mainSoulSeed: number
  /** 高级聚灵石 单价（万） */
  highStone: number
  /** 灵心 单价（万） */
  soulHeart: number
}

export interface Totals {
  /** 总绿灵当量（折算到 20级单位的份数，仅展示用） */
  green20: number
  /** 1级绿灵 总数（去掉主灵魄已支付部分） */
  green1Count: number
  /** 游戏币消耗（万）= green1Count × 9 */
  coin: number
  /** 副灵魄 seed 数（去掉主灵魄自身的 seed） */
  seedCount: number
  /** 高级聚灵石 数 */
  highStone: number
  /** 灵心 数 */
  soulHeart: number
  /** 主灵魄一次性买入成本（万），直接计入 cost */
  mainSoul: number
  /** 综合成本（万） */
  cost: number
}

// ─── 等级数据 ──────────────────────────────────────────────────────────────

export interface LevelRow {
  level: number
  exp: number
  green: number
}

let _levels: LevelRow[] = []

export function setSoulLevels(rows: LevelRow[]): void {
  _levels = Array.isArray(rows) ? rows : []
}

export function greenAt(level: number): number {
  return _levels.find((r) => r.level === level)?.green ?? 0
}

export function expAt(level: number): number {
  return _levels.find((r) => r.level === level)?.exp ?? 0
}

/** 同阶段内 fromLevel → toLevel 所需的 1级绿灵 数 */
export function levelUpGreenCost(fromLevel: number, toLevel: number): number {
  return Math.max(0, greenAt(toLevel) - greenAt(fromLevel))
}

/** 当前等级内距离下一级所需经验（用于「本级上限」提示） */
export function expCapInLevel(level: number): number {
  return Math.max(0, expAt(level + 1) - expAt(level))
}

// ─── 合成树 ────────────────────────────────────────────────────────────────

export type OpKind =
  | 'leaf' // 叶子：1阶20 fresh = 1级seed + 升至20
  | 'level-up' // 同阶段 lv→lv'
  | 'tier-up' // 进阶（同 quality，tier+1）
  | 'awaken' // 开灵
  | 'evolve-fixed' // 兼容字段：未使用
  | 'evolve-random' // 兼容字段：未使用

export interface SoulNode {
  id: string
  sku: SKU
  op: OpKind
  children: SoulNode[]
  note?: string
}

let _idSeq = 0
function nid() {
  return `n${++_idSeq}`
}

/** 构建以 target 为根的「全新 fresh」合成树（包括副灵魄递归展开） */
export function buildTree(target: SKU): SoulNode {
  _idSeq = 0
  return makeNode(target)
}

function makeNode(s: SKU): SoulNode {
  // 叶子：1阶20（任意 quality 但实际仅 P/B）
  if (s.tier === 1 && s.level === 20 && !s.awakened) {
    return {
      id: nid(),
      sku: s,
      op: 'leaf',
      children: [],
      note: `1级 seed + 绿灵×${greenAt(20)}`,
    }
  }
  // 开灵
  if (s.awakened) {
    const base: SKU = { ...s, awakened: false }
    return {
      id: nid(),
      sku: s,
      op: 'awaken',
      // 注：开灵本身不消耗高级聚灵石/灵心，那些是开灵后「重置属性」时才需要的
      children: [makeNode(base), makeNode(base)],
    }
  }
  // 2阶20: 1阶20 + 1阶20（进阶，等级保持）
  if (s.tier === 2 && s.level === 20) {
    const base: SKU = { ...s, tier: 1 }
    return {
      id: nid(),
      sku: s,
      op: 'tier-up',
      children: [makeNode(base), makeNode(base)],
    }
  }
  // 2阶30: 2阶20 + 升级 20→30
  if (s.tier === 2 && s.level === 30) {
    const base: SKU = { ...s, level: 20 }
    const g = levelUpGreenCost(20, 30)
    return {
      id: nid(),
      sku: s,
      op: 'level-up',
      note: `升级 20→30 绿灵×${g}`,
      children: [makeNode(base)],
    }
  }
  // 3阶30: 2阶30 + 2阶30（进阶，等级保持）
  if (s.tier === 3 && s.level === 30) {
    const base: SKU = { ...s, tier: 2, level: 30 }
    return {
      id: nid(),
      sku: s,
      op: 'tier-up',
      children: [makeNode(base), makeNode(base)],
    }
  }
  // 3阶40: 3阶30 + 升级 30→40
  if (s.tier === 3 && s.level === 40) {
    const base: SKU = { ...s, level: 30 }
    const g = levelUpGreenCost(30, 40)
    return {
      id: nid(),
      sku: s,
      op: 'level-up',
      note: `升级 30→40 绿灵×${g}`,
      children: [makeNode(base)],
    }
  }
  // 兜底
  return { id: nid(), sku: s, op: 'leaf', children: [] }
}

// ─── 资源汇总 ───────────────────────────────────────────────────────────────

export interface OpCount {
  evolveFixed: number
  evolveRandom: number
  tierUp: number
  awaken: number
  levelUp: number
}

function freshOpCount(node: SoulNode, acc?: OpCount): OpCount {
  const a = acc || {
    evolveFixed: 0,
    evolveRandom: 0,
    tierUp: 0,
    awaken: 0,
    levelUp: 0,
  }
  switch (node.op) {
    case 'tier-up':
      a.tierUp++
      break
    case 'awaken':
      a.awaken++
      break
    case 'level-up':
      a.levelUp++
      break
  }
  for (const c of node.children) freshOpCount(c, a)
  return a
}

interface FreshAggregate {
  seeds: number
  greens: number
  highStone: number
  soulHeart: number
}

/** 累计整棵树的「全新 fresh」材料消耗 */
function aggregateFresh(node: SoulNode): FreshAggregate {
  if (node.op === 'leaf') {
    return { seeds: 1, greens: greenAt(20), highStone: 0, soulHeart: 0 }
  }
  let agg: FreshAggregate = { seeds: 0, greens: 0, highStone: 0, soulHeart: 0 }
  for (const c of node.children) {
    const sub = aggregateFresh(c)
    agg.seeds += sub.seeds
    agg.greens += sub.greens
    agg.highStone += sub.highStone
    agg.soulHeart += sub.soulHeart
  }
  if (node.op === 'level-up') {
    const m = /绿灵×(\d+)/.exec(node.note || '')
    if (m) agg.greens += Number(m[1])
  }
  if (node.op === 'awaken') {
    // 开灵合成本身不消耗高级聚灵石/灵心；那些是开灵后「重置属性」时才需要的
  }
  return agg
}

export interface StartState {
  /** 主灵魄当前等级（含经验所在级） */
  level: number
  /** 当前阶（1/2/3，默认 1）；与 level 共同唯一确定起始 SKU */
  tier?: number
  /** 当前等级内已积累经验（不算本级累计） */
  expWithin: number
  /** 主灵魄购入成本（万） */
  mainSoulCost: number
}

/**
 * 模拟「主灵魄当前 SKU 已支付的资源」。
 *
 * 递归模型（quality 不影响 seed/green 数量，故只看 tier/level）：
 *   1阶 L      = 1 seed + greenAt(L)            // 直接购买并升级
 *   2阶 20     = 2 × (1阶20)                    // 进阶（1主+1副）
 *   2阶 L>20   = 2阶20 + (greenAt(L)-greenAt(20))// 再升级到 L
 *   3阶 30     = 2 × (2阶30)                    // 进阶
 *   3阶 L>30   = 3阶30 + (greenAt(L)-greenAt(30))// 再升级到 L
 *
 * 返回的 seeds 含「主灵魄自身那份 seed」，所以 adjSeeds 时要 max(0, fresh.seeds - paid.seeds)。
 */
export function simulateStartInvestment(sku: SKU): {
  seeds: number
  greens: number
} {
  const t = sku.tier
  const l = sku.level
  if (t <= 1) {
    return { seeds: 1, greens: greenAt(Math.max(1, l)) }
  }
  if (t === 2) {
    if (l <= 20) {
      const sub = simulateStartInvestment({ ...sku, tier: 1, level: 20 })
      return { seeds: sub.seeds * 2, greens: sub.greens * 2 }
    }
    const base = simulateStartInvestment({ ...sku, tier: 2, level: 20 })
    return {
      seeds: base.seeds,
      greens: base.greens + (greenAt(l) - greenAt(20)),
    }
  }
  // tier >= 3
  if (l <= 30) {
    const sub = simulateStartInvestment({ ...sku, tier: 2, level: 30 })
    return { seeds: sub.seeds * 2, greens: sub.greens * 2 }
  }
  const base = simulateStartInvestment({ ...sku, tier: 3, level: 30 })
  return {
    seeds: base.seeds,
    greens: base.greens + (greenAt(l) - greenAt(30)),
  }
}

/**
 * 给定路线、目标阶段、价格、起始状态，返回完整资源汇总。
 *
 * 成本模型：
 *   adjSeeds  = max(0, 全新树 seed − 起始 SKU 已支付 seed)
 *   adjGreens = max(0, 全新树绿灵 − 起始 SKU 已支付绿灵 − 当前经验对应绿灵)
 *   游戏币    = adjGreens × 9
 *   主灵魄    = 一次性买入成本（lump add）
 *   注：高级聚灵石 / 灵心 仅用于开灵后「重置属性」，不计入合成成本
 */
export function computeRoute(
  target: SKU,
  prices: Prices,
  start: StartState,
): { tree: SoulNode; totals: Totals; ops: OpCount } {
  const tree = buildTree(target)
  const fresh = aggregateFresh(tree)
  const ops = freshOpCount(tree)

  // 起始 SKU：与目标同 quality，未开灵；tier 默认 1
  const tierRaw = start.tier ?? 1
  const tier: Tier = (tierRaw < 1 ? 1 : tierRaw > 3 ? 3 : tierRaw) as Tier
  const startSku: SKU = {
    quality: target.quality,
    tier,
    level: Math.max(1, start.level),
    awakened: false,
  }
  const paid = simulateStartInvestment(startSku)

  // 经验 → 绿灵 换算：每 1000 exp ≈ 1 绿灵（与 SoulLevel 页一致）
  const paidByExp = Math.floor(start.expWithin / 1000)

  const adjGreens = Math.max(0, fresh.greens - paid.greens - paidByExp)
  const adjSeeds = Math.max(0, fresh.seeds - paid.seeds)
  const coin = adjGreens * 9

  const cost =
    adjGreens * prices.green1 +
    coin +
    adjSeeds * prices.mainSoulSeed +
    start.mainSoulCost

  const g20Unit = greenAt(20) || 1
  return {
    tree,
    totals: {
      green20: Math.round((adjGreens / g20Unit) * 10) / 10,
      green1Count: adjGreens,
      coin,
      seedCount: adjSeeds,
      highStone: fresh.highStone,
      soulHeart: fresh.soulHeart,
      mainSoul: start.mainSoulCost,
      cost,
    },
    ops,
  }
}

// ─── 工具 ───────────────────────────────────────────────────────────────────

export function formatWan(wan: number): string {
  if (wan >= 10000) return (wan / 10000).toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (wan >= 1000) return (wan / 1000).toFixed(2).replace(/\.?0+$/, '') + '千万'
  return Math.round(wan) + '万'
}

/** 默认价格（页面初值） */
export function defaultPrices(): Prices {
  return {
    green1: 18,
    green20: 3645, // (18 + 9) × 135
    mainSoulSeed: 4000,
    highStone: 200,
    soulHeart: 500,
  }
}
