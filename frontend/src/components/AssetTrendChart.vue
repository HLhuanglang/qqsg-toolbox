<template>
  <div class="chart-wrap">
    <div v-if="!hasData" class="empty">
      <div class="empty-emoji">📈</div>
      <div class="empty-text">为装备添加价格记录后，将显示资产走势曲线</div>
    </div>

    <template v-else>
      <div class="chart-box">
        <svg
          class="chart"
          :viewBox="`0 0 ${W} ${H}`"
          preserveAspectRatio="none"
          @mouseleave="hover = -1"
        >
          <!-- 背景网格 -->
          <g class="grid">
            <line
              v-for="(_, i) in 5"
              :key="'h' + i"
              :x1="PAD_L"
              :x2="W - PAD_R"
              :y1="PAD_T + ((H - PAD_T - PAD_B) / 4) * i"
              :y2="PAD_T + ((H - PAD_T - PAD_B) / 4) * i"
            />
          </g>

          <!-- Y 轴刻度 -->
          <g class="y-axis">
            <text
              v-for="(v, i) in yTicks"
              :key="'yt' + i"
              :x="PAD_L - 8"
              :y="PAD_T + ((H - PAD_T - PAD_B) / 4) * (4 - i) + 4"
              text-anchor="end"
            >
              {{ fmtTick(v) }}
            </text>
          </g>

          <!-- 悬浮竖向参考线 -->
          <line
            v-if="hover >= 0"
            :x1="colX(hover)"
            :x2="colX(hover)"
            :y1="PAD_T"
            :y2="H - PAD_B"
            class="hover-line"
          />

          <!-- 各系列折线 -->
          <g v-for="s in plotted" :key="s.id">
            <path
              v-for="(seg, si) in s.segments"
              :key="s.id + '_' + si"
              :d="seg"
              class="line"
              :class="{ total: s.isTotal }"
              :style="{ stroke: s.color }"
            />
          </g>

          <!-- 悬浮数据点 -->
          <g v-if="hover >= 0">
            <template v-for="s in plotted" :key="'dot_' + s.id">
              <circle
                v-if="s.points[hover] != null"
                :cx="colX(hover)"
                :cy="s.points[hover]!.y"
                :r="s.isTotal ? 5 : 3.5"
                class="dot"
                :class="{ total: s.isTotal }"
                :style="{ stroke: s.color }"
              />
            </template>
          </g>

          <!-- X 轴日期标签 -->
          <g class="x-axis">
            <text
              v-for="(d, i) in dates"
              :key="'xl' + i"
              :x="colX(i)"
              :y="H - PAD_B + 15"
              class="x-label"
              text-anchor="middle"
            >
              {{ shortDate(d) }}
            </text>
          </g>

          <!-- 列命中区（透明，用于触发悬浮） -->
          <g class="hit">
            <rect
              v-for="(_, i) in dates"
              :key="'hit' + i"
              :x="colX(i) - colHalf"
              :y="PAD_T"
              :width="colHalf * 2"
              :height="H - PAD_T - PAD_B"
              fill="transparent"
              @mouseenter="hover = i"
            />
          </g>
        </svg>

        <!-- 悬浮 tooltip（HTML 覆盖层，按列 x 百分比定位） -->
        <div
          v-if="hover >= 0 && tooltipRows.length"
          class="tooltip"
          :style="tooltipStyle"
        >
          <div class="tt-date">{{ dates[hover] }}</div>
          <div
            v-for="row in tooltipRows"
            :key="row.id"
            class="tt-row"
            :class="{ total: row.isTotal }"
          >
            <span class="tt-dot" :style="{ background: row.color }" />
            <span class="tt-name">{{ row.name }}</span>
            <span class="tt-val">{{ fmtByUnit(row.value, unit) }}</span>
          </div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="legend">
        <button
          v-for="s in series"
          :key="s.id"
          class="legend-item"
          :class="{ total: s.isTotal, off: hidden.has(s.id) }"
          @click="toggle(s.id)"
        >
          <span class="legend-dot" :style="{ background: colorOf(s.id, s.isTotal) }" />
          <span class="legend-name">{{ s.name }}</span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  buildTrendSeries,
  fmtByUnit,
  fmtCoin,
  type AssetRecord,
  type Unit,
} from '@/logic/asset'

const props = defineProps<{
  records: AssetRecord[]
  unit: Unit
}>()

const W = 720
const H = 260
const PAD_L = 52
const PAD_R = 16
const PAD_T = 18
const PAD_B = 30

const hover = ref(-1)
/** 被隐藏的系列 id */
const hidden = ref<Set<string>>(new Set())

/** 装备曲线配色 */
const PALETTE = [
  '#889df0', '#8ac68a', '#f7cd67', '#b77dee', '#fc736d',
  '#82d5bb', '#d1da49', '#e18c6f', '#e59266', '#9a835a',
]
const TOTAL_COLOR = '#b56e3f'

const trend = computed(() => buildTrendSeries(props.records, props.unit))
const dates = computed(() => trend.value.dates)
const series = computed(() => trend.value.series)
const hasData = computed(() => dates.value.length > 0 && series.value.length > 0)

/** 列命中区半宽 */
const colHalf = computed(() => {
  const n = dates.value.length
  const innerW = W - PAD_L - PAD_R
  if (n <= 1) return innerW / 2
  return innerW / (n - 1) / 2
})

function colorOf(id: string, isTotal: boolean): string {
  if (isTotal) return TOTAL_COLOR
  const idx = series.value.filter((s) => !s.isTotal).findIndex((s) => s.id === id)
  return PALETTE[idx % PALETTE.length]
}

function toggle(id: string) {
  const s = new Set(hidden.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  hidden.value = s
}

/** 可见系列的最大值（用于 Y 轴缩放） */
const maxVal = computed(() => {
  let m = 0
  for (const s of series.value) {
    if (hidden.value.has(s.id)) continue
    for (const v of s.points) {
      if (v != null && v > m) m = v
    }
  }
  if (m <= 0) return 1
  const step = niceStep(m / 4)
  return step * 4
})

const yTicks = computed(() => {
  const max = maxVal.value
  return [0, max / 4, max / 2, (max * 3) / 4, max]
})

function colX(i: number): number {
  const n = dates.value.length
  const innerW = W - PAD_L - PAD_R
  if (n <= 1) return PAD_L + innerW / 2
  return PAD_L + (innerW * i) / (n - 1)
}

function yOf(v: number): number {
  const innerH = H - PAD_T - PAD_B
  return PAD_T + innerH - (v / maxVal.value) * innerH
}

interface PlotPoint {
  x: number
  y: number
  value: number
}

interface PlotSeries {
  id: string
  name: string
  isTotal: boolean
  color: string
  points: (PlotPoint | null)[]
  segments: string[]
}

/** 可见系列的绘制数据 */
const plotted = computed<PlotSeries[]>(() => {
  return series.value
    .filter((s) => !hidden.value.has(s.id))
    .map((s) => {
      const points: (PlotPoint | null)[] = s.points.map((v, i) => {
        if (v == null) return null
        return { x: colX(i), y: yOf(v), value: v }
      })
      // 断点分段：连续非空点组成一条 path
      const segments: string[] = []
      let cur: string[] = []
      for (const p of points) {
        if (p == null) {
          if (cur.length) {
            segments.push(cur.join(' '))
            cur = []
          }
          continue
        }
        cur.push(`${cur.length ? 'L' : 'M'}${p.x},${p.y}`)
      }
      if (cur.length) segments.push(cur.join(' '))
      return {
        id: s.id,
        name: s.name,
        isTotal: s.isTotal,
        color: colorOf(s.id, s.isTotal),
        points,
        segments,
      }
    })
})

/** tooltip 数据行（装备在前，总体在后） */
const tooltipRows = computed(() => {
  if (hover.value < 0) return []
  const rows: { id: string; name: string; value: number; color: string; isTotal: boolean }[] = []
  for (const s of plotted.value) {
    const p = s.points[hover.value]
    if (p == null) continue
    rows.push({ id: s.id, name: s.name, value: p.value, color: s.color, isTotal: s.isTotal })
  }
  return rows
})

const tooltipStyle = computed(() => {
  if (hover.value < 0) return {}
  const leftPct = (colX(hover.value) / W) * 100
  const alignRight = leftPct > 60
  return {
    left: leftPct + '%',
    transform: alignRight ? 'translateX(-100%)' : 'translateX(0)',
    marginLeft: alignRight ? '-10px' : '10px',
  }
})

function niceStep(raw: number): number {
  if (raw <= 0) return 1
  const exp = Math.floor(Math.log10(raw))
  const base = Math.pow(10, exp)
  const f = raw / base
  let nf = 1
  if (f > 5) nf = 10
  else if (f > 2) nf = 5
  else if (f > 1) nf = 2
  return nf * base
}

function fmtTick(v: number): string {
  if (v === 0) return '0'
  if (props.unit === 'coin') return fmtCoin(v)
  // rmb 紧凑显示
  if (v >= 1e8) return '¥' + (v / 1e8).toFixed(1).replace(/\.0$/, '') + '亿'
  if (v >= 1e4) return '¥' + (v / 1e4).toFixed(1).replace(/\.0$/, '') + '万'
  if (v >= 1000) return '¥' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
  return '¥' + Math.round(v)
}

function shortDate(d: string): string {
  // YYYY-MM-DD → MM-DD
  const parts = d.split('-')
  return parts.length === 3 ? `${parts[1]}-${parts[2]}` : d
}
</script>

<style scoped>
.chart-wrap {
  width: 100%;
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px;
  box-sizing: border-box;
}

.chart-box {
  position: relative;
  width: 100%;
}

.chart {
  width: 100%;
  height: 260px;
  display: block;
  font-family: inherit;
}

.hit rect {
  cursor: pointer;
}

.empty {
  text-align: center;
  padding: 40px 0;
  color: #a89572;
}
.empty-emoji {
  font-size: 36px;
  margin-bottom: 6px;
}
.empty-text {
  font-size: 13px;
  font-weight: 700;
}

.grid line {
  stroke: #e7dcb1;
  stroke-width: 1;
  stroke-dasharray: 3 3;
}

.y-axis text {
  font-size: 11px;
  fill: #9a835a;
  font-weight: 700;
}

.x-label {
  font-size: 10.5px;
  fill: #9a835a;
  font-weight: 700;
}

.line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.85;
}
.line.total {
  stroke-width: 3.5;
  opacity: 1;
}

.dot {
  fill: #fff;
  stroke-width: 2;
}
.dot.total {
  fill: #b56e3f;
}

.hover-line {
  stroke: #b56e3f;
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.55;
}

/* HTML tooltip */
.tooltip {
  position: absolute;
  top: 10px;
  min-width: 130px;
  max-width: 220px;
  background: #5d4a32;
  color: #fff;
  border-radius: 10px;
  padding: 8px 10px;
  font-size: 11.5px;
  font-weight: 700;
  pointer-events: none;
  z-index: 5;
  box-shadow: 0 4px 14px rgba(61, 52, 40, 0.25);
}
.tt-date {
  color: #f7cd67;
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 6px;
  letter-spacing: 0.3px;
}
.tt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  font-variant-numeric: tabular-nums;
}
.tt-row.total {
  margin-top: 4px;
  padding-top: 5px;
  border-top: 1px dashed rgba(255, 255, 255, 0.25);
}
.tt-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.tt-name {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tt-val {
  color: #f7cd67;
  font-weight: 800;
}
.tt-row.total .tt-name,
.tt-row.total .tt-val {
  color: #ffd98a;
}

/* 图例 */
.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px dashed #e7dcb1;
}
.legend-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  background: #fff;
  border: 1.5px solid #e7dcb1;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 700;
  color: #6e5a3f;
  transition: all 0.15s;
}
.legend-item:hover {
  border-color: #f7cd67;
  background: #fff8de;
}
.legend-item.total {
  border-color: #f7b48a;
  color: #b56e3f;
  font-weight: 800;
}
.legend-item.off {
  opacity: 0.45;
  text-decoration: line-through;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
