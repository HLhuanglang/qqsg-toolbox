<template>
  <div class="soul-tree">
    <div class="tree-bar">
      <div class="bar-left">
        <button class="bar-btn" @click="expandAll">▼ 全部展开</button>
        <button class="bar-btn" @click="collapseAll">▲ 全部收起</button>
      </div>
      <div class="bar-right">
        <button class="bar-btn icon" title="缩小" @click="zoomOut">－</button>
        <span class="zoom-label">{{ Math.round(scale * 100) }}%</span>
        <button class="bar-btn icon" title="放大" @click="zoomIn">＋</button>
        <button class="bar-btn" title="适应窗口" @click="fitToView">⛶ 适应</button>
        <button class="bar-btn" title="原始大小" @click="resetView">1:1</button>
      </div>
    </div>

    <div
      ref="viewportRef"
      class="tree-viewport"
      :class="{ grabbing: isPanning }"
      @mousedown="onMouseDown"
      @wheel.prevent="onWheel"
    >
      <div
        class="tree-stage"
        :style="{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        }"
      >
        <div ref="contentRef" class="tree-content">
          <SoulTreeNode
            :node="root"
            :collapse="collapse === true"
            :force-open="signal"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import type { SoulNode } from '@/logic/soul'
import SoulTreeNode from './SoulTreeNode.vue'

const props = defineProps<{
  root: SoulNode
  collapse?: boolean
}>()

/** > 0 = 全部展开；< 0 = 全部收起；0 = 不变（用计数器避免重复值不触发 watch） */
const signal = ref(0)
let _seq = 0

function expandAll() {
  _seq++
  signal.value = _seq
  // 等子节点全部渲染后再适配
  nextTick(() => setTimeout(fitToView, 30))
}

function collapseAll() {
  _seq++
  signal.value = -_seq
  nextTick(() => setTimeout(fitToView, 30))
}

// ---------- 缩放/平移 ----------
const viewportRef = ref<HTMLDivElement>()
const contentRef = ref<HTMLDivElement>()

const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

const MIN = 0.25
const MAX = 2
const STEP = 0.1

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

function zoomAt(nextScale: number, cx?: number, cy?: number) {
  const vp = viewportRef.value
  if (!vp) {
    scale.value = clamp(nextScale, MIN, MAX)
    return
  }
  const rect = vp.getBoundingClientRect()
  // 默认锚点：viewport 中心
  const ax = cx ?? rect.width / 2
  const ay = cy ?? rect.height / 2
  const old = scale.value
  const next = clamp(nextScale, MIN, MAX)
  if (next === old) return
  // 让 (ax, ay) 这个屏幕点在缩放前后对应同一个 stage 点
  const k = next / old
  tx.value = ax - k * (ax - tx.value)
  ty.value = ay - k * (ay - ty.value)
  scale.value = next
}

function zoomIn() {
  zoomAt(scale.value + STEP)
}
function zoomOut() {
  zoomAt(scale.value - STEP)
}
function resetView() {
  scale.value = 1
  centerStage()
}

/** 计算适应窗口的缩放并居中 */
function fitToView() {
  const vp = viewportRef.value
  const ct = contentRef.value
  if (!vp || !ct) return
  const vr = vp.getBoundingClientRect()
  // 用未缩放的实际尺寸
  const cw = ct.offsetWidth
  const ch = ct.offsetHeight
  if (!cw || !ch) return
  const padding = 24
  const sx = (vr.width - padding * 2) / cw
  const sy = (vr.height - padding * 2) / ch
  const s = clamp(Math.min(sx, sy, 1), MIN, MAX) // 内容小于视口时不放大
  scale.value = s
  // 居中
  tx.value = (vr.width - cw * s) / 2
  ty.value = (vr.height - ch * s) / 2
}

function centerStage() {
  const vp = viewportRef.value
  const ct = contentRef.value
  if (!vp || !ct) return
  const vr = vp.getBoundingClientRect()
  const cw = ct.offsetWidth
  const ch = ct.offsetHeight
  tx.value = (vr.width - cw * scale.value) / 2
  ty.value = Math.max(16, (vr.height - ch * scale.value) / 2)
}

// 滚轮缩放（无需 Ctrl）
function onWheel(e: WheelEvent) {
  const vp = viewportRef.value
  if (!vp) return
  const rect = vp.getBoundingClientRect()
  const cx = e.clientX - rect.left
  const cy = e.clientY - rect.top
  const delta = -e.deltaY
  const factor = delta > 0 ? 1 + STEP : 1 / (1 + STEP)
  zoomAt(scale.value * factor, cx, cy)
}

// 鼠标拖拽平移
const isPanning = ref(false)
let panStartX = 0
let panStartY = 0
let panOriginX = 0
let panOriginY = 0

function onMouseDown(e: MouseEvent) {
  // 只在空白处开始拖拽，按下卡片时让其处理点击
  const target = e.target as HTMLElement
  if (target.closest('.stn-card') || target.closest('.bar-btn')) return
  isPanning.value = true
  panStartX = e.clientX
  panStartY = e.clientY
  panOriginX = tx.value
  panOriginY = ty.value
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}
function onMouseMove(e: MouseEvent) {
  if (!isPanning.value) return
  tx.value = panOriginX + (e.clientX - panStartX)
  ty.value = panOriginY + (e.clientY - panStartY)
}
function onMouseUp() {
  isPanning.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
}

// 内容尺寸变化（节点展开/收起）→ 自动重新适应
let ro: ResizeObserver | null = null
onMounted(() => {
  nextTick(() => fitToView())
  if (typeof ResizeObserver !== 'undefined' && contentRef.value) {
    ro = new ResizeObserver(() => {
      // 延迟一点确保过渡完成
      // 仅当未手动缩放（接近 fit）时自动重新适应
      // 这里简单策略：内容变大超出视口时自动 fit
      const vp = viewportRef.value
      const ct = contentRef.value
      if (!vp || !ct) return
      const vr = vp.getBoundingClientRect()
      const overflowX = ct.offsetWidth * scale.value > vr.width
      const overflowY = ct.offsetHeight * scale.value > vr.height
      if (overflowX || overflowY) fitToView()
    })
    ro.observe(contentRef.value)
  }
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', onMouseUp)
})

// 切换 root 时复位
watch(
  () => props.root,
  () => {
    nextTick(() => fitToView())
  },
)
</script>

<style scoped>
.soul-tree {
  width: 100%;
  background: #fffdf3;
  border-radius: 12px;
  border: 1.5px solid #e7dcb1;
  padding: 12px;
}

.tree-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.bar-left,
.bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.bar-btn {
  font-size: 11px;
  font-weight: 700;
  color: #8a7654;
  background: #fff7d8;
  border: 1px solid #e7dcb1;
  border-radius: 8px;
  padding: 4px 10px;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.1s;
}
.bar-btn.icon {
  width: 26px;
  padding: 4px 0;
  text-align: center;
  font-size: 13px;
}
.bar-btn:hover {
  background: #ffeaa0;
}
.bar-btn:active {
  transform: scale(0.97);
}

.zoom-label {
  font-size: 11px;
  color: #8a7654;
  min-width: 36px;
  text-align: center;
  user-select: none;
}

/* 画布视口：固定高度 + 隐藏溢出 */
.tree-viewport {
  position: relative;
  width: 100%;
  height: 520px;
  overflow: hidden;
  background:
    radial-gradient(circle at 1px 1px, #e7dcb1 1px, transparent 0) 0 0 / 18px
      18px,
    #fffaea;
  border-radius: 8px;
  border: 1px solid #ece2b8;
  cursor: grab;
  user-select: none;
}
.tree-viewport.grabbing {
  cursor: grabbing;
}

/* 缩放/平移舞台 */
.tree-stage {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: 0 0;
  will-change: transform;
}

/* 实际内容尺寸由子节点决定 */
.tree-content {
  display: inline-block;
  padding: 12px;
}
</style>
