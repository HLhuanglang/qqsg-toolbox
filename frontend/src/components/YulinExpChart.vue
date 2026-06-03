<template>
  <div class="chart-wrap">
    <div v-if="!records.length" class="empty">
      <div class="empty-emoji">📊</div>
      <div class="empty-text">添加第一条记录后将显示经验曲线</div>
    </div>

    <svg
      v-else
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

      <!-- 填充区域 -->
      <path :d="areaPath" class="area" />

      <!-- 折线 -->
      <polyline :points="linePoints" class="line" />

      <!-- 数据点 + 标签 -->
      <g v-for="(p, i) in points" :key="i" class="point-grp">
        <line
          v-if="hover === i"
          :x1="p.x"
          :x2="p.x"
          :y1="PAD_T"
          :y2="H - PAD_B"
          class="hover-line"
        />
        <circle
          :cx="p.x"
          :cy="p.y"
          :r="hover === i ? 5.5 : 3.5"
          class="dot"
          :class="{ active: hover === i }"
          @mouseenter="hover = i"
        />
        <text
          v-if="hover !== i && (showAllLabels || i === records.length - 1 || i % labelStep === 0)"
          :x="p.x"
          :y="p.y - 8"
          class="point-label"
          text-anchor="middle"
        >
          {{ fmtNum(p.exp) }}
        </text>
        <!-- X 轴: 周次 -->
        <text
          :x="p.x"
          :y="H - PAD_B + 14"
          class="x-label"
          text-anchor="middle"
        >
          {{ i + 1 }}
        </text>
      </g>

      <!-- 悬浮 tooltip -->
      <g v-if="hover >= 0" class="tooltip">
        <rect
          :x="tooltipX"
          :y="tooltipY"
          width="130"
          height="52"
          rx="8"
        />
        <text :x="tooltipX + 10" :y="tooltipY + 18" class="tt-line1">
          {{ records[hover].note || ('第' + (hover + 1) + '周') }}
        </text>
        <text :x="tooltipX + 10" :y="tooltipY + 34" class="tt-line2">
          {{ records[hover].date }}
        </text>
        <text :x="tooltipX + 10" :y="tooltipY + 48" class="tt-line3">
          经验 +{{ fmtNum(points[hover].exp) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WeekRecord } from '@/logic/yulin'
import { weeklyExp, fmtNum } from '@/logic/yulin'

const props = defineProps<{ records: WeekRecord[] }>()

const W = 720
const H = 240
const PAD_L = 50
const PAD_R = 16
const PAD_T = 18
const PAD_B = 28

const hover = ref(-1)

interface Pt { x: number; y: number; exp: number }

const data = computed(() => props.records.map((r) => weeklyExp(r.counts)))

const maxExp = computed(() => {
  const m = Math.max(0, ...data.value)
  if (m === 0) return 1000
  // 取一个友好的整数刻度
  const step = niceStep(m / 4)
  return step * 4
})

const yTicks = computed(() => {
  const max = maxExp.value
  return [0, max / 4, max / 2, (max * 3) / 4, max]
})

const points = computed<Pt[]>(() => {
  const n = data.value.length
  if (!n) return []
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  return data.value.map((exp, i) => {
    const x = n === 1 ? PAD_L + innerW / 2 : PAD_L + (innerW * i) / (n - 1)
    const y = PAD_T + innerH - (exp / maxExp.value) * innerH
    return { x, y, exp }
  })
})

const linePoints = computed(() =>
  points.value.map((p) => `${p.x},${p.y}`).join(' '),
)

const areaPath = computed(() => {
  if (!points.value.length) return ''
  const baseY = H - PAD_B
  const segs = points.value.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`)
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `M${first.x},${baseY} ${segs.join(' ').replace(/^M/, 'L')} L${last.x},${baseY} Z`
})

const labelStep = computed(() => {
  const n = data.value.length
  if (n <= 8) return 1
  if (n <= 16) return 2
  if (n <= 32) return 4
  return Math.ceil(n / 8)
})

const showAllLabels = computed(() => data.value.length <= 8)

const tooltipX = computed(() => {
  const p = points.value[hover.value]
  if (!p) return 0
  let x = p.x + 10
  if (x + 130 > W - PAD_R) x = p.x - 140
  return x
})
const tooltipY = computed(() => {
  const p = points.value[hover.value]
  if (!p) return 0
  let y = p.y - 60
  if (y < PAD_T) y = p.y + 12
  return y
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
  if (v >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + 'w'
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k'
  return String(Math.round(v))
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

.chart {
  width: 100%;
  height: 240px;
  display: block;
  font-family: inherit;
}

.empty {
  text-align: center;
  padding: 36px 0;
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

.area {
  fill: rgba(247, 205, 103, 0.25);
}

.line {
  fill: none;
  stroke: #e59266;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.dot {
  fill: #fff;
  stroke: #e59266;
  stroke-width: 2;
  cursor: pointer;
  transition: r 0.15s;
}
.dot.active {
  fill: #e59266;
}

.point-label {
  font-size: 10.5px;
  fill: #6e5a3f;
  font-weight: 700;
  pointer-events: none;
}

.x-label {
  font-size: 11px;
  fill: #9a835a;
  font-weight: 700;
}

.hover-line {
  stroke: #e59266;
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.6;
}

.tooltip rect {
  fill: #5d4a32;
  opacity: 0.92;
}
.tooltip text {
  fill: #fff;
  font-size: 11px;
  font-weight: 700;
}
.tt-line1 { font-size: 12px; }
.tt-line2 { fill: #f7cd67 !important; }
.tt-line3 { fill: #f7cd67 !important; font-size: 12px; }
</style>
