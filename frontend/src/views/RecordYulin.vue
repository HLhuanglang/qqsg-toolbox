<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-yellow">羽灵 · 周记录</Card>

      <!-- 1. 培养规则速查（折叠） -->
      <Card>
        <button class="rules-head" @click="rulesOpen = !rulesOpen">
          <span class="rules-title">🪶 培养规则速查</span>
          <span class="rules-toggle">{{ rulesOpen ? '收起 ▲' : '展开 ▼' }}</span>
        </button>
        <div v-if="rulesOpen" class="rules-body">
          <p class="rules-tip">每周共可培养 <b>{{ WEEKLY_LIMIT }}</b> 次，可任意搭配 4 种羽毛。</p>
          <div class="rule-grid">
            <div
              v-for="f in FEATHERS"
              :key="f.key"
              class="rule-card"
              :style="{ borderTopColor: f.color }"
            >
              <div class="rule-card-head" :style="{ color: f.color }">{{ f.label }}</div>
              <div class="rule-cost">
                每次：羽毛×{{ f.cost.feather }} · 紫气×{{ f.cost.ziqi }} · 三国币 {{ f.cost.coin }}万
              </div>
              <div class="rule-exp-row">
                <span class="exp-pill succ">成功 +{{ f.exp.succ }}</span>
                <span class="exp-pill great">大成 +{{ f.exp.great }}</span>
                <span class="exp-pill perfect">完美 +{{ f.exp.perfect }}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 2. 总览 -->
      <Card>
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-label">已记录周数</div>
            <div class="stat-value">{{ records.length }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">最新等级</div>
            <div class="stat-value">{{ latest ? latest.level : '—' }}<span v-if="latest" class="stat-sub">({{ fmtNum(latest.expIn) }})</span></div>
          </div>
          <div class="stat">
            <div class="stat-label">累计经验</div>
            <div class="stat-value">{{ fmtNum(totalExp) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label" title="七彩鸾×10 + 灵珠原石×100，按首周价格折算">初始兑换成本</div>
            <div class="stat-value">{{ fmtCost(initCost) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">累计成本</div>
            <div class="stat-value">{{ fmtCost(totalCost) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">平均周经验</div>
            <div class="stat-value">{{ fmtNum(avgExp) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">完美率</div>
            <div class="stat-value">{{ perfectRate }}%</div>
          </div>
        </div>
      </Card>

      <!-- 3. 经验曲线 -->
      <Card>
        <div class="card-head">
          <span class="card-title">📈 每周经验曲线</span>
          <span class="card-hint" v-if="records.length === 0">暂无数据，先在下方添加一条记录</span>
        </div>
        <ExpChart :records="records" />
      </Card>

      <!-- 4. 周记录表 -->
      <Card>
        <div class="card-head">
          <span class="card-title">📒 周记录</span>
          <Button type="primary" size="small" @click="openAdd">＋ 添加本周</Button>
        </div>
        <div class="table-scroll">
          <table class="rec-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>进度</th>
                <th>等级 (经验)</th>
                <th>本周经验</th>
                <th>累计经验</th>
                <th>本周成本</th>
                <th>累计成本</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="records.length === 0">
                <td colspan="8" class="empty">尚无记录，点击右上角"＋ 添加本周"开始</td>
              </tr>
              <tr v-for="(r, i) in records" :key="r.id">
                <td>{{ r.date }}</td>
                <td>{{ r.note || ('第' + (i + 1) + '周') }}</td>
                <td>
                  <b>{{ r.level }}</b>
                  <span class="exp-in">({{ fmtNum(r.expIn) }})</span>
                </td>
                <td :class="{ pos: weekExpOf(r) > 0 }">
                  {{ fmtNum(weekExpOf(r)) }}
                </td>
                <td>{{ fmtNum(cumExp[i]) }}</td>
                <td>{{ fmtCost(weekCostOf(r)) }}</td>
                <td>{{ fmtCost(cumCost[i]) }}</td>
                <td class="ops">
                  <button class="op-btn" @click="openEdit(r)">编辑</button>
                  <button class="op-btn danger" @click="confirmDel(r)">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>

    <!-- 5. 添加/编辑 弹窗 -->
    <Modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑周记录' : '添加周记录'"
      :typewriter="false"
      :show-footer="false"
      width="720px"
    >
      <div class="form">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">基本信息</div>
          <div class="grid-3">
            <Field label="日期">
              <Input v-model="form.date" type="date" />
            </Field>
            <Field label="备注 / 进度">
              <Input v-model="form.note" :placeholder="defaultNote" />
            </Field>
            <Field label="周末等级">
              <NumberInput v-model="form.level" :min="1" :max="60" />
            </Field>
          </div>
          <Field label="当前等级内经验">
            <NumberInput v-model="form.expIn" :min="0" />
          </Field>
        </div>

        <!-- 价格 -->
        <div class="form-section">
          <div class="section-title">
            材料价格
            <span class="section-hint">单位：万 / 个</span>
          </div>
          <div class="grid-6">
            <Field label="七彩鸾"><NumberInput v-model="form.prices.caihong" :min="0" /></Field>
            <Field label="五级羽毛"><NumberInput v-model="form.prices.lv5" :min="0" /></Field>
            <Field label="四级羽毛"><NumberInput v-model="form.prices.lv4" :min="0" /></Field>
            <Field label="三级羽毛"><NumberInput v-model="form.prices.lv3" :min="0" /></Field>
            <Field label="紫气"><NumberInput v-model="form.prices.ziqi" :min="0" /></Field>
            <Field label="灵珠原石"><NumberInput v-model="form.prices.lingzhu" :min="0" /></Field>
          </div>
          <p class="price-tip">
            初始兑换：七彩鸾×{{ INITIAL_COST_MATERIALS.caihong }} + 灵珠原石×{{ INITIAL_COST_MATERIALS.lingzhu }}
            <template v-if="isFirstRecord">
              ≈ <b>{{ fmtCost(initCostPreview) }}</b>（计入累计成本）
            </template>
            <template v-else>
              · 仅首周价格用于折算
            </template>
          </p>
        </div>

        <!-- 培养次数 -->
        <div class="form-section">
          <div class="section-title">
            培养次数
            <span class="section-hint">
              已用 <b :class="{ over: total > WEEKLY_LIMIT }">{{ total }}</b> / {{ WEEKLY_LIMIT }} 次
            </span>
          </div>
          <div class="feather-grid">
            <div
              v-for="f in FEATHERS"
              :key="f.key"
              class="feather-card"
              :style="{ borderColor: f.color + '55' }"
            >
              <div class="feather-head" :style="{ color: f.color }">
                {{ f.label }}
                <span class="feather-sum">×{{ countOf(f.key) }}</span>
              </div>
              <div class="feather-row">
                <Field label="成功"><NumberInput v-model="form.counts[f.key].succ" :min="0" /></Field>
                <Field label="大成"><NumberInput v-model="form.counts[f.key].great" :min="0" /></Field>
                <Field label="完美"><NumberInput v-model="form.counts[f.key].perfect" :min="0" /></Field>
              </div>
              <div class="feather-foot">
                经验 <b>{{ fmtNum(featherExp(f.key)) }}</b>
                · 成本 <b>{{ fmtCost(featherCost(f.key)) }}</b>
              </div>
            </div>
          </div>
        </div>

        <!-- 汇总 -->
        <div class="form-section summary">
          <div class="sum-row">
            <span>本周经验</span>
            <b class="sum-exp">+{{ fmtNum(weekExpPreview) }}</b>
          </div>
          <div class="sum-row">
            <span>本周成本</span>
            <b class="sum-cost">{{ fmtCost(weekCostPreview) }}</b>
          </div>
          <div v-if="isFirstRecord && initCostPreview > 0" class="sum-row">
            <span>初始兑换成本</span>
            <b class="sum-cost">{{ fmtCost(initCostPreview) }}</b>
          </div>
          <div class="sum-row" v-if="materialsPreview.ziqi || materialsPreview.coin">
            <span>消耗</span>
            <span class="sum-mats">
              紫气×{{ materialsPreview.ziqi }}
              · 三国币 {{ fmtCost(materialsPreview.coin) }}
            </span>
          </div>
        </div>

        <p v-if="formError" class="err">{{ formError }}</p>

        <div class="modal-actions">
          <Button block @click="modalOpen = false">取消</Button>
          <Button type="primary" block @click="submit">{{ editingId ? '保存' : '添加' }}</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Button, Card, Modal, Input } from 'animal-island-vue'
import Field from '@/components/Field.vue'
import NumberInput from '@/components/NumberInput.vue'
import ExpChart from '@/components/YulinExpChart.vue'
import {
  WEEKLY_LIMIT,
  FEATHERS,
  INITIAL_COST_MATERIALS,
  type FeatherKey,
  type WeekRecord,
  type WeeklyCounts,
  type WeeklyPrices,
  emptyWeeklyCounts,
  defaultPrices,
  totalAttempts,
  weeklyExp,
  weeklyCost,
  weeklyMaterials,
  initialCost,
  loadStore,
  saveStore,
  genId,
  todayStr,
  fmtNum,
  fmtCost,
} from '@/logic/yulin'
import { activeAccountId } from '@/logic/account'

/* ─── 数据（按当前账户隔离，账户切换时自动重载） ─── */
const records = ref<WeekRecord[]>([])
const lastPrices = ref<WeeklyPrices>(defaultPrices())

function reloadFromStore() {
  const s = loadStore()
  records.value = s.records
  lastPrices.value = s.lastPrices ?? defaultPrices()
}
reloadFromStore()

watch(activeAccountId, () => {
  // 账户切换 → 关闭表单、清空错误、重新加载本账户数据
  modalOpen.value = false
  formError.value = ''
  reloadFromStore()
})

function persist() {
  saveStore({ records: records.value, lastPrices: lastPrices.value })
}

/* ─── 派生数据 ─── */
/** 初始兑换成本（七彩鸾×10 + 灵珠原石×100），用首条记录的价格折算 */
const initCost = computed(() =>
  records.value.length > 0 ? initialCost(records.value[0].prices) : 0,
)
const cumExp = computed(() => {
  let s = 0
  return records.value.map((r) => (s += weeklyExp(r.counts)))
})
const cumCost = computed(() => {
  let s = initCost.value
  return records.value.map((r) => (s += weeklyCost(r.counts, r.prices)))
})
const totalExp = computed(() => cumExp.value[cumExp.value.length - 1] ?? 0)
const totalCost = computed(() => cumCost.value[cumCost.value.length - 1] ?? initCost.value)
const latest = computed(() => records.value[records.value.length - 1])
const avgExp = computed(() =>
  records.value.length ? Math.round(totalExp.value / records.value.length) : 0,
)
const perfectRate = computed(() => {
  let p = 0
  let t = 0
  for (const r of records.value) {
    for (const f of FEATHERS) {
      const c = r.counts[f.key]
      p += c.perfect
      t += c.succ + c.great + c.perfect
    }
  }
  return t > 0 ? ((p / t) * 100).toFixed(1) : '0.0'
})

function weekExpOf(r: WeekRecord) { return weeklyExp(r.counts) }
function weekCostOf(r: WeekRecord) { return weeklyCost(r.counts, r.prices) }

/* ─── UI 状态 ─── */
const rulesOpen = ref(false)
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const form = reactive<{
  date: string
  note: string
  level: number
  expIn: number
  prices: WeeklyPrices
  counts: WeeklyCounts
}>({
  date: todayStr(),
  note: '',
  level: 1,
  expIn: 0,
  prices: { ...defaultPrices() },
  counts: emptyWeeklyCounts(),
})

const defaultNote = computed(() => '第' + (records.value.length + 1) + '周')

const total = computed(() => totalAttempts(form.counts))
const weekExpPreview = computed(() => weeklyExp(form.counts))
const weekCostPreview = computed(() => weeklyCost(form.counts, form.prices))
const materialsPreview = computed(() => weeklyMaterials(form.counts))
/** 当前编辑的是否为「首条记录」（决定其价格是否参与初始成本折算） */
const isFirstRecord = computed(() => {
  if (records.value.length === 0) return true
  if (!editingId.value) {
    // 新增：若日期 ≤ 现有最早日期，则会成为首条
    return form.date <= records.value[0].date
  }
  return records.value[0].id === editingId.value
})
const initCostPreview = computed(() => initialCost(form.prices))

function countOf(k: FeatherKey) {
  const c = form.counts[k]
  return c.succ + c.great + c.perfect
}
function featherExp(k: FeatherKey) {
  const f = FEATHERS.find((x) => x.key === k)!
  const c = form.counts[k]
  return c.succ * f.exp.succ + c.great * f.exp.great + c.perfect * f.exp.perfect
}
function featherCost(k: FeatherKey) {
  const f = FEATHERS.find((x) => x.key === k)!
  const c = form.counts[k]
  const times = c.succ + c.great + c.perfect
  const featherTotal = times * f.cost.feather
  const ziqiTotal = times * f.cost.ziqi
  const coinTotal = times * f.cost.coin
  return (
    featherTotal * (form.prices as any)[k] +
    ziqiTotal * form.prices.ziqi +
    coinTotal
  )
}

function resetForm() {
  form.date = todayStr()
  form.note = ''
  // 等级 / 经验 → 默认沿用最近一次
  if (latest.value) {
    form.level = latest.value.level
    form.expIn = latest.value.expIn
  } else {
    form.level = 1
    form.expIn = 0
  }
  form.prices = { ...lastPrices.value }
  form.counts = emptyWeeklyCounts()
  formError.value = ''
}

function openAdd() {
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(r: WeekRecord) {
  editingId.value = r.id
  form.date = r.date
  form.note = r.note
  form.level = r.level
  form.expIn = r.expIn
  form.prices = { ...r.prices }
  // 深拷贝 counts
  form.counts = JSON.parse(JSON.stringify(r.counts))
  formError.value = ''
  modalOpen.value = true
}

function submit() {
  formError.value = ''
  if (total.value > WEEKLY_LIMIT) {
    formError.value = `本周培养次数已超过 ${WEEKLY_LIMIT} 次（当前 ${total.value} 次）`
    return
  }
  if (!form.date) {
    formError.value = '请填写日期'
    return
  }
  const note = form.note || defaultNote.value

  if (editingId.value) {
    const idx = records.value.findIndex((x) => x.id === editingId.value)
    if (idx >= 0) {
      records.value[idx] = {
        ...records.value[idx],
        date: form.date,
        note,
        level: form.level,
        expIn: form.expIn,
        prices: { ...form.prices },
        counts: JSON.parse(JSON.stringify(form.counts)),
      }
    }
  } else {
    records.value.push({
      id: genId(),
      date: form.date,
      note,
      level: form.level,
      expIn: form.expIn,
      prices: { ...form.prices },
      counts: JSON.parse(JSON.stringify(form.counts)),
    })
  }

  // 排序：按日期升序
  records.value.sort((a, b) => a.date.localeCompare(b.date))

  // 记忆最近价格
  lastPrices.value = { ...form.prices }
  persist()
  modalOpen.value = false
}

function confirmDel(r: WeekRecord) {
  if (!confirm(`确定删除「${r.note || r.date}」这条记录吗？`)) return
  const idx = records.value.findIndex((x) => x.id === r.id)
  if (idx >= 0) records.value.splice(idx, 1)
  persist()
}

// 防止 records 引用同一对象时丢失响应；保险起见保存按需触发
watch(records, () => {}, { deep: true })
</script>

<style scoped>
.page {
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
}
.container {
  max-width: 980px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── 规则速查 ── */
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
  color: #e59266;
}
.rules-body {
  margin-top: 12px;
}
.rules-tip {
  margin: 0 0 10px;
  font-size: 13px;
  color: #6e5a3f;
}
.rules-tip b {
  color: #d97706;
}
.rule-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.rule-card {
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-top-width: 4px;
  border-radius: 12px;
  padding: 10px 12px;
}
.rule-card-head {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 6px;
}
.rule-cost {
  font-size: 12px;
  color: #6e5a3f;
  margin-bottom: 8px;
}
.rule-exp-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.exp-pill {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 10px;
  border-radius: 999px;
  color: #fff;
}
.exp-pill.succ { background: #8ac68a; }
.exp-pill.great { background: #f7cd67; color: #6e5a3f; }
.exp-pill.perfect { background: linear-gradient(135deg, #b77dee, #889df0); }

/* ── 总览 ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 10px;
}
.stat {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
}
.stat-label {
  font-size: 11px;
  color: #9a835a;
  font-weight: 700;
}
.stat-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
  color: #5d4a32;
}
.stat-sub {
  font-size: 11px;
  color: #a89572;
  margin-left: 2px;
  font-weight: 700;
}

/* ── 卡片头部 ── */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.card-title {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
}
.card-hint {
  font-size: 12px;
  color: #a89572;
}

/* ── 表格 ── */
.table-scroll {
  overflow-x: auto;
}
.rec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #5d4a32;
}
.rec-table th,
.rec-table td {
  padding: 8px 10px;
  text-align: center;
  border-bottom: 1px dashed #e7dcb1;
  white-space: nowrap;
}
.rec-table th {
  background: #f5edc4;
  font-weight: 800;
  color: #725d42;
}
.rec-table tbody tr:hover {
  background: #fff8de;
}
.rec-table .empty {
  color: #a89572;
  padding: 22px 10px;
  font-style: italic;
}
.exp-in {
  color: #9a835a;
  font-size: 11px;
  margin-left: 2px;
}
.pos { color: #d97706; font-weight: 700; }
.ops { display: flex; gap: 6px; justify-content: center; }
.op-btn {
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.op-btn:hover { background: #fff8de; }
.op-btn.danger { color: #fc736d; border-color: #fac9c5; }
.op-btn.danger:hover { background: #fde9e7; }

/* ── 弹窗 ── */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-section {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
}
.section-title {
  font-size: 13px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.section-hint {
  font-size: 11px;
  font-weight: 700;
  color: #a89572;
}
.section-hint b { color: #5d4a32; }
.section-hint b.over { color: #fc736d; }
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}
.grid-5 {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
.grid-6 {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
.price-tip {
  margin: 8px 2px 0;
  font-size: 11px;
  font-weight: 700;
  color: #9a835a;
}
.price-tip b {
  color: #d97706;
}
.feather-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.feather-card {
  background: #fff;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  padding: 8px 10px 10px;
}
.feather-head {
  font-size: 12.5px;
  font-weight: 800;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6px;
}
.feather-sum {
  background: #f5edc4;
  color: #725d42;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.feather-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.feather-foot {
  margin-top: 6px;
  font-size: 11px;
  color: #9a835a;
}
.feather-foot b { color: #5d4a32; }

.summary {
  background: #fff7d4;
  border: 1.5px dashed #f7cd67;
}
.sum-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #6e5a3f;
  padding: 4px 2px;
}
.sum-exp { color: #d97706; font-size: 16px; }
.sum-cost { color: #5d4a32; font-size: 16px; }
.sum-mats { color: #9a835a; font-size: 12px; font-weight: 700; }

.err {
  margin: 0;
  color: #fc736d;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.modal-actions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  margin-top: 4px;
}

@media (max-width: 720px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .rule-grid { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr; }
  .grid-5 { grid-template-columns: repeat(2, 1fr); }
  .grid-6 { grid-template-columns: repeat(2, 1fr); }
  .feather-grid { grid-template-columns: 1fr; }
}
</style>
