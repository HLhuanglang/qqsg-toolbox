<template>
  <Modal
    :open="visible"
    title="✨ 计算结果"
    :width="760"
    :typewriter="false"
    :show-footer="false"
    @update:open="(v) => !v && $emit('close')"
    @close="$emit('close')"
  >
    <div class="body">
      <!-- 目标灵魄 -->
      <Card color="warm-peach-pink">
        <div class="target-line">
          <span class="target-tag">🎯 目标</span>
          <b>{{ targetLabel }}</b>
        </div>
      </Card>

      <!-- 成本总览 -->
      <Card>
        <div class="card-title">📊 成本总览</div>
        <div class="cost-single">
          <div class="big">{{ formatWan(single.totals.cost) }}</div>
          <div class="muted">总成本（含主灵魄）</div>
        </div>
        <ResourceGrid :totals="single.totals" :prices="prices" />
      </Card>

      <!-- 升级路线图 -->
      <Card>
        <div class="card-title">🌳 合成路线图</div>
        <div class="muted small">
          点击节点展开下一层，查看每一步所需的副灵魄
        </div>
        <SoulTree :root="single.tree" />
      </Card>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { Card, Modal } from 'animal-island-vue'
import type { Prices } from '@/logic/soul'
import { formatWan } from '@/logic/soul'
import type { ComputeOutput } from '@/logic/soulView'
import SoulTree from './SoulTree.vue'
import ResourceGrid from './ResourceGrid.vue'
import { computed } from 'vue'

const props = defineProps<{
  visible: boolean
  data: ComputeOutput
  prices: Prices
  targetLabel: string
}>()

defineEmits<{ (e: 'close'): void }>()

const single = computed(() => props.data.single)
</script>

<style scoped>
.body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.target-line {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #fff;
}

.target-tag {
  font-weight: 800;
  font-size: 13px;
  background: rgba(255, 255, 255, 0.25);
  padding: 4px 10px;
  border-radius: 999px;
}

.target-line b {
  color: #fff;
  font-size: 15px;
  font-weight: 800;
}

.card-title {
  font-size: 15px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 12px;
}

.cost-single {
  text-align: center;
  padding: 14px 0 8px;
}

.cost-single .big {
  font-size: 32px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 1px;
}

.cost-single .muted,
.muted {
  color: #8a7654;
  font-size: 13px;
}

.small {
  font-size: 12px;
  margin-bottom: 8px;
}
</style>
