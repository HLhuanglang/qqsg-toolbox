<template>
  <Card :color="recommended ? 'app-green' : 'default'" class="cost-item">
    <div class="row1">
      <span class="label" :class="{ recommended }">{{ title }}</span>
      <span v-if="recommended" class="badge">推荐</span>
    </div>
    <div class="detail" :class="{ recommended }">{{ subtitle }}</div>
    <div class="big" :class="{ recommended }">{{ formatWan(totals.cost) }}</div>
    <div class="meta" :class="{ recommended }">
      绿灵 ×{{ totals.green20 }}
    </div>
    <div v-if="recommended" class="check">✓</div>
  </Card>
</template>

<script setup lang="ts">
import { Card } from 'animal-island-vue'
import type { Totals } from '@/logic/soul'
import { formatWan } from '@/logic/soul'

defineProps<{
  title: string
  subtitle: string
  totals: Totals
  recommended?: boolean
}>()
</script>

<style scoped>
.cost-item {
  position: relative;
}

.row1 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.label {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
}

.label.recommended {
  color: #fff;
}

.badge {
  background: rgba(255, 255, 255, 0.35);
  color: #fff;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 800;
}

.detail {
  font-size: 12px;
  color: #8a7654;
  margin-bottom: 8px;
}

.detail.recommended {
  color: rgba(255, 255, 255, 0.9);
}

.big {
  font-size: 24px;
  font-weight: 800;
  color: #5d4a32;
}

.big.recommended {
  color: #fff;
}

.meta {
  font-size: 11px;
  color: #b8a26e;
  margin-top: 4px;
}

.meta.recommended {
  color: rgba(255, 255, 255, 0.85);
}

.check {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #fff;
  color: #6ba66b;
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
}
</style>
