<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-green">等级计算</Card>

      <!-- 输入区 -->
      <Card>
        <div class="grid-2">
          <Field label="当前等级">
            <NumberInput v-model="currentLevel" :min="1" :max="39" />
          </Field>
          <Field label="目标等级">
            <NumberInput v-model="targetLevel" :min="2" :max="40" />
          </Field>
          <Field label="当前等级内经验">
            <NumberInput v-model="currentExp" :min="0" />
          </Field>
          <Field label="绿灵单价（可选）">
            <NumberInput v-model="price" :min="0" suffix="万" />
          </Field>
        </div>
      </Card>

      <!-- Tab 信息区 -->
      <Card>
        <Tabs v-model="activeTab" :items="tabItems">
          <template #note>
            <div class="tab-content">
              <div class="formula-row">
                <span class="formula-label">所需经验</span>
                <span class="formula-eq">=</span>
                <span class="formula-val">目标等级累计经验 − 当前等级累计经验 − 当前等级内经验</span>
              </div>
              <div class="formula-row">
                <span class="formula-label">所需绿灵</span>
                <span class="formula-eq">=</span>
                <span class="formula-val">目标等级累计绿灵 − 当前等级累计绿灵</span>
              </div>
              <div class="formula-row">
                <span class="formula-label">游戏币消耗</span>
                <span class="formula-eq">=</span>
                <span class="formula-val">所需绿灵 × 9 万（每次使用绿灵额外消耗 9 万游戏币）</span>
              </div>
              <div class="formula-row">
                <span class="formula-label">总花费</span>
                <span class="formula-eq">=</span>
                <span class="formula-val">绿灵成本 + 游戏币消耗 = 所需绿灵 × (单价 + 9)</span>
              </div>
            </div>
          </template>

          <template #table>
            <div class="table-wrap">
              <Table
                :columns="tableColumns"
                :data-source="tableData"
                row-key="level"
                :scroll="{ y: 240 }"
              >
                <template #cell-exp="{ value }">
                  {{ formatNumber(Number(value)) }}
                </template>
              </Table>
            </div>
          </template>

          <template #cap>
            <div class="cap-wrap">
              <div class="cap-row">
                <span class="cap-tag green-tag">绿灵</span>
                <ul class="cap-list">
                  <li><span class="stage-label">1阶</span><span class="stage-cap">20级</span></li>
                </ul>
              </div>
              <Divider type="dashed-yellow" />
              <div class="cap-row">
                <span class="cap-tag blue-tag">蓝灵</span>
                <ul class="cap-list">
                  <li><span class="stage-label">1阶</span><span class="stage-cap">20级</span></li>
                  <li><span class="stage-label">2阶</span><span class="stage-cap">30级</span></li>
                </ul>
              </div>
              <Divider type="dashed-yellow" />
              <div class="cap-row">
                <span class="cap-tag purple-tag">紫灵</span>
                <ul class="cap-list">
                  <li><span class="stage-label">1阶</span><span class="stage-cap">20级</span></li>
                  <li><span class="stage-label">2阶</span><span class="stage-cap">30级</span></li>
                  <li><span class="stage-label">3阶</span><span class="stage-cap">40级</span></li>
                </ul>
              </div>
            </div>
          </template>
        </Tabs>
      </Card>

      <Button type="primary" block size="large" @click="calculate">
        🌟 计算经验
      </Button>
      <p v-if="error" class="error">{{ error }}</p>

      <!-- 结果弹窗 -->
      <Modal
        v-model:open="showModal"
        title="计算结果"
        :typewriter="false"
        :show-footer="false"
      >
        <div v-if="result" class="modal-summary">
          {{ currentLevel }}级 → {{ targetLevel }}级，还需
          <b>{{ formatNumber(result.needExp) }}</b> 经验
        </div>

        <div v-if="result" class="modal-section">
          <div class="section-title">材料成本</div>
          <div class="cost-row">
            <Card color="app-green">
              <div class="cost-label">
                1级绿灵
                <span class="cost-badge">×{{ result.needGreen }}</span>
              </div>
              <div class="cost-value">{{ formatNumber(result.greenCost) }}万</div>
            </Card>
            <Card color="app-yellow">
              <div class="cost-label">游戏币消耗</div>
              <div class="cost-value">{{ formatNumber(result.gameCost) }}万</div>
            </Card>
          </div>
        </div>

        <div v-if="result" class="modal-total">
          <Card color="lime-green">
            <div class="total-line">
              <span class="total-label">总成本</span>
              <span class="total-value">{{ formatCost(result.totalCost) }}</span>
            </div>
          </Card>
        </div>

        <div class="modal-actions">
          <Button type="primary" block @click="showModal = false">好的</Button>
        </div>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button, Card, Modal, Tabs, Table, Divider } from 'animal-island-vue'
import type { TableColumn } from 'animal-island-vue'
import NumberInput from '@/components/NumberInput.vue'
import Field from '@/components/Field.vue'
import { GetSoulLevels } from '../../wailsjs/go/backend/App'
import { useDataReload } from '@/logic/useDataReload'

/* ─── 数据 ─── */
interface SoulRow {
  level: number
  exp: number
  green: number
  [k: string]: unknown
}

const SOUL_DATA = ref<SoulRow[]>([])

async function loadSoulLevels() {
  try {
    const data = await GetSoulLevels()
    if (data) {
      SOUL_DATA.value = data as SoulRow[]
    }
  } catch (e) {
    console.error('加载灵魂等级数据失败:', e)
  }
}

useDataReload(loadSoulLevels)

const currentLevel = ref(1)
const targetLevel = ref(40)
const currentExp = ref(0)
const price = ref(18)

const activeTab = ref('note')
const tabItems = [
  { key: 'note', label: '📖 经验说明' },
  { key: 'table', label: '📊 经验表' },
  { key: 'cap', label: '🌟 等级上限' },
]

const tableColumns: TableColumn<SoulRow>[] = [
  { title: '等级', dataIndex: 'level', align: 'center', width: '33.33%' },
  { title: '累计经验', dataIndex: 'exp', align: 'center', width: '33.33%' },
  { title: '累计绿灵', dataIndex: 'green', align: 'center', width: '33.34%' },
]

const tableData = computed(() => SOUL_DATA.value)

const result = ref<{
  needExp: number
  needGreen: number
  greenCost: number
  gameCost: number
  totalCost: number
} | null>(null)

const error = ref('')
const showModal = ref(false)

function formatNumber(n: number): string {
  return (n ?? 0).toLocaleString('zh-CN')
}

function formatCost(n: number): string {
  if (n >= 10000) {
    return (n / 10000).toFixed(2) + '亿'
  }
  return formatNumber(n) + '万'
}

function calculate() {
  error.value = ''

  if (targetLevel.value <= currentLevel.value) {
    error.value = '目标等级必须大于当前等级'
    result.value = null
    showModal.value = false
    return
  }

  const cur = SOUL_DATA.value[currentLevel.value - 1]
  const tgt = SOUL_DATA.value[targetLevel.value - 1]

  if (!cur || !tgt) {
    error.value = '等级数据异常'
    result.value = null
    showModal.value = false
    return
  }

  let needExp = tgt.exp - cur.exp - currentExp.value
  if (needExp < 0) needExp = 0

  const needGreen = tgt.green - cur.green
  const greenCost = price.value > 0 ? needGreen * price.value : 0
  const gameCost = needGreen * 9
  const totalCost = greenCost + gameCost

  result.value = {
    needExp,
    needGreen,
    greenCost,
    gameCost,
    totalCost,
  }

  showModal.value = true
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

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.tab-content {
  font-size: 13px;
  color: #5d4a32;
  line-height: 1.8;
  padding: 8px 4px;
}

.formula-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.formula-label {
  width: 80px;
  text-align: right;
  font-weight: 700;
  color: #725d42;
  flex-shrink: 0;
}

.formula-eq {
  color: #b8a26e;
  flex-shrink: 0;
}

.formula-val {
  color: #6e5a3f;
}

/* ── 等级上限 ── */
.cap-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px;
}

.cap-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 4px;
}

.cap-tag {
  display: inline-block;
  padding: 4px 14px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
  letter-spacing: 1px;
}

.green-tag {
  background: #8ac68a;
  box-shadow: 0 2px 0 #6ba66b;
}

.blue-tag {
  background: #889df0;
  box-shadow: 0 2px 0 #5b6dc4;
}

.purple-tag {
  background: #b77dee;
  box-shadow: 0 2px 0 #8d5cb9;
}

.cap-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 13px;
}

.cap-list li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.stage-label {
  color: #9a835a;
}

.stage-cap {
  color: #5d4a32;
  font-weight: 800;
}

.table-wrap {
  padding: 4px;
}

.error {
  margin: 0;
  color: #fc736d;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}

/* ── 弹窗内部 ── */
.modal-summary {
  background: #fff7d4;
  color: #8a6e1f;
  font-size: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  margin-bottom: 14px;
  border: 1.5px dashed #f7cd67;
}

.modal-summary b {
  color: #d97706;
}

.section-title {
  font-size: 14px;
  font-weight: 700;
  color: #725d42;
  margin-bottom: 8px;
}

.cost-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.cost-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.95);
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
}

.cost-badge {
  background: rgba(255, 255, 255, 0.35);
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 700;
}

.cost-value {
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  margin-top: 6px;
}

/* yellow card 文字色 */
.cost-row :deep(.aiv-card.aiv-card-app-yellow) .cost-label,
.cost-row :deep(.aiv-card.aiv-card-app-yellow) .cost-value {
  color: #725d42;
}

.modal-total {
  margin-top: 14px;
}

.total-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
}

.total-label {
  font-size: 14px;
  font-weight: 800;
  color: #3d5a1a;
}

.total-value {
  font-size: 22px;
  font-weight: 800;
  color: #3d5a1a;
}

.modal-actions {
  margin-top: 16px;
}
</style>
