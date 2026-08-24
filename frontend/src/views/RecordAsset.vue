<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-yellow">资产 · 装备价格记录</Card>

      <!-- 1. 总览 -->
      <Card>
        <div class="stats-grid">
          <div class="stat">
            <div class="stat-label">装备数量</div>
            <div class="stat-value">{{ totals.count }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">当前总资产 · RMB</div>
            <div class="stat-value pos">{{ fmtRmb(totals.nowRmb) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">当前总资产 · 三国币</div>
            <div class="stat-value strong">{{ fmtCoin(totals.nowCoin) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">累计购入成本 · RMB</div>
            <div class="stat-value">{{ fmtRmb(totals.costRmb) }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">总涨跌 · RMB</div>
            <div
              class="stat-value"
              :class="totals.deltaRmb >= 0 ? 'up' : 'down'"
            >
              {{ fmtRmb(totals.deltaRmb) }}
              <span class="stat-sub">{{ fmtPctSigned(totals.deltaPct) }}</span>
            </div>
          </div>
          <div class="stat">
            <div class="stat-label" title="币价单位：元 / 亿三国币">最近币价</div>
            <div class="stat-value">
              {{ lastCoinPrice ? fmtDec(lastCoinPrice) : '—' }}
              <span class="stat-sub">元/亿</span>
            </div>
          </div>
        </div>
      </Card>

      <!-- 2. 趋势图 -->
      <Card>
        <div class="card-head">
          <span class="card-title">📈 资产走势</span>
          <div class="unit-switch">
            <button
              class="unit-btn"
              :class="{ active: unit === 'rmb' }"
              @click="unit = 'rmb'"
            >RMB</button>
            <button
              class="unit-btn"
              :class="{ active: unit === 'coin' }"
              @click="unit = 'coin'"
            >三国币</button>
          </div>
        </div>
        <AssetTrendChart :records="records" :unit="unit" />
      </Card>

      <!-- 3. 装备列表 -->
      <Card>
        <div class="card-head">
          <span class="card-title">🗡️ 装备清单</span>
          <Button type="primary" size="small" @click="openAdd">＋ 添加装备</Button>
        </div>

        <div v-if="records.length === 0" class="empty">
          尚无装备，点击右上角"＋ 添加装备"开始记录
        </div>

        <div v-else class="rec-list">
          <div
            v-for="r in recordsSorted"
            :key="r.id"
            class="rec-card"
            :class="{ expanded: isExpanded(r.id) }"
          >
            <div
              class="rec-head"
              role="button"
              tabindex="0"
              @click="toggleExpand(r.id)"
              @keydown.enter.prevent="toggleExpand(r.id)"
              @keydown.space.prevent="toggleExpand(r.id)"
            >
              <div class="rec-title">
                <span class="rec-chevron" :class="{ open: isExpanded(r.id) }">▸</span>
                <span class="asset-name">{{ r.name || '未命名装备' }}</span>
                <span v-if="r.note" class="rec-note">📝 {{ r.note }}</span>
              </div>
              <div class="rec-ops" @click.stop>
                <button class="op-btn" @click="openEdit(r)">编辑</button>
                <button class="op-btn danger" @click="confirmDel(r)">删除</button>
              </div>
            </div>

            <!-- 折叠预览 -->
            <div v-if="!isExpanded(r.id)" class="rec-preview" @click="toggleExpand(r.id)">
              <div class="prev-item">
                <span class="prev-label">购入</span>
                <span class="prev-value">{{ fmtRmb(mOf(r).buyRmb) }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">当前</span>
                <span class="prev-value pos">{{ fmtRmb(mOf(r).nowRmb) }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item highlight">
                <span class="prev-label">涨跌</span>
                <span
                  class="prev-value strong"
                  :class="mOf(r).deltaRmb >= 0 ? 'up' : 'down'"
                >{{ fmtPctSigned(mOf(r).deltaPct) }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">估值次数</span>
                <span class="prev-value">{{ r.entries.length }}</span>
              </div>
              <span class="prev-expand">展开明细 ▾</span>
            </div>

            <!-- 展开明细 -->
            <template v-if="isExpanded(r.id)">
              <div class="table-scroll">
                <table class="rec-table">
                  <thead>
                    <tr>
                      <th>日期</th>
                      <th>录入方式</th>
                      <th>三国币</th>
                      <th>币价(元/亿)</th>
                      <th>RMB</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(e, i) in r.entries" :key="e.id">
                      <td>
                        {{ e.date }}
                        <span v-if="i === 0" class="buy-tag">购入</span>
                      </td>
                      <td>
                        <span class="mode-cell" :class="'mode-' + e.mode">
                          {{ e.mode === 'coin' ? '三国币+币价' : '人民币' }}
                        </span>
                      </td>
                      <td>{{ fmtCoin(entryCoin(e)) }}</td>
                      <td>{{ e.coinPrice ? fmtDec(e.coinPrice) : '—' }}</td>
                      <td class="pos">{{ fmtRmb(entryRmb(e)) }}</td>
                      <td class="note-cell">{{ e.note || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="rec-actions">
                <Button size="small" @click="openEdit(r)">＋ 追加估值 / 编辑</Button>
              </div>
            </template>
          </div>
        </div>
      </Card>
    </div>

    <!-- 4. 添加 / 编辑 弹窗 -->
    <Modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑装备' : '添加装备'"
      :typewriter="false"
      :show-footer="false"
      width="760px"
    >
      <div class="form">
        <div class="form-section">
          <div class="section-title">基本信息</div>
          <div class="grid-2">
            <Field label="装备名称">
              <Input v-model="form.name" placeholder="例如：倚天剑 / 赤兔马 等" />
            </Field>
            <Field label="备注">
              <Input v-model="form.note" placeholder="可选，例如：来源 / 品质 等" />
            </Field>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">
            价格记录
            <span class="section-hint">
              共 <b>{{ form.entries.length }}</b> 条 · 首条为购入价
            </span>
          </div>

          <div v-if="form.entries.length === 0" class="empty-entries">
            还没有价格记录，点击下方"＋ 添加一条价格记录"
          </div>

          <div v-else class="entry-cards">
            <div
              v-for="(e, idx) in form.entries"
              :key="e.id"
              class="entry-card"
            >
              <div class="entry-head">
                <span class="entry-idx">
                  {{ idx === 0 ? '购入价' : '估值 ' + idx }}
                </span>
                <div class="mode-toggle">
                  <button
                    class="mode-btn"
                    :class="{ active: e.mode === 'coin' }"
                    @click="setMode(e, 'coin')"
                  >三国币 + 币价</button>
                  <button
                    class="mode-btn"
                    :class="{ active: e.mode === 'rmb' }"
                    @click="setMode(e, 'rmb')"
                  >人民币</button>
                </div>
                <button
                  v-if="form.entries.length > 1"
                  class="remove-btn"
                  title="移除"
                  @click="removeEntry(idx)"
                >✕</button>
              </div>

              <div class="entry-grid">
                <Field label="日期">
                  <Input v-model="e.date" type="date" />
                </Field>

                <template v-if="e.mode === 'coin'">
                  <Field label="三国币数量">
                    <NumberInput v-model="e.coinAmount" :min="0" suffix="币" />
                  </Field>
                  <Field label="币价（元/亿）">
                    <NumberInput v-model="e.coinPrice" :min="0" suffix="元/亿" />
                  </Field>
                </template>
                <template v-else>
                  <Field label="人民币">
                    <NumberInput v-model="e.rmb" :min="0" suffix="元" />
                  </Field>
                  <Field label="当时币价（元/亿）">
                    <NumberInput v-model="e.coinPrice" :min="0" suffix="元/亿" />
                  </Field>
                </template>

                <Field label="备注">
                  <Input v-model="e.note" placeholder="可选" />
                </Field>
              </div>

              <div class="entry-result">
                <div class="res-row">
                  <span>折合人民币</span>
                  <b class="pos">{{ fmtRmb(entryRmb(e)) }}</b>
                </div>
                <div class="res-row">
                  <span>折合三国币</span>
                  <b class="strong">{{ fmtCoin(entryCoin(e)) }}</b>
                </div>
              </div>
            </div>
          </div>

          <button class="add-entry-btn" @click="addEntry">＋ 添加一条价格记录</button>
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
        <div class="confirm-icon"><span>!</span></div>
        <div class="confirm-text">
          确定删除这件装备吗？
          <div class="confirm-target">
            <span class="confirm-tip">删除后无法恢复</span>
          </div>
          <div v-if="pendingDel" class="confirm-meta">
            <span class="confirm-meta-name">{{ pendingDel.name || '未命名装备' }}</span>
            <span class="confirm-meta-range">
              {{ pendingDel.entries.length }} 条价格记录
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
import AssetTrendChart from '@/components/AssetTrendChart.vue'
import {
  type AssetRecord,
  type PriceEntry,
  type PriceMode,
  type Unit,
  assetMetrics,
  assetTotals,
  entryRmb,
  entryCoin,
  emptyEntry,
  loadStore,
  saveStore,
  genId,
  todayStr,
  fmtRmb,
  fmtCoin,
  fmtDec,
  fmtPctSigned,
} from '@/logic/asset'
import { activeAccountId } from '@/logic/account'

/* ─── 数据（按账户隔离） ─── */
const records = ref<AssetRecord[]>([])
const lastCoinPrice = ref<number>(0)
const unit = ref<Unit>('rmb')

function reloadFromStore() {
  const s = loadStore()
  records.value = s.records
  lastCoinPrice.value = s.lastCoinPrice ?? 0
}
reloadFromStore()

watch(activeAccountId, () => {
  modalOpen.value = false
  delModalOpen.value = false
  formError.value = ''
  pendingDel.value = null
  expandedIds.value = new Set()
  reloadFromStore()
})

function persist() {
  saveStore({ records: records.value, lastCoinPrice: lastCoinPrice.value || undefined })
}

/* ─── 派生 ─── */
const recordsSorted = computed(() =>
  [...records.value].sort((a, b) => b.createdAt - a.createdAt),
)
const totals = computed(() => assetTotals(records.value))

function mOf(r: AssetRecord) {
  return assetMetrics(r)
}

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

/* ─── 弹窗 / 表单 ─── */
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

interface FormState {
  name: string
  note: string
  entries: PriceEntry[]
}
const form = reactive<FormState>({
  name: '',
  note: '',
  entries: [],
})

function setMode(e: PriceEntry, mode: PriceMode) {
  e.mode = mode
}
function addEntry() {
  form.entries.push(emptyEntry('coin', lastCoinPrice.value || 0))
}
function removeEntry(idx: number) {
  form.entries.splice(idx, 1)
}

function resetForm() {
  form.name = ''
  form.note = ''
  form.entries = [emptyEntry('coin', lastCoinPrice.value || 0)]
  formError.value = ''
}

function openAdd() {
  editingId.value = null
  resetForm()
  modalOpen.value = true
}

function openEdit(r: AssetRecord) {
  editingId.value = r.id
  form.name = r.name
  form.note = r.note ?? ''
  form.entries = r.entries.map((e) => ({ ...e }))
  if (form.entries.length === 0) {
    form.entries = [emptyEntry('coin', lastCoinPrice.value || 0)]
  }
  formError.value = ''
  modalOpen.value = true
}

function validateEntry(e: PriceEntry): string {
  if (!e.date) return '每条价格记录都需要填写日期'
  if (e.mode === 'coin') {
    if (!(e.coinAmount > 0)) return '三国币数量需大于 0'
    if (!(e.coinPrice > 0)) return '币价需大于 0'
  } else {
    if (!(e.rmb > 0)) return '人民币金额需大于 0'
    if (!(e.coinPrice > 0)) return '需填写当时币价（用于折算三国币）'
  }
  return ''
}

function submit() {
  formError.value = ''
  const name = form.name.trim()
  if (!name) {
    formError.value = '请填写装备名称'
    return
  }
  if (form.entries.length === 0) {
    formError.value = '请至少添加一条价格记录'
    return
  }
  for (const e of form.entries) {
    const err = validateEntry(e)
    if (err) {
      formError.value = err
      return
    }
  }

  const entries = form.entries
    .map((e) => ({ ...e }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const existing = editingId.value
    ? records.value.find((x) => x.id === editingId.value)
    : null

  const payload: AssetRecord = {
    id: editingId.value ?? genId(),
    name,
    note: form.note.trim(),
    createdAt: existing?.createdAt ?? Date.now(),
    entries,
  }

  if (editingId.value && existing) {
    const idx = records.value.findIndex((x) => x.id === editingId.value)
    if (idx >= 0) records.value[idx] = payload
  } else {
    records.value.push(payload)
  }

  // 记住最近使用的币价（取最新日期记录的币价）
  const latest = entries[entries.length - 1]
  if (latest && latest.coinPrice > 0) lastCoinPrice.value = latest.coinPrice

  persist()
  modalOpen.value = false
}

/* ─── 删除确认 ─── */
const delModalOpen = ref(false)
const pendingDel = ref<AssetRecord | null>(null)
function confirmDel(r: AssetRecord) {
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
  expandedIds.value.delete(r.id)
  persist()
  delModalOpen.value = false
  pendingDel.value = null
}

// 抑制未使用告警（todayStr 供工具链引用）
void todayStr
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
  font-size: 17px;
  font-weight: 800;
  color: #5d4a32;
}
.stat-value.pos { color: #d97706; }
.stat-value.strong { color: #b56e3f; }
.stat-value.up { color: #d97706; }
.stat-value.down { color: #fc736d; }
.stat-sub {
  display: block;
  font-size: 10.5px;
  font-weight: 700;
  color: #a89572;
  margin-top: 1px;
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

/* 单位切换 */
.unit-switch {
  display: inline-flex;
  background: #f5edc4;
  border-radius: 999px;
  padding: 2px;
  gap: 2px;
}
.unit-btn {
  border: none;
  background: transparent;
  color: #9a835a;
  font-size: 12px;
  font-weight: 800;
  padding: 4px 14px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.unit-btn.active {
  background: #f7cd67;
  color: #5d4a32;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
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
  gap: 10px;
  flex-wrap: wrap;
}
.asset-name {
  font-size: 15px;
  font-weight: 800;
  color: #5d4a32;
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

/* 折叠预览 */
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
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.2px;
}
.prev-value.pos { color: #d97706; }
.prev-value.strong { font-size: 15px; }
.prev-value.up { color: #d97706; }
.prev-value.down { color: #fc736d; }
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

/* 表格 */
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
.rec-table tbody tr:hover { background: #fff8de; }
.buy-tag {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: #f7cd67;
  color: #5d4a32;
  font-size: 10px;
  font-weight: 800;
}
.mode-cell {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 800;
  font-size: 11px;
}
.mode-cell.mode-coin { background: #d6dcf4; color: #3a4593; }
.mode-cell.mode-rmb { background: #f7d8c4; color: #9b4a1f; }
.note-cell { color: #9a835a; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }

.rec-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

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

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.empty-entries {
  text-align: center;
  padding: 16px;
  color: #a89572;
  font-style: italic;
  font-size: 12.5px;
}

/* 价格记录卡片 */
.entry-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.entry-card {
  background: #fff;
  border: 1.5px solid #e7dcb1;
  border-left-width: 4px;
  border-left-color: #f7cd67;
  border-radius: 12px;
  padding: 8px 12px 10px;
}
.entry-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.entry-idx {
  font-size: 13px;
  font-weight: 800;
  color: #5d4a32;
}
.mode-toggle {
  display: inline-flex;
  background: #f5edc4;
  border-radius: 999px;
  padding: 2px;
  gap: 2px;
}
.mode-btn {
  border: none;
  background: transparent;
  color: #9a835a;
  font-size: 11.5px;
  font-weight: 800;
  padding: 3px 12px;
  border-radius: 999px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.mode-btn.active {
  background: #f7cd67;
  color: #5d4a32;
}
.remove-btn {
  margin-left: auto;
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

.entry-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}
.entry-result {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
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
  font-size: 14px;
  color: #5d4a32;
}

.add-entry-btn {
  margin-top: 10px;
  width: 100%;
  border: 1.5px dashed #f7cd67;
  background: #fffaf0;
  color: #b56e3f;
  font-size: 12.5px;
  font-weight: 800;
  padding: 8px;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.add-entry-btn:hover { background: #fff3d6; }

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

/* 删除确认 */
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
.confirm-target { margin-top: 4px; }
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
}
.confirm-meta-name {
  font-size: 13.5px;
  font-weight: 800;
  color: #5d4a32;
}
.confirm-meta-range {
  font-size: 12px;
  font-weight: 700;
  color: #9a835a;
}
.confirm-actions {
  width: 100%;
  margin-top: 6px;
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .grid-2 { grid-template-columns: 1fr; }
  .entry-grid { grid-template-columns: 1fr 1fr; }
  .prev-divider { display: none; }
  .prev-expand { margin-left: 0; }
}
</style>
