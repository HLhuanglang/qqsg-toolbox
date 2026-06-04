<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-yellow">投城 · 投资战记录</Card>

      <!-- 1. 规则速查 -->
      <Card>
        <button class="rules-head" @click="rulesOpen = !rulesOpen">
          <span class="rules-title">🏯 投资战规则速查</span>
          <span class="rules-toggle">{{ rulesOpen ? '收起 ▲' : '展开 ▼' }}</span>
        </button>
        <div v-if="rulesOpen" class="rules-body">
          <p class="rules-tip">
            周六 16:10 ~ 周日 24:00 期间，所有军团可对己方占领的城市进行投资战。
          </p>
          <div class="rule-grid">
            <div
              v-for="cn in COUNTRIES"
              :key="cn.key"
              class="rule-card"
              :style="{ borderTopColor: cn.color }"
            >
              <div class="rule-card-head" :style="{ color: cn.color }">
                {{ cn.label }}自有
              </div>
              <div class="rule-cities">
                <span v-for="ck in cn.cities" :key="ck" class="city-pill">
                  {{ CITY_BY_KEY[ck].label }}
                </span>
              </div>
            </div>
            <div class="rule-card free">
              <div class="rule-card-head free-head">可争夺</div>
              <div class="rule-cities">
                <span v-for="ck in FREE_CITIES" :key="ck" class="city-pill free-pill">
                  {{ CITY_BY_KEY[ck].label }}
                </span>
              </div>
            </div>
          </div>
          <div class="rules-formulas">
            <div>· 分红比例 = 自家投资数 ÷ 城市整体投资总额</div>
            <div>· 三国币获利 = 分红比例 × 城市三国币产出</div>
            <div>· 五铢获利 = 分红比例 × 城市五铢产出</div>
            <div>
              · 五铢获取比例 = 五铢获利 ÷ (投资数 − 三国币获利)
              <span class="rules-hint">（剔除回笼三国币后的净成本，每 1 三国币换到的五铢）</span>
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
            <div class="stat-label">累计投资数</div>
            <div class="stat-value">{{ fmtBig(totals.invest) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">累计三国币获利</div>
            <div class="stat-value pos">{{ fmtBig(totals.coinReturn) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">累计五铢获利</div>
            <div class="stat-value pos">{{ fmtBig(totals.wuzhuReturn) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">累计净三国币成本</div>
            <div class="stat-value">{{ fmtBig(totals.netCost) }}</div>
          </div>
          <div class="stat">
            <div
              class="stat-label"
              title="加权五铢获取比例 = 累计五铢获利 / 累计净三国币成本"
            >平均五铢获取比例</div>
            <div class="stat-value strong">{{ fmtDec(totals.wuzhuRatio, 4) }}</div>
          </div>
        </div>
      </Card>

      <!-- 3. 周记录 -->
      <Card>
        <div class="card-head">
          <span class="card-title">📒 投资周记录</span>
          <Button type="primary" size="small" @click="openAdd">＋ 添加本周</Button>
        </div>

        <div v-if="records.length === 0" class="empty">
          尚无记录，点击右上角"＋ 添加本周"开始
        </div>

        <div v-else class="rec-list">
          <div
            v-for="r in recordsDesc"
            :key="r.id"
            class="rec-card"
            :class="{ expanded: isExpanded(r.id) }"
          >
            <div class="rec-head" role="button" tabindex="0" @click="toggleExpand(r.id)" @keydown.enter.prevent="toggleExpand(r.id)" @keydown.space.prevent="toggleExpand(r.id)">
              <div class="rec-title">
                <span class="rec-chevron" :class="{ open: isExpanded(r.id) }">▸</span>
                <span
                  class="head-tag country"
                  :style="{ '--tag-bg': COUNTRY_BY_KEY[r.country].color }"
                >
                  <span class="head-tag-label">国家</span>
                  <span class="head-tag-value">{{ COUNTRY_BY_KEY[r.country].label }}</span>
                </span>
                <span class="head-tag invest">
                  <span class="head-tag-label">投资时段</span>
                  <span class="head-tag-value">{{ r.startDate }} ~ {{ r.endDate }}</span>
                </span>
                <span class="head-tag income">
                  <span class="head-tag-label">收益时段</span>
                  <span class="head-tag-value">
                    {{ r.incomeStartDate }} ~ {{ r.incomeEndDate }}
                    <span class="head-tag-hint">15:00 截止</span>
                  </span>
                </span>
                <span v-if="r.note" class="rec-note">📝 {{ r.note }}</span>
              </div>
              <div class="rec-ops" @click.stop>
                <button class="op-btn" @click="openEdit(r)">编辑</button>
                <button class="op-btn danger" @click="confirmDel(r)">删除</button>
              </div>
            </div>

            <!-- 折叠时：一行核心数据预览 -->
            <div v-if="!isExpanded(r.id)" class="rec-preview" @click="toggleExpand(r.id)">
              <div class="prev-item">
                <span class="prev-label">城市</span>
                <span class="prev-value">{{ r.cities.length }} 座</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">总投资</span>
                <span class="prev-value">{{ fmtInt(recTotals(r).invest) }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">三国币获利</span>
                <span class="prev-value pos">{{ fmtBig(recTotals(r).coinReturn) }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">五铢获利</span>
                <span class="prev-value pos">{{ fmtBig(recTotals(r).wuzhuReturn) }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item highlight">
                <span class="prev-label">加权五铢比例</span>
                <span class="prev-value strong">{{ fmtDec(recTotals(r).wuzhuRatio, 4) }}</span>
              </div>
              <span class="prev-expand">展开详情 ▾</span>
            </div>

            <!-- 展开时：完整表格 + 汇总徽章 -->
            <template v-if="isExpanded(r.id)">
              <div class="table-scroll">
                <table class="rec-table">
                  <thead>
                    <tr>
                      <th rowspan="2">城市</th>
                      <th colspan="2" class="grp grp-output">城市产出</th>
                      <th colspan="3" class="grp grp-invest">投资情况</th>
                      <th colspan="2" class="grp grp-return">投资获利</th>
                      <th rowspan="2" class="grp grp-ratio">五铢获取比例</th>
                    </tr>
                    <tr>
                      <th class="sub">三国币</th>
                      <th class="sub">五铢</th>
                      <th class="sub">投资数</th>
                      <th class="sub">占比</th>
                      <th class="sub">整体投资总额</th>
                      <th class="sub">三国币</th>
                      <th class="sub">五铢</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="c in r.cities" :key="c.city">
                      <td>
                        <span
                          class="city-cell"
                          :class="['owner-' + CITY_BY_KEY[c.city].owner]"
                        >{{ CITY_BY_KEY[c.city].label }}</span>
                      </td>
                      <td>{{ fmtInt(c.outputCoin) }}</td>
                      <td>{{ fmtInt(c.outputWuzhu) }}</td>
                      <td>{{ fmtInt(c.myInvest) }}</td>
                      <td>{{ fmtPct(metricsOf(c).ratio) }}</td>
                      <td>{{ fmtDec(metricsOf(c).totalInvest, 2) }}</td>
                      <td class="pos">{{ fmtDec(metricsOf(c).coinReturn, 3) }}</td>
                      <td class="pos">{{ fmtDec(metricsOf(c).wuzhuReturn, 3) }}</td>
                      <td class="strong">{{ fmtDec(metricsOf(c).wuzhuRatio, 4) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- 本周汇总 -->
              <div class="rec-summary">
                <div class="sum-chip">
                  <span class="sum-chip-label">总投资数</span>
                  <span class="sum-chip-value">{{ fmtInt(recTotals(r).invest) }}</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">三国币获利</span>
                  <span class="sum-chip-value pos">{{ fmtDec(recTotals(r).coinReturn, 3) }}</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">五铢获利</span>
                  <span class="sum-chip-value pos">{{ fmtDec(recTotals(r).wuzhuReturn, 3) }}</span>
                </div>
                <div class="sum-chip highlight">
                  <span class="sum-chip-label">
                    加权五铢获取比例
                    <span class="sum-chip-hint">五铢获利 ÷ 净三国币成本</span>
                  </span>
                  <span class="sum-chip-value strong">{{ fmtDec(recTotals(r).wuzhuRatio, 4) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Card>
    </div>

    <!-- 4. 添加 / 编辑 弹窗 -->
    <Modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑投资周记录' : '添加投资周记录'"
      :typewriter="false"
      :show-footer="false"
      width="820px"
    >
      <div class="form">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">基本信息</div>
          <div class="grid-3">
            <Field label="所属国家">
              <select v-model="form.country" class="select">
                <option v-for="cn in COUNTRIES" :key="cn.key" :value="cn.key">
                  {{ cn.label }}
                </option>
              </select>
            </Field>
            <Field label="投资 · 开始（周六）">
              <Input v-model="form.startDate" type="date" />
            </Field>
            <Field label="投资 · 结束（周日）">
              <Input v-model="form.endDate" type="date" />
            </Field>
          </div>
          <div class="grid-3">
            <Field label="收益 · 开始（次周一）">
              <Input v-model="form.incomeStartDate" type="date" />
            </Field>
            <Field label="收益 · 结束（次周六 15:00）">
              <Input v-model="form.incomeEndDate" type="date" />
            </Field>
            <Field label="备注">
              <Input v-model="form.note" placeholder="例如：第N周 / 占领襄阳 等" />
            </Field>
          </div>
        </div>

        <!-- 投资明细 -->
        <div class="form-section">
          <div class="section-title">
            投资城市
            <span class="section-hint">
              已选 <b>{{ form.cities.length }}</b> 座
            </span>
          </div>

          <!-- 城市快捷加入按钮 -->
          <div class="city-picker">
            <div class="picker-line">
              <span class="picker-label">{{ COUNTRY_BY_KEY[form.country].label }}自有</span>
              <button
                v-for="ck in COUNTRY_BY_KEY[form.country].cities"
                :key="ck"
                class="picker-btn"
                :class="{ added: hasCity(ck) }"
                :disabled="hasCity(ck)"
                @click="addCity(ck)"
              >＋ {{ CITY_BY_KEY[ck].label }}</button>
            </div>
            <div class="picker-line">
              <span class="picker-label free">可争夺</span>
              <button
                v-for="ck in FREE_CITIES"
                :key="ck"
                class="picker-btn free"
                :class="{ added: hasCity(ck) }"
                :disabled="hasCity(ck)"
                @click="addCity(ck)"
              >＋ {{ CITY_BY_KEY[ck].label }}</button>
            </div>
          </div>

          <div v-if="form.cities.length === 0" class="empty-cities">
            还没有添加城市，请点击上方按钮加入参与投资的城市
          </div>

          <div v-else class="city-cards">
            <div
              v-for="(c, idx) in form.cities"
              :key="c.city + '_' + idx"
              class="city-card"
              :class="['owner-' + CITY_BY_KEY[c.city].owner]"
            >
              <div class="city-card-head">
                <span class="city-name">
                  {{ CITY_BY_KEY[c.city].label }}
                  <span class="owner-tag">{{ ownerLabel(c.city) }}</span>
                </span>
                <button class="remove-btn" @click="removeCity(idx)" title="移除">✕</button>
              </div>

              <div class="city-grid">
                <Field label="三国币产出">
                  <NumberInput v-model="c.outputCoin" :min="0" />
                </Field>
                <Field label="五铢产出">
                  <NumberInput v-model="c.outputWuzhu" :min="0" />
                </Field>
                <Field label="本军团投资数">
                  <NumberInput v-model="c.myInvest" :min="0" />
                </Field>
                <Field label="分红占比 (%)">
                  <NumberInput
                    :model-value="getRatioPct(c)"
                    :min="0"
                    :max="100"
                    :step="0.01"
                    @update:model-value="(v: number | string) => setRatioPct(c, v)"
                  />
                </Field>
              </div>

              <div class="city-result">
                <div class="res-row">
                  <span>整体投资总额</span>
                  <b>{{ fmtDec(metricsOf(c).totalInvest, 2) }}</b>
                </div>
                <div class="res-row">
                  <span>三国币获利</span>
                  <b class="pos">{{ fmtDec(metricsOf(c).coinReturn, 3) }}</b>
                </div>
                <div class="res-row">
                  <span>五铢获利</span>
                  <b class="pos">{{ fmtDec(metricsOf(c).wuzhuReturn, 3) }}</b>
                </div>
                <div class="res-row">
                  <span>净三国币成本</span>
                  <b>{{ fmtDec(metricsOf(c).netCost, 2) }}</b>
                </div>
                <div class="res-row strong">
                  <span>五铢获取比例</span>
                  <b class="strong">{{ fmtDec(metricsOf(c).wuzhuRatio, 4) }}</b>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 汇总 -->
        <div class="form-section summary" v-if="form.cities.length > 0">
          <div class="sum-row">
            <span>总投资数</span>
            <b class="sum-num">{{ fmtInt(formTotals.invest) }}</b>
          </div>
          <div class="sum-row">
            <span>总三国币获利</span>
            <b class="sum-num pos">{{ fmtDec(formTotals.coinReturn, 3) }}</b>
          </div>
          <div class="sum-row">
            <span>总五铢获利</span>
            <b class="sum-num pos">{{ fmtDec(formTotals.wuzhuReturn, 3) }}</b>
          </div>
          <div class="sum-row">
            <span>加权五铢获取比例</span>
            <b class="sum-num strong">{{ fmtDec(formTotals.wuzhuRatio, 4) }}</b>
          </div>
        </div>

        <p v-if="formError" class="err">{{ formError }}</p>

        <div class="modal-actions">
          <Button block @click="modalOpen = false">取消</Button>
          <Button type="primary" block @click="submit">
            {{ editingId ? '保存' : '添加' }}
          </Button>
        </div>
      </div>
    </Modal>

    <!-- 5. 删除确认弹窗 -->
    <Modal
      v-model:open="delModalOpen"
      title="删除确认"
      :typewriter="false"
      :show-footer="false"
      width="420px"
    >
      <div class="confirm-body">
        <div class="confirm-icon">
          <span>!</span>
        </div>
        <div class="confirm-text">
          确定删除这条投资记录吗？
          <div class="confirm-target">
            <span class="confirm-tip">删除后无法恢复</span>
          </div>
          <div v-if="pendingDel" class="confirm-meta">
            <span
              class="confirm-meta-tag country"
              :style="{ '--tag-bg': COUNTRY_BY_KEY[pendingDel.country].color }"
            >{{ COUNTRY_BY_KEY[pendingDel.country].label }}</span>
            <span class="confirm-meta-range">
              {{ pendingDel.startDate }} ~ {{ pendingDel.endDate }}
            </span>
          </div>
        </div>

        <div class="modal-actions confirm-actions">
          <Button block @click="cancelDel">取消</Button>
          <Button type="primary" danger block @click="doDel">确定删除</Button>
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
import {
  COUNTRIES,
  COUNTRY_BY_KEY,
  CITIES,
  CITY_BY_KEY,
  FREE_CITIES,
  type CityKey,
  type CountryKey,
  type CityRecord,
  type CityInvest,
  emptyCityInvest,
  cityMetrics,
  recordTotals,
  loadStore,
  saveStore,
  genId,
  defaultPeriod,
  addDays,
  fmtInt,
  fmtDec,
  fmtPct,
  fmtBig,
} from '@/logic/city'
import { activeAccountId } from '@/logic/account'

/* ─── 数据（按账户隔离） ─── */
const records = ref<CityRecord[]>([])
const lastCountry = ref<CountryKey>('shu')

function reloadFromStore() {
  const s = loadStore()
  records.value = s.records
  lastCountry.value = s.lastCountry ?? 'shu'
}
reloadFromStore()

watch(activeAccountId, () => {
  modalOpen.value = false
  formError.value = ''
  expandedIds.value = new Set()
  delModalOpen.value = false
  pendingDel.value = null
  reloadFromStore()
})

function persist() {
  saveStore({ records: records.value, lastCountry: lastCountry.value })
}

/* ─── 派生数据 ─── */
const recordsDesc = computed(() =>
  [...records.value].sort((a, b) => b.startDate.localeCompare(a.startDate)),
)

/* ─── 展开/折叠 ─── */
const expandedIds = ref<Set<string>>(new Set())
function isExpanded(id: string): boolean {
  return expandedIds.value.has(id)
}
function toggleExpand(id: string) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}
/* 切换账户后清空展开状态（在已有 watch 中处理；这里仅暴露给 reload 逻辑） */

const totals = computed(() => {
  let invest = 0
  let coinReturn = 0
  let wuzhuReturn = 0
  for (const r of records.value) {
    const t = recordTotals(r)
    invest += t.invest
    coinReturn += t.coinReturn
    wuzhuReturn += t.wuzhuReturn
  }
  const netCost = invest - coinReturn
  const wuzhuRatio = netCost > 0 ? wuzhuReturn / netCost : 0
  return { invest, coinReturn, wuzhuReturn, netCost, wuzhuRatio }
})

function metricsOf(c: CityInvest) {
  return cityMetrics(c)
}
function recTotals(r: CityRecord) {
  return recordTotals(r)
}
function ownerLabel(ck: CityKey): string {
  const owner = CITY_BY_KEY[ck].owner
  if (owner === 'free') return '可争夺'
  return COUNTRY_BY_KEY[owner].label + '自有'
}

/* ─── 弹窗 / 表单 ─── */
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')
const rulesOpen = ref(false)

interface FormState {
  startDate: string
  endDate: string
  incomeStartDate: string
  incomeEndDate: string
  country: CountryKey
  note: string
  cities: CityInvest[]
}

const period = defaultPeriod()
const form = reactive<FormState>({
  startDate: period.start,
  endDate: period.end,
  incomeStartDate: period.incomeStart,
  incomeEndDate: period.incomeEnd,
  country: 'shu',
  note: '',
  cities: [],
})

/* 投资期变更时，自动联动收益期默认值（次日 ~ 6 天后） */
watch(
  () => form.endDate,
  (next, prev) => {
    if (!next) return
    const expectedFromPrev = prev ? addDays(prev, 1) : ''
    // 仅当用户未自定义过收益开始（仍处于上一个 endDate 联动出的值）时才自动同步
    if (!form.incomeStartDate || form.incomeStartDate === expectedFromPrev) {
      form.incomeStartDate = addDays(next, 1)
    }
    const expectedEndFromPrev = prev ? addDays(prev, 6) : ''
    if (!form.incomeEndDate || form.incomeEndDate === expectedEndFromPrev) {
      form.incomeEndDate = addDays(next, 6)
    }
  },
)

const formTotals = computed(() => {
  let invest = 0
  let coinReturn = 0
  let wuzhuReturn = 0
  for (const c of form.cities) {
    const m = cityMetrics(c)
    invest += c.myInvest
    coinReturn += m.coinReturn
    wuzhuReturn += m.wuzhuReturn
  }
  const netCost = invest - coinReturn
  const wuzhuRatio = netCost > 0 ? wuzhuReturn / netCost : 0
  return { invest, coinReturn, wuzhuReturn, netCost, wuzhuRatio }
})

function hasCity(ck: CityKey): boolean {
  return form.cities.some((x) => x.city === ck)
}
function addCity(ck: CityKey) {
  if (hasCity(ck)) return
  form.cities.push(emptyCityInvest(ck))
  // 排序：自有在前，可争夺在后；同组按 CITIES 顺序
  const order: Record<CityKey, number> = {} as any
  CITIES.forEach((c, i) => (order[c.key] = i))
  form.cities.sort((a, b) => order[a.city] - order[b.city])
}
function removeCity(idx: number) {
  form.cities.splice(idx, 1)
}

/* 分红占比：内部 0..1，UI 输入 0..100 */
function getRatioPct(c: CityInvest): number {
  return Math.round((c.ratio || 0) * 1e6) / 1e4 // 保留 4 位小数的百分比
}
function setRatioPct(c: CityInvest, v: number | string) {
  const n = Number(v) || 0
  c.ratio = Math.max(0, Math.min(1, n / 100))
}

function resetForm() {
  const p = defaultPeriod()
  form.startDate = p.start
  form.endDate = p.end
  form.incomeStartDate = p.incomeStart
  form.incomeEndDate = p.incomeEnd
  form.country = lastCountry.value
  form.note = ''
  form.cities = []
  formError.value = ''
}

function openAdd() {
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(r: CityRecord) {
  editingId.value = r.id
  form.startDate = r.startDate
  form.endDate = r.endDate
  form.incomeStartDate = r.incomeStartDate
  form.incomeEndDate = r.incomeEndDate
  form.country = r.country
  form.note = r.note ?? ''
  form.cities = r.cities.map((c) => ({ ...c }))
  formError.value = ''
  modalOpen.value = true
}

function submit() {
  formError.value = ''
  if (!form.startDate || !form.endDate) {
    formError.value = '请填写投资期起止日期'
    return
  }
  if (form.startDate > form.endDate) {
    formError.value = '投资期开始不应晚于结束'
    return
  }
  if (form.incomeStartDate && form.incomeEndDate && form.incomeStartDate > form.incomeEndDate) {
    formError.value = '收益期开始不应晚于结束'
    return
  }
  if (form.cities.length === 0) {
    formError.value = '请至少添加一座参与投资的城市'
    return
  }

  const payload: CityRecord = {
    id: editingId.value ?? genId(),
    startDate: form.startDate,
    endDate: form.endDate,
    incomeStartDate: form.incomeStartDate || addDays(form.endDate, 1),
    incomeEndDate: form.incomeEndDate || addDays(form.endDate, 6),
    country: form.country,
    note: form.note.trim(),
    cities: form.cities.map((c) => ({ ...c })),
  }

  if (editingId.value) {
    const idx = records.value.findIndex((x) => x.id === editingId.value)
    if (idx >= 0) records.value[idx] = payload
  } else {
    records.value.push(payload)
  }

  records.value.sort((a, b) => a.startDate.localeCompare(b.startDate))
  lastCountry.value = form.country
  persist()
  modalOpen.value = false
}

/* ─── 删除确认弹窗 ─── */
const delModalOpen = ref(false)
const pendingDel = ref<CityRecord | null>(null)
function confirmDel(r: CityRecord) {
  pendingDel.value = r
  delModalOpen.value = true
}
function cancelDel() {
  delModalOpen.value = false
  pendingDel.value = null
}
function doDel() {
  const r = pendingDel.value
  if (!r) {
    delModalOpen.value = false
    return
  }
  const idx = records.value.findIndex((x) => x.id === r.id)
  if (idx >= 0) records.value.splice(idx, 1)
  persist()
  delModalOpen.value = false
  pendingDel.value = null
}
</script>

<style scoped>
.page {
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
}
.container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── 规则卡 ── */
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
.rule-card.free {
  border-top-color: #d8c995;
}
.rule-card-head {
  font-size: 13px;
  font-weight: 800;
  margin-bottom: 8px;
}
.rule-card-head.free-head {
  color: #9a835a;
}
.rule-cities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.city-pill {
  font-size: 12px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 999px;
  background: #f5edc4;
  color: #725d42;
}
.city-pill.free-pill {
  background: #fff;
  border: 1.5px dashed #d8c995;
  color: #9a835a;
}
.rules-formulas {
  margin-top: 12px;
  padding: 10px 12px;
  background: #fff7d4;
  border: 1.5px dashed #f7cd67;
  border-radius: 12px;
  font-size: 12.5px;
  color: #6e5a3f;
  line-height: 1.9;
}
.rules-formulas .rules-hint {
  color: #a89572;
  font-size: 11px;
  margin-left: 4px;
}

/* ── 总览 ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
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
.stat-value.pos { color: #d97706; }
.stat-value.strong { color: #b56e3f; }

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
.empty {
  text-align: center;
  color: #a89572;
  padding: 22px 10px;
  font-style: italic;
  font-size: 13px;
}

/* ── 记录列表 ── */
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.rec-card {
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.rec-card.expanded {
  border-color: #f7cd67;
  box-shadow: 0 2px 0 rgba(247, 205, 103, 0.18);
}
.rec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  border-radius: 10px;
  outline: none;
  margin: -4px;
  padding: 4px;
  transition: background 0.15s;
}
.rec-head:hover { background: rgba(247, 205, 103, 0.08); }
.rec-head:focus-visible { box-shadow: 0 0 0 2px #f7cd67; }
.rec-card.expanded .rec-head { margin-bottom: 6px; }
.rec-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  font-size: 12px;
  font-weight: 800;
  color: #b56e3f;
  transition: transform 0.2s ease;
}
.rec-chevron.open { transform: rotate(90deg); }
.rec-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── 头部统一徽章（国家 / 投资时段 / 收益时段） ── */
.head-tag {
  display: inline-flex;
  align-items: stretch;
  height: 26px;
  border-radius: 999px;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 800;
  line-height: 1;
  border: 1.5px solid transparent;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}
.head-tag-label {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.4px;
  background: rgba(255, 255, 255, 0.92);
}
.head-tag-value {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
}

/* 国家：使用所属国颜色；右半实色文字白色 */
.head-tag.country {
  background: var(--tag-bg, #d97706);
  border-color: rgba(0, 0, 0, 0.06);
}
.head-tag.country .head-tag-label { color: #5d4a32; }
.head-tag.country .head-tag-value {
  color: #fff;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}

/* 投资时段：黄系 */
.head-tag.invest {
  background: #f7cd67;
  border-color: #e6b94c;
}
.head-tag.invest .head-tag-label { color: #8a5d10; }
.head-tag.invest .head-tag-value { color: #5d4a32; }

/* 收益时段：橙系 */
.head-tag.income {
  background: #f7b48a;
  border-color: #e89266;
}
.head-tag.income .head-tag-label { color: #8a4a1f; }
.head-tag.income .head-tag-value { color: #5d4a32; }
.head-tag-hint {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  padding: 1px 7px;
  background: rgba(255, 255, 255, 0.85);
  color: #8a4a1f;
  font-size: 10.5px;
  font-weight: 800;
  border-radius: 999px;
  letter-spacing: 0.2px;
}

.country-tag {
  display: none; /* 已被 .head-tag.country 取代，保留类避免外部样式报错 */
}
.rec-note {
  font-size: 12px;
  color: #9a835a;
  font-weight: 700;
}
.rec-ops {
  display: flex;
  gap: 6px;
}
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

/* ── 折叠时的核心数据预览 ── */
.rec-preview {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 8px 14px;
  background: linear-gradient(180deg, #fffaf0 0%, #fff7d4 100%);
  border: 1.5px dashed #e7dcb1;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.rec-preview:hover {
  border-color: #f7cd67;
  background: linear-gradient(180deg, #fff7d4 0%, #fde9b6 100%);
}
.prev-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.prev-item.highlight {
  background: #fff;
  padding: 2px 10px;
  border-radius: 999px;
  border: 1.5px solid #f7b48a;
}
.prev-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #9a835a;
}
.prev-value {
  font-size: 14.5px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.2px;
}
.prev-value.pos { color: #d97706; }
.prev-value.strong { color: #b56e3f; font-size: 16px; }
.prev-divider {
  width: 1px;
  height: 16px;
  background: #e7dcb1;
}
.prev-expand {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 800;
  color: #b56e3f;
  letter-spacing: 0.4px;
}

/* ── 表格 ── */
.table-scroll {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid #e7dcb1;
}
.rec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #5d4a32;
}
.rec-table th,
.rec-table td {
  padding: 6px 10px;
  text-align: center;
  border-bottom: 1px dashed #e7dcb1;
  white-space: nowrap;
}
.rec-table th {
  background: #f5edc4;
  font-weight: 800;
  color: #725d42;
}
.rec-table th.grp { background: #efe49a; }
.rec-table th.grp-output { background: #f5edc4; }
.rec-table th.grp-invest { background: #fdebc4; }
.rec-table th.grp-return { background: #fcdcb6; }
.rec-table th.grp-ratio  { background: #f9c8c4; }
.rec-table th.sub { background: #fff7d4; font-size: 11.5px; }
.rec-table tbody tr:hover { background: #fff8de; }

/* ── 表格下方的本周汇总 ── */
.rec-summary {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.sum-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  text-align: center;
}
.sum-chip.highlight {
  background: #fff7d4;
  border-color: #f7cd67;
  border-style: solid;
  box-shadow: inset 0 0 0 1px rgba(247, 205, 103, 0.35);
}
.sum-chip-label {
  font-size: 11px;
  font-weight: 800;
  color: #9a835a;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}
.sum-chip-hint {
  font-size: 10px;
  font-weight: 700;
  color: #c0a878;
}
.sum-chip-value {
  font-size: 18px;
  font-weight: 800;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.sum-chip-value.pos { color: #d97706; }
.sum-chip-value.strong { color: #b56e3f; font-size: 20px; }

.city-cell {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 12px;
}
.city-cell.owner-shu { background: #d4ebd4; color: #2f6c2f; }
.city-cell.owner-wei { background: #d6dcf4; color: #3a4593; }
.city-cell.owner-wu  { background: #f7d8c4; color: #9b4a1f; }
.city-cell.owner-free { background: #f0e8c4; color: #6e5a3f; }

.pos { color: #d97706; font-weight: 700; }
.strong { color: #b56e3f; font-weight: 800; }

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

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 10px;
}

.select {
  width: 100%;
  height: 36px;
  padding: 0 10px;
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #5d4a32;
  border-radius: 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  outline: none;
  cursor: pointer;
}
.select:focus { border-color: #f7cd67; }

/* ── 城市选择器 ── */
.city-picker {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #e7dcb1;
}
.picker-line {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.picker-label {
  font-size: 11.5px;
  font-weight: 800;
  color: #5d4a32;
  width: 70px;
  flex-shrink: 0;
}
.picker-label.free { color: #9a835a; }
.picker-btn {
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.picker-btn:hover:not(:disabled) {
  background: #fff8de;
  border-color: #f7cd67;
}
.picker-btn.added,
.picker-btn:disabled {
  background: #f0e8c4;
  color: #a89572;
  cursor: not-allowed;
  opacity: 0.65;
}
.picker-btn.free {
  border-style: dashed;
}

.empty-cities {
  text-align: center;
  padding: 16px;
  color: #a89572;
  font-style: italic;
  font-size: 12.5px;
}

/* ── 城市卡片 ── */
.city-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.city-card {
  background: #fff;
  border: 1.5px solid #e7dcb1;
  border-left-width: 4px;
  border-radius: 12px;
  padding: 8px 12px 10px;
}
.city-card.owner-shu { border-left-color: #8ac68a; }
.city-card.owner-wei { border-left-color: #889df0; }
.city-card.owner-wu  { border-left-color: #e59266; }
.city-card.owner-free { border-left-color: #d8c995; }
.city-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.city-name {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
  display: flex;
  align-items: center;
  gap: 8px;
}
.owner-tag {
  font-size: 11px;
  font-weight: 700;
  color: #9a835a;
  background: #f5edc4;
  padding: 1px 8px;
  border-radius: 999px;
}
.remove-btn {
  border: 1.5px solid #fac9c5;
  background: #fff;
  color: #fc736d;
  font-size: 12px;
  font-weight: 800;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}
.remove-btn:hover { background: #fde9e7; }

.city-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.city-result {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  background: #fff7d4;
  border: 1.5px dashed #f7cd67;
  border-radius: 10px;
  padding: 8px;
}
.res-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 11px;
  color: #9a835a;
  font-weight: 700;
  text-align: center;
}
.res-row b {
  margin-top: 2px;
  font-size: 13px;
  color: #5d4a32;
}
.res-row.strong { color: #b56e3f; }

/* ── 汇总 ── */
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
.sum-num { font-size: 16px; color: #5d4a32; }

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

/* ── 删除确认弹窗 ── */
.confirm-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 6px 4px 2px;
}
.confirm-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffe2dd 0%, #fac9c5 100%);
  border: 2px solid #fac9c5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 0 rgba(252, 115, 109, 0.18);
}
.confirm-icon span {
  font-size: 30px;
  font-weight: 900;
  color: #fc736d;
  line-height: 1;
  font-family: 'Georgia', serif;
}
.confirm-text {
  width: 100%;
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: #5d4a32;
  line-height: 1.6;
}
.confirm-target {
  margin-top: 4px;
}
.confirm-tip {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: #b56e3f;
  letter-spacing: 0.3px;
}
.confirm-meta {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fffaf0;
  border: 1.5px dashed #e7dcb1;
  border-radius: 10px;
  font-variant-numeric: tabular-nums;
}
.confirm-meta-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: var(--tag-bg, #d97706);
  letter-spacing: 0.5px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.12);
}
.confirm-meta-range {
  font-size: 13.5px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.3px;
}
.confirm-actions {
  width: 100%;
  margin-top: 6px;
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .rule-grid { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr; }
  .city-grid { grid-template-columns: 1fr 1fr; }
  .city-result { grid-template-columns: repeat(2, 1fr); }
  .rec-summary { grid-template-columns: repeat(2, 1fr); }
  .head-tag { font-size: 12px; height: 24px; }
  .head-tag-label { padding: 0 8px; }
  .head-tag-value { padding: 0 10px; }
  .prev-divider { display: none; }
  .prev-expand { margin-left: 0; }
}
</style>
