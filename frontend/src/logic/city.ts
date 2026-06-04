/**
 * 投城（城市投资战）记录器
 * ────────────────────────────────────────────────────────────
 *
 * 玩法规则：
 *  - 城市争夺战结束后，三国玩家所属国家会占领若干城市；
 *  - 投资时段：周六 16:10 ~ 周日 24:00；
 *  - 收益时段：投资结束后的下一周（次周一 ~ 次周六 15:00）；
 *  - 城市每日产出 = 三国币 + 五铢；
 *  - 分红比例：游戏内直接展示为百分比（手动录入）；
 *      整体投资总额 = 自家军团投资数 ÷ 分红比例（反推）；
 *  - 投资获利：
 *      · 三国币获利 = 分红比例 × 城市三国币产出
 *      · 五铢获利   = 分红比例 × 城市五铢产出
 *  - 五铢获取比例 = 五铢获利 / (投资数 − 三国币获利)
 *      把回笼的三国币从投资成本里剔除后，每 1 三国币净成本能换到的五铢数。
 *
 * 城市清单：
 *  - 蜀国自有：成都、巴郡
 *  - 魏国自有：洛阳、魏郡
 *  - 吴国自有：建业、吴郡
 *  - 可争夺：临江、江夏、江陵、襄阳
 */

import { scopedKey } from './account'

/* ────────────────────────────────────────────────────────── */
/* 类型 & 常量                                                */
/* ────────────────────────────────────────────────────────── */

export type CountryKey = 'shu' | 'wei' | 'wu'

export type CityKey =
  | 'chengdu'
  | 'bajun'
  | 'luoyang'
  | 'weijun'
  | 'jianye'
  | 'wujun'
  | 'linjiang'
  | 'jiangxia'
  | 'jiangling'
  | 'xiangyang'

export interface CountrySpec {
  key: CountryKey
  label: string
  /** 主题色 */
  color: string
  /** 自有城市 */
  cities: CityKey[]
}

export interface CitySpec {
  key: CityKey
  label: string
  /** 归属：'shu' | 'wei' | 'wu' | 'free'（可争夺） */
  owner: CountryKey | 'free'
}

export const COUNTRIES: CountrySpec[] = [
  { key: 'shu', label: '蜀国', color: '#8ac68a', cities: ['chengdu', 'bajun'] },
  { key: 'wei', label: '魏国', color: '#889df0', cities: ['luoyang', 'weijun'] },
  { key: 'wu',  label: '吴国', color: '#e59266', cities: ['jianye', 'wujun'] },
]

export const COUNTRY_BY_KEY: Record<CountryKey, CountrySpec> = COUNTRIES.reduce(
  (m, c) => ((m[c.key] = c), m),
  {} as Record<CountryKey, CountrySpec>,
)

export const CITIES: CitySpec[] = [
  { key: 'chengdu',   label: '成都',   owner: 'shu' },
  { key: 'bajun',     label: '巴郡',   owner: 'shu' },
  { key: 'luoyang',   label: '洛阳',   owner: 'wei' },
  { key: 'weijun',    label: '魏郡',   owner: 'wei' },
  { key: 'jianye',    label: '建业',   owner: 'wu' },
  { key: 'wujun',     label: '吴郡',   owner: 'wu' },
  { key: 'linjiang',  label: '临江',   owner: 'free' },
  { key: 'jiangxia',  label: '江夏',   owner: 'free' },
  { key: 'jiangling', label: '江陵',   owner: 'free' },
  { key: 'xiangyang', label: '襄阳',   owner: 'free' },
]

export const CITY_BY_KEY: Record<CityKey, CitySpec> = CITIES.reduce(
  (m, c) => ((m[c.key] = c), m),
  {} as Record<CityKey, CitySpec>,
)

/** 可争夺城市 */
export const FREE_CITIES: CityKey[] = CITIES
  .filter((c) => c.owner === 'free')
  .map((c) => c.key)

/* ────────────────────────────────────────────────────────── */
/* 数据结构                                                   */
/* ────────────────────────────────────────────────────────── */

/** 单座城市的投资输入 */
export interface CityInvest {
  city: CityKey
  /** 城市三国币产出（整周/单期） */
  outputCoin: number
  /** 城市五铢产出 */
  outputWuzhu: number
  /** 本军团投资数（三国币） */
  myInvest: number
  /** 分红占比（0..1，手动输入；游戏内直接展示） */
  ratio: number
}

/** 一条投资周记录 */
export interface CityRecord {
  id: string
  /** 投资期 起始日期 YYYY-MM-DD（周六） */
  startDate: string
  /** 投资期 结束日期 YYYY-MM-DD（周日） */
  endDate: string
  /** 收益期 起始日期 YYYY-MM-DD（次周一） */
  incomeStartDate: string
  /** 收益期 结束日期 YYYY-MM-DD（次周六，15:00 截止） */
  incomeEndDate: string
  /** 玩家所在国家 */
  country: CountryKey
  /** 备注 */
  note?: string
  /** 各城市投资明细 */
  cities: CityInvest[]
}

/** 单座城市的派生指标 */
export interface CityMetrics {
  /** 分红比例（0..1） */
  ratio: number
  /** 整体投资总额 = myInvest / ratio （反推） */
  totalInvest: number
  /** 三国币获利 = 分红比例 × outputCoin */
  coinReturn: number
  /** 五铢获利 = 分红比例 × outputWuzhu */
  wuzhuReturn: number
  /** 净三国币成本 = myInvest − coinReturn */
  netCost: number
  /** 五铢获取比例 = 五铢获利 / 净三国币成本 */
  wuzhuRatio: number
}

/* ────────────────────────────────────────────────────────── */
/* 计算                                                       */
/* ────────────────────────────────────────────────────────── */

export function emptyCityInvest(city: CityKey): CityInvest {
  return {
    city,
    outputCoin: 0,
    outputWuzhu: 0,
    myInvest: 0,
    ratio: 0,
  }
}

export function cityMetrics(c: CityInvest): CityMetrics {
  const ratio = Math.max(0, Math.min(1, Number(c.ratio) || 0))
  const totalInvest = ratio > 0 ? c.myInvest / ratio : 0
  const coinReturn = ratio * c.outputCoin
  const wuzhuReturn = ratio * c.outputWuzhu
  const netCost = c.myInvest - coinReturn
  const wuzhuRatio = netCost > 0 ? wuzhuReturn / netCost : 0
  return { ratio, totalInvest, coinReturn, wuzhuReturn, netCost, wuzhuRatio }
}

export interface RecordTotals {
  /** 总投资数 */
  invest: number
  /** 总三国币获利 */
  coinReturn: number
  /** 总五铢获利 */
  wuzhuReturn: number
  /** 净三国币成本 */
  netCost: number
  /** 加权五铢获取比例 */
  wuzhuRatio: number
}

export function recordTotals(r: CityRecord): RecordTotals {
  let invest = 0
  let coinReturn = 0
  let wuzhuReturn = 0
  for (const c of r.cities) {
    const m = cityMetrics(c)
    invest += c.myInvest
    coinReturn += m.coinReturn
    wuzhuReturn += m.wuzhuReturn
  }
  const netCost = invest - coinReturn
  const wuzhuRatio = netCost > 0 ? wuzhuReturn / netCost : 0
  return { invest, coinReturn, wuzhuReturn, netCost, wuzhuRatio }
}

/* ────────────────────────────────────────────────────────── */
/* 持久化（按账户分桶）                                       */
/* ────────────────────────────────────────────────────────── */

const STORE_KEY_BASE = 'qqsg.record.city.v1'

interface Store {
  records: CityRecord[]
  /** 上次选择的国家（添加新记录时预填） */
  lastCountry?: CountryKey
}

function keyFor(accountId?: string): string {
  return scopedKey(STORE_KEY_BASE, accountId)
}

/** 修补/规范化单条记录（兼容旧数据） */
function normalizeRecord(r: any): CityRecord {
  const startDate = typeof r?.startDate === 'string' ? r.startDate : todayStr()
  const endDate = typeof r?.endDate === 'string' ? r.endDate : todayStr()
  // 收益期默认 = 投资结束次日（周一） ~ 投资结束 + 6 天（次周六）
  const incomeStartDate =
    typeof r?.incomeStartDate === 'string' ? r.incomeStartDate : addDays(endDate, 1)
  const incomeEndDate =
    typeof r?.incomeEndDate === 'string' ? r.incomeEndDate : addDays(endDate, 6)

  const rec: CityRecord = {
    id: typeof r?.id === 'string' ? r.id : genId(),
    startDate,
    endDate,
    incomeStartDate,
    incomeEndDate,
    country: ['shu', 'wei', 'wu'].includes(r?.country) ? r.country : 'shu',
    note: typeof r?.note === 'string' ? r.note : '',
    cities: Array.isArray(r?.cities)
      ? r.cities
          .filter((x: any) => x && CITY_BY_KEY[x.city as CityKey])
          .map((x: any) => {
            const myInvest = Number(x.myInvest) || 0
            // 兼容旧数据：若已存在 ratio 优先使用；否则用旧的 totalInvest 反推
            let ratio = Number(x.ratio)
            if (!isFinite(ratio) || ratio <= 0) {
              const totalInvest = Number(x.totalInvest) || 0
              ratio = totalInvest > 0 ? myInvest / totalInvest : 0
            }
            ratio = Math.max(0, Math.min(1, ratio || 0))
            return {
              city: x.city,
              outputCoin: Number(x.outputCoin) || 0,
              outputWuzhu: Number(x.outputWuzhu) || 0,
              myInvest,
              ratio,
            }
          })
      : [],
  }
  return rec
}

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(keyFor())
    if (!raw) return { records: [] }
    const obj = JSON.parse(raw) as Store
    const records = Array.isArray(obj.records) ? obj.records.map(normalizeRecord) : []
    return {
      records,
      lastCountry: obj.lastCountry,
    }
  } catch {
    return { records: [] }
  }
}

export function saveStore(s: Store): void {
  try {
    localStorage.setItem(keyFor(), JSON.stringify(s))
  } catch (e) {
    console.error('[city] save failed', e)
  }
}

/** 删除某账户的投城数据（账户被删除时调用） */
export function clearAccountData(accountId: string): void {
  try {
    localStorage.removeItem(keyFor(accountId))
  } catch (e) {
    console.warn('[city] clearAccountData failed', e)
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

/**
 * 给定任意日期，返回当周（周六 ~ 周日）的投资期，以及次周一 ~ 次周六的收益期。
 *  - 投资 起：本周（含）最近的周六
 *  - 投资 止：起 + 1 天（周日）
 *  - 收益 起：投资止 + 1 天（次周一）
 *  - 收益 止：投资止 + 6 天（次周六，15:00 截止）
 */
export function defaultPeriod(): {
  start: string
  end: string
  incomeStart: string
  incomeEnd: string
} {
  const d = new Date()
  const dow = d.getDay() // 0=Sun..6=Sat
  // 距离本周六的偏移（向前找）
  const offsetToSat = dow === 6 ? 0 : (dow + 1) % 7 // Sun→1, Mon→2, ..., Fri→6, Sat→0
  const sat = new Date(d)
  sat.setDate(d.getDate() - offsetToSat)
  const sun = new Date(sat)
  sun.setDate(sat.getDate() + 1)
  const incomeStart = new Date(sun)
  incomeStart.setDate(sun.getDate() + 1) // 次周一
  const incomeEnd = new Date(sun)
  incomeEnd.setDate(sun.getDate() + 6) // 次周六
  return {
    start: fmtDate(sat),
    end: fmtDate(sun),
    incomeStart: fmtDate(incomeStart),
    incomeEnd: fmtDate(incomeEnd),
  }
}

/** 在 YYYY-MM-DD 上加 n 天，返回新的 YYYY-MM-DD */
export function addDays(dateStr: string, n: number): string {
  const [y, m, d] = (dateStr || '').split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  return fmtDate(dt)
}

function fmtDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

/** 千分位整数显示 */
export function fmtInt(n: number): string {
  return Math.round(n || 0).toLocaleString('zh-CN')
}

/** 保留 N 位小数显示（去尾随 0），用于五铢获利等浮点值 */
export function fmtDec(n: number, digits = 3): string {
  if (!isFinite(n)) return '—'
  const s = (n || 0).toFixed(digits)
  return s.replace(/\.?0+$/, '')
}

/** 百分比 */
export function fmtPct(ratio: number, digits = 2): string {
  if (!isFinite(ratio)) return '—'
  return (ratio * 100).toFixed(digits) + '%'
}

/** 大数缩写：万 / 亿（用于卡片头部展示） */
export function fmtBig(n: number): string {
  const v = n || 0
  const a = Math.abs(v)
  if (a >= 1e8) return (v / 1e8).toFixed(2).replace(/\.?0+$/, '') + '亿'
  if (a >= 1e4) return (v / 1e4).toFixed(2).replace(/\.?0+$/, '') + '万'
  return fmtInt(v)
}
