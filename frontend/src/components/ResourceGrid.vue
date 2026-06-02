<template>
  <div class="resources">
    <div v-if="totals.mainSoul > 0" class="res">
      <div class="res-label">👑 主灵魄</div>
      <div class="res-val">1 个</div>
      <div class="res-sub">{{ formatWan(totals.mainSoul) }}</div>
    </div>
    <div v-if="totals.seedCount > 0" class="res">
      <div class="res-label">🪄 副灵魄 seed</div>
      <div class="res-val">{{ totals.seedCount }} 个</div>
      <div class="res-sub">
        {{ formatWan(totals.seedCount * prices.mainSoulSeed) }}
      </div>
    </div>
    <div class="res">
      <div class="res-label">🌱 1级绿灵</div>
      <div class="res-val">{{ totals.green1Count }} 个</div>
      <div class="res-sub">
        {{ formatWan(totals.green1Count * prices.green1) }}
        <span class="muted-sub">≈ {{ totals.green20 }} 份 20级</span>
      </div>
    </div>
    <div class="res">
      <div class="res-label">💰 游戏币</div>
      <div class="res-val">{{ formatWan(totals.coin) }}</div>
      <div class="res-sub">绿灵 ×9 万</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Totals, Prices } from '@/logic/soul'
import { formatWan } from '@/logic/soul'

defineProps<{
  totals: Totals
  prices: Prices
}>()
</script>

<style scoped>
.resources {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 14px;
}

.res {
  min-width: 0;
}

.res {
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  padding: 12px 10px;
  text-align: center;
  box-shadow: 0 2px 0 #e0d293;
}

.res-label {
  font-size: 12px;
  color: #8a7654;
  margin-bottom: 4px;
  font-weight: 700;
}

.res-val {
  font-size: 16px;
  font-weight: 800;
  color: #5d4a32;
}

.res-sub {
  font-size: 11px;
  color: #b8a26e;
  margin-top: 2px;
}

.muted-sub {
  display: block;
  color: #c9b88f;
  font-size: 10px;
  margin-top: 1px;
}
</style>
