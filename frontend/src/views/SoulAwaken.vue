<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-orange">开灵属性 · 概率与激活数</Card>

      <!-- 装备类型 Tab -->
      <Card v-if="categoryItems.length">
        <Tabs v-model="currentCat" :items="categoryItems">
          <template
            v-for="cat in categories"
            :key="cat.key"
            #[cat.key]
          >
            <!-- 品质切换 -->
            <div class="quality-tabs">
              <button
                v-for="q in qualities"
                :key="q.key"
                class="q-tab"
                :class="[q.key, { active: currentQuality === q.key }]"
                @click="currentQuality = q.key"
              >
                {{ q.label }}
              </button>
            </div>

            <Divider type="line-yellow" />

            <!-- 属性表 -->
            <div class="attr-table">
              <div class="attr-head">
                <div class="col col-desc">属性描述</div>
                <div class="col col-rate">概率</div>
                <div class="col col-need">激活数</div>
              </div>

              <div v-if="getList(cat.key).length === 0" class="attr-empty">
                🌾 暂无数据
              </div>

              <div
                v-for="(row, idx) in getList(cat.key)"
                :key="idx"
                class="attr-row"
              >
                <div class="col col-desc" v-html="highlight(row.desc)"></div>
                <div class="col col-rate">{{ row.rate }}</div>
                <div class="col col-need">{{ row.need }}</div>
              </div>
            </div>
          </template>
        </Tabs>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Card, Tabs, Divider } from 'animal-island-vue'
import { GetSoulAwaken } from '../../wailsjs/go/backend/App'
import { useDataReload } from '@/logic/useDataReload'

interface CategoryDef { key: string; label: string }
interface QualityDef  { key: string; label: string }
interface AttrRow     { desc: string; rate: string; need: number }

const categories = ref<CategoryDef[]>([])
const qualities  = ref<QualityDef[]>([])
const attributes = ref<Record<string, Record<string, AttrRow[]>>>({})

const currentCat     = ref<string>('liren')
const currentQuality = ref<string>('purple')

async function loadData() {
  try {
    const data = await GetSoulAwaken()
    if (data) {
      categories.value = data.categories ?? []
      qualities.value  = data.qualities ?? []
      attributes.value = (data.attributes ?? {}) as any
      if (categories.value.length && !categories.value.some((c) => c.key === currentCat.value)) {
        currentCat.value = categories.value[0].key
      }
      if (qualities.value.length && !qualities.value.some((q) => q.key === currentQuality.value)) {
        currentQuality.value = qualities.value[0].key
      }
    }
  } catch (e) {
    console.error('加载开灵属性数据失败:', e)
  }
}

useDataReload(loadData)

const categoryItems = computed(() =>
  categories.value.map((c) => ({ key: c.key, label: c.label })),
)

function getList(catKey: string): AttrRow[] {
  return attributes.value?.[catKey]?.[currentQuality.value] ?? []
}

function highlight(text: string): string {
  if (!text) return ''
  return text.replace(/(\d+(?:\.\d+)?%?)/g, '<span class="hl-num">$1</span>')
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

/* 品质 Tab */
.quality-tabs {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 4px;
}

.q-tab {
  height: 40px;
  border-radius: 999px;
  border: 2px solid #e7dcb1;
  background: #fffdf3;
  font-size: 14px;
  font-weight: 800;
  color: #6e5a3f;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 3px 0 #e0d293;
}

.q-tab:hover {
  transform: translateY(-1px);
}

.q-tab.purple.active {
  background: linear-gradient(135deg, #b77dee, #a855f7);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #6c4fa0;
}

.q-tab.blue.active {
  background: linear-gradient(135deg, #889df0, #60a5fa);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #4d5fb5;
}

/* 表格 */
.attr-table {
  background: #fffdf3;
  border-radius: 12px;
  border: 1.5px solid #e7dcb1;
  overflow: hidden;
}

.attr-head,
.attr-row {
  display: grid;
  grid-template-columns: 1fr 90px 70px;
  align-items: center;
  padding: 12px 14px;
  font-size: 13px;
}

.attr-head {
  background: #f7eecb;
  color: #725d42;
  font-weight: 800;
  border-bottom: 1.5px dashed #d8c995;
}

.attr-row {
  border-bottom: 1px dashed #ece1b6;
  color: #5d4a32;
  min-height: 56px;
}

.attr-row:last-child {
  border-bottom: 0;
}

.attr-row:nth-child(even) {
  background: #fcf8e6;
}

.col-rate {
  text-align: center;
  color: #889df0;
  font-weight: 800;
}

.col-need {
  text-align: center;
  color: #5d4a32;
  font-weight: 700;
}

.attr-empty {
  padding: 32px 14px;
  text-align: center;
  color: #b8a26e;
  font-size: 14px;
}

:deep(.hl-num) {
  color: #fc736d;
  font-weight: 800;
}
</style>
