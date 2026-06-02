<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="purple">升阶开灵</Card>

      <!-- 0. 规则速查（可折叠） -->
      <Card>
        <button class="rules-head" @click="rulesOpen = !rulesOpen">
          <span class="rules-title">📖 合成规则速查</span>
          <span class="rules-toggle">{{ rulesOpen ? '收起 ▲' : '展开 ▼' }}</span>
        </button>

        <div v-if="rulesOpen" class="rules-body">
          <div class="rule-group">
            <div class="rule-group-title">
              <span class="rule-badge tier">进阶</span>
              <span>灵魄进阶（1阶 → 2阶 → 3阶）</span>
            </div>
            <ul class="rule-list">
              <li>
                <code class="formula">1阶20蓝 + 1阶20蓝 ×1</code>
                <span class="arrow">→</span>
                <span class="result tier-tag">2阶20 蓝</span>
              </li>
              <li>
                <code class="formula">1阶20紫 + 1阶20紫 ×1</code>
                <span class="arrow">→</span>
                <span class="result tier-tag">2阶20 紫</span>
              </li>
              <li>
                <code class="formula">2阶30紫 + 2阶30紫 ×1</code>
                <span class="arrow">→</span>
                <span class="result tier-tag">3阶30 紫</span>
              </li>
            </ul>
          </div>

          <div class="rule-group">
            <div class="rule-group-title">
              <span class="rule-badge awake">开灵</span>
              <span>灵魄开灵</span>
            </div>
            <div class="rule-sub">灵性解封</div>
            <ul class="rule-list">
              <li>
                <code class="formula">2阶30蓝 + 2阶30蓝 ×1</code>
                <span class="arrow">→</span>
                <span class="result awake-tag">2阶30 蓝-开灵</span>
              </li>
              <li>
                <code class="formula">3阶40紫 + 3阶40紫 ×1</code>
                <span class="arrow">→</span>
                <span class="result awake-tag">3阶40 紫-开灵</span>
              </li>
            </ul>
            <div class="rule-sub">灵性重置</div>
            <ul class="rule-list">
              <li>
                <span class="result awake-tag">2阶30 蓝-开灵</span>
                <span class="arrow">=</span>
                <code class="formula">高级聚灵石 ×2 + 灵心 ×1</code>
              </li>
              <li>
                <span class="result awake-tag">3阶40 紫-开灵</span>
                <span class="arrow">=</span>
                <code class="formula">高级聚灵石 ×13 + 灵心 ×5</code>
              </li>
            </ul>
          </div>
        </div>
      </Card>

      <!-- 主面板 -->
      <Card>
        <!-- 路线 tabs -->
        <div class="path-tabs">
          <button
            class="path-tab"
            :class="{ active: path === 'P' }"
            @click="path = 'P'"
          >
            紫灵路线
          </button>
          <button
            class="path-tab"
            :class="{ active: path === 'B' }"
            @click="path = 'B'"
          >
            蓝灵路线
          </button>
        </div>

        <!-- 三联价格 -->
        <div class="price-row">
          <Field label="1级绿灵">
            <NumberInput v-model="prices.green1" suffix="万" />
          </Field>
          <Field label="20级绿灵">
            <NumberInput v-model="prices.green20" suffix="万" />
          </Field>
          <Field :label="`1级${pathLabel}灵`">
            <NumberInput v-model="prices.mainSoulSeed" suffix="万" />
          </Field>
        </div>

        <!-- 起始条件 -->
        <div class="block-head">
          <h3>起始条件</h3>
          <span class="head-hint">{{ startHint }}</span>
        </div>

        <div class="grid-2">
          <Field label="当前等级">
            <NumberInput
              v-model="startLevel"
              :min="1"
              :max="maxLevel"
            />
          </Field>
          <Field
            label="当前等级内经验"
            :extra="`(本级上限 ${expCap})`"
          >
            <NumberInput
              v-model="startExp"
              :min="0"
              :max="expCap"
            />
          </Field>
        </div>

        <Field label="主灵魄成本">
          <NumberInput v-model="mainSoulCost" suffix="万" />
        </Field>

        <Field label="当前状态">
          <div
            class="tier-pick"
            :class="{ multi: availableTiers.length > 1 }"
          >
            <button
              v-for="t in availableTiers"
              :key="t"
              type="button"
              class="state-btn current"
              :class="{
                'tier-locked': availableTiers.length === 1,
                'tier-active': startTier === t,
                'tier-idle':
                  availableTiers.length > 1 && startTier !== t,
              }"
              :disabled="availableTiers.length === 1"
              @click="startTier = t"
            >
              {{ t }}阶 {{ startLevel }}级 未进阶
            </button>
          </div>
        </Field>

        <!-- 目标状态 -->
        <div class="block-head">
          <h3>🎯 目标状态</h3>
          <span class="head-hint">{{ targetHint }}</span>
        </div>

        <div class="state-grid">
          <button
            v-for="opt in stageOptions"
            :key="opt.key"
            class="state-btn"
            :class="{ active: targetKey === opt.key }"
            @click="targetKey = opt.key"
          >
            {{ opt.label }}
          </button>
        </div>

        <Button type="primary" block size="large" @click="onCalc">
          ✨ 计算合成成本
        </Button>

        <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      </Card>
    </div>

    <SoulResultModal
      v-if="resultVisible && computedData"
      :visible="resultVisible"
      :data="computedData"
      :prices="prices"
      :target-label="targetLabel"
      @close="resultVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Button, Card } from 'animal-island-vue'
import {
  STAGES_BY_PATH,
  type Path,
  type Prices,
  type SKU,
  type LevelRow,
  defaultPrices,
  setSoulLevels,
  skuLabel,
  skuId,
  stageLabel,
  computeRoute,
  expCapInLevel,
  startStateLabel,
  tierCandidates,
  maxStartLevel,
  QUALITY_LABEL,
} from '@/logic/soul'
import type { ComputeOutput } from '@/logic/soulView'
import SoulResultModal from '@/components/SoulResultModal.vue'
import Field from '@/components/Field.vue'
import NumberInput from '@/components/NumberInput.vue'
import { GetSoulLevels } from '../../wailsjs/go/backend/App'
import { useDataReload } from '@/logic/useDataReload'

// ─── 等级数据 ─────────────────────────────────────────────
async function loadSoulLevels() {
  try {
    const data = await GetSoulLevels()
    if (data) setSoulLevels(data as LevelRow[])
  } catch (e) {
    console.error('加载灵魂等级数据失败:', e)
  }
}
useDataReload(loadSoulLevels)

// ─── 表单状态 ─────────────────────────────────────────────
const rulesOpen = ref(false)
const path = ref<Path>('P')
const prices = reactive<Prices>(defaultPrices())

const startLevel = ref(1)
const startExp = ref(0)
const startTier = ref(1)
const mainSoulCost = ref(4500)

// 路线对应的最大未开灵等级
const maxLevel = computed(() => maxStartLevel(path.value))

// 该等级在该路线下可能的阶
const availableTiers = computed(() =>
  tierCandidates(path.value, startLevel.value),
)

// 目标阶段（按 SKU 序号选择）
const stageOptions = computed(() =>
  STAGES_BY_PATH[path.value].map((s) => ({
    key: skuId(s),
    label: stageLabel(s),
    sku: s,
  })),
)

// 默认选中：紫=40级未开灵 / 蓝=30级未开灵（即 awakened 之前那一档）
function defaultTargetKey(p: Path): string {
  const list = STAGES_BY_PATH[p]
  // 倒数第二项（开灵之前的最高态）
  return skuId(list[list.length - 2])
}
const targetKey = ref(defaultTargetKey('P'))

watch(path, (p) => {
  targetKey.value = defaultTargetKey(p)
})

const targetSku = computed<SKU>(() => {
  const o = stageOptions.value.find((s) => s.key === targetKey.value)
  return o ? o.sku : STAGES_BY_PATH[path.value][0]
})

// ─── 派生展示 ─────────────────────────────────────────────
const pathLabel = computed(() => QUALITY_LABEL[path.value])
const expCap = computed(() => expCapInLevel(startLevel.value))
const startHint = computed(() =>
  startStateLabel(path.value, startLevel.value, startTier.value),
)
const targetHint = computed(() => skuLabel(targetSku.value))
const targetLabel = computed(() => skuLabel(targetSku.value))

// 当 startLevel / path 改变，把 exp 拉回合法范围；阶不在候选时回落到候选首项
watch([startLevel, path], () => {
  if (startExp.value > expCap.value) startExp.value = expCap.value
  if (startExp.value < 0) startExp.value = 0
  if (startLevel.value > maxLevel.value) startLevel.value = maxLevel.value
  if (startLevel.value < 1) startLevel.value = 1
  if (!availableTiers.value.includes(startTier.value)) {
    startTier.value = availableTiers.value[0] ?? 1
  }
})

// ─── 计算 ─────────────────────────────────────────────────
const errorMsg = ref('')
const resultVisible = ref(false)
const computedData = ref<ComputeOutput | null>(null)

function onCalc() {
  errorMsg.value = ''
  if (prices.green1 <= 0) {
    errorMsg.value = '1级绿灵价格必须为正数'
    return
  }
  if (prices.mainSoulSeed <= 0) {
    errorMsg.value = `1级${pathLabel.value}灵 价格必须为正数`
    return
  }

  const result = computeRoute(targetSku.value, prices, {
    level: startLevel.value,
    tier: startTier.value,
    expWithin: startExp.value,
    mainSoulCost: mainSoulCost.value,
  })

  computedData.value = { mode: 'single', single: result }
  resultVisible.value = true
}
</script>

<style scoped>
.page {
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
}

.container {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── 路线 tabs ── */
.path-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  background: #f5f1e2;
  border-radius: 14px;
  padding: 4px;
  margin-bottom: 14px;
}
.path-tab {
  padding: 10px 0;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
  color: #8a7654;
  cursor: pointer;
  border-radius: 10px;
  font-family: inherit;
  transition: all 0.15s;
}
.path-tab.active {
  background: #fff;
  color: #b77dee;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

/* ── 三联价格 ── */
.price-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

/* ── 区块标题 ── */
.block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin: 14px 0 10px;
  padding-left: 4px;
  border-left: 4px solid #b77dee;
}
.block-head h3 {
  margin: 0;
  font-size: 15px;
  color: #5d4a32;
  font-weight: 800;
}
.head-hint {
  font-size: 12px;
  color: #fc736d;
  font-weight: 700;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

/* ── 状态按钮 ── */
.state-btn {
  width: 100%;
  padding: 12px 8px;
  border-radius: 12px;
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  font-size: 13px;
  font-weight: 700;
  color: #6e5a3f;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.state-btn:hover {
  border-color: #f7cd67;
}
.state-btn.active {
  border-color: transparent;
  background: linear-gradient(135deg, #b77dee, #889df0);
  color: #fff;
  box-shadow: 0 3px 0 #6c4fa0;
}
.state-btn.current {
  background: linear-gradient(135deg, #b77dee, #889df0);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #6c4fa0;
  cursor: default;
}

/* 起始状态：阶选择器 */
.tier-pick {
  display: flex;
  gap: 8px;
}
.tier-pick.multi .state-btn.current {
  cursor: pointer;
  flex: 1;
}
.tier-pick.multi .state-btn.tier-idle {
  background: #fffdf3;
  color: #6e5a3f;
  border: 1.5px solid #e7dcb1;
  box-shadow: none;
}
.tier-pick.multi .state-btn.tier-idle:hover {
  border-color: #f7cd67;
}
.tier-pick.multi .state-btn.tier-active {
  background: linear-gradient(135deg, #b77dee, #889df0);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #6c4fa0;
}

.state-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 18px;
}

.error {
  margin: 10px 0 0;
  color: #fc736d;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

/* ── 规则速查卡 ── */
.rules-head {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 2px;
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: inherit;
}
.rules-title {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
}
.rules-toggle {
  font-size: 12px;
  font-weight: 700;
  color: #b77dee;
}

.rules-body {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rule-group {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px;
}

.rule-group-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 8px;
}

.rule-badge {
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  padding: 2px 8px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}
.rule-badge.tier { background: linear-gradient(135deg, #f7cd67, #e59266); }
.rule-badge.awake { background: linear-gradient(135deg, #b77dee, #889df0); }

.rule-sub {
  font-size: 12px;
  font-weight: 700;
  color: #a89572;
  margin: 6px 0 4px;
  padding-left: 2px;
}

.rule-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-list li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  color: #5d4a32;
  line-height: 1.6;
}

.formula {
  font-family: ui-monospace, Consolas, 'Courier New', monospace;
  font-size: 12px;
  background: #fff7d4;
  border: 1px solid #f0e3a8;
  padding: 2px 8px;
  border-radius: 6px;
  color: #6e5a3f;
  font-weight: 600;
}

.arrow {
  font-weight: 800;
  color: #b77dee;
}

.result {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 6px;
  color: #fff;
}
.tier-tag { background: #b77dee; }
.awake-tag { background: linear-gradient(135deg, #b77dee, #889df0); }
</style>
