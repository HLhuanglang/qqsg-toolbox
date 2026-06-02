<template>
  <div class="stn">
    <!-- 节点卡片 -->
    <div
      class="stn-card"
      :class="[qualityCls, { clickable: hasChildren, expanded }]"
      @click="toggle"
    >
      <div class="stn-label">
        {{ label }}
        <span v-if="multiplier > 1" class="stn-mul">×{{ multiplier }}</span>
      </div>
      <div v-if="note" class="stn-note">{{ note }}</div>
      <div v-if="hasChildren" class="stn-arrow">
        <span v-if="!expanded">▼ 点击展开下层</span>
        <span v-else>▲ 收起</span>
      </div>
    </div>

    <!-- 子节点（折叠时不渲染） -->
    <div
      v-if="expanded && displayChildren.length"
      class="stn-children"
      :class="{ multi: displayChildren.length > 1 }"
    >
      <SoulTreeNode
        v-for="(c, i) in displayChildren"
        :key="`${c.node.id}-${i}`"
        :node="c.node"
        :multiplier="c.multiplier"
        :collapse="collapse"
        :force-open="forceOpen"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SoulNode } from '@/logic/soul'
import { skuLabel } from '@/logic/soul'

const props = withDefaults(
  defineProps<{
    node: SoulNode
    multiplier?: number
    collapse?: boolean
    /** 外部强制全展开/全收起信号（数值变化触发） */
    forceOpen?: number
  }>(),
  { multiplier: 1, collapse: false, forceOpen: 0 },
)

const expanded = ref(false)

watch(
  () => props.forceOpen,
  (v) => {
    if (v > 0) expanded.value = true
    else if (v < 0) expanded.value = false
  },
)

function sameKind(a: SoulNode, b: SoulNode) {
  return (
    a.op === b.op &&
    a.sku.quality === b.sku.quality &&
    a.sku.tier === b.sku.tier &&
    a.sku.level === b.sku.level &&
    !!a.sku.awakened === !!b.sku.awakened
  )
}

const displayChildren = computed(() => {
  const kids = props.node.children
  if (!props.collapse || kids.length <= 1) {
    return kids.map((k) => ({ node: k, multiplier: 1 }))
  }
  const first = kids[0]
  if (kids.every((k) => sameKind(k, first))) {
    return [{ node: first, multiplier: kids.length }]
  }
  return kids.map((k) => ({ node: k, multiplier: 1 }))
})

const hasChildren = computed(() => displayChildren.value.length > 0)

function toggle() {
  if (hasChildren.value) expanded.value = !expanded.value
}

const label = computed(() => {
  let l = skuLabel(props.node.sku)
  if (props.node.sku.awakened) l = l.replace('·开灵', ' 开灵')
  return l
})

const note = computed(() => {
  switch (props.node.op) {
    case 'leaf':
      return props.node.note || '指定合成 (1级 seed + 升至20)'
    case 'tier-up':
      return '进阶合成 (1主 + 1副)'
    case 'level-up':
      return props.node.note
    case 'awaken':
      return `开灵${props.node.note ? ' ' + props.node.note : ''}`
    default:
      return props.node.note
  }
})

const qualityCls = computed(() => {
  switch (props.node.sku.quality) {
    case 'G':
      return 'q-g'
    case 'B':
      return 'q-b'
    case 'P':
    default:
      return 'q-p'
  }
})
</script>

<style scoped>
.stn {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.stn-card {
  border: 1.5px solid;
  border-radius: 12px;
  padding: 10px 18px;
  min-width: 150px;
  text-align: center;
  background: #fff;
  user-select: none;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}

.stn-card.clickable {
  cursor: pointer;
}

.stn-card.clickable:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.1);
}

.stn-card.expanded {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
}

.stn-label {
  font-size: 13px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.5px;
}

.stn-mul {
  margin-left: 4px;
  font-size: 12px;
  color: #b77dee;
  font-weight: 800;
}

.q-b .stn-mul {
  color: #5d72e0;
}
.q-g .stn-mul {
  color: #5fa05f;
}

.stn-note {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 600;
  color: #6ba66b;
}

.stn-arrow {
  margin-top: 4px;
  font-size: 10px;
  color: #b29c6e;
  font-weight: 600;
}

/* 子节点容器 + 连接线 */
.stn-children {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  padding-top: 18px;
  gap: 14px;
}

/* 单根：父节点底部到子节点顶部的竖线 */
.stn-children::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  width: 2px;
  height: 18px;
  background: #d8c995;
  transform: translateX(-1px);
}

/* 多子节点：横向排开 */
.stn-children.multi {
  flex-direction: row;
  gap: 32px;
  align-items: flex-start;
  padding-top: 36px;
}

/* multi: 每个子节点有自己的竖线短桩（向上接到横杠） */
.stn-children.multi > .stn::before {
  content: '';
  position: absolute;
  left: 50%;
  top: -18px;
  width: 2px;
  height: 18px;
  background: #d8c995;
  transform: translateX(-1px);
}

/* multi: 每个子节点贡献一段横杠（与相邻段拼接成一根完整横杠） */
.stn-children.multi > .stn::after {
  content: '';
  position: absolute;
  top: -18px;
  left: -16px;
  right: -16px;
  height: 2px;
  background: #d8c995;
}
.stn-children.multi > .stn:first-child::after {
  left: 50%;
}
.stn-children.multi > .stn:last-child::after {
  right: 50%;
}
.stn-children.multi > .stn:first-child:last-child::after {
  display: none;
}

/* 颜色 */
.q-g {
  background: #effbef;
  border-color: #8ac68a;
}
.q-b {
  background: #eef0fe;
  border-color: #889df0;
}
.q-p {
  background: #f5edff;
  border-color: #b77dee;
}
</style>
