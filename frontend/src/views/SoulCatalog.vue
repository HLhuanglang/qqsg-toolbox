<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-blue">灵魂图鉴</Card>

      <!-- 搜索 -->
      <Input
        v-model="search"
        placeholder="搜索灵魂名称或拼音首字母"
        size="large"
        allow-clear
      >
        <template #prefix>
          <span class="search-icon">🔍</span>
        </template>
      </Input>

      <!-- 分类 Tab -->
      <Card>
        <Tabs v-if="categories.length" v-model="currentCat" :items="categoryItems">
          <template
            v-for="cat in categories"
            :key="cat.key"
            #[cat.key]
          >
            <!-- 适用部位 -->
            <div class="slot-bar">
              <span class="slot-icon">ℹ️</span>
              <span class="slot-text">
                适用部位：{{ (cat?.slots ?? []).join('、') }}
              </span>
            </div>

            <!-- 灵魂列表 -->
            <div class="soul-list">
              <Card
                v-for="soul in filterSouls(cat.key)"
                :key="soul.name"
                class="soul-card"
              >
                <div class="soul-header" @click="toggleSoul(soul.name)">
                  <div class="soul-title-row">
                    <span class="soul-bar"></span>
                    <span class="soul-name">{{ soul.name }}</span>
                    <span class="soul-arrow">{{ expandedSouls[soul.name] ? '▲' : '▼' }}</span>
                  </div>
                  <div class="soul-desc">{{ soul.desc }}</div>
                </div>

                <div v-if="expandedSouls[soul.name]" class="soul-detail">
                  <Divider type="line-yellow" />
                  <!-- 绿色 -->
                  <div v-if="soul.effects?.green?.base" class="detail-block green">
                    <div class="detail-row">
                      <div class="detail-head">
                        <span class="tag green-tag">绿</span>
                        <span class="stage">1阶</span>
                      </div>
                      <div class="detail-effect" v-html="highlightEffect(soul.effects.green.base)"></div>
                    </div>
                  </div>

                  <!-- 蓝色 -->
                  <div v-if="hasAny(soul.effects?.blue)" class="detail-block blue">
                    <div v-if="soul.effects?.blue?.base" class="detail-row">
                      <div class="detail-head">
                        <span class="tag blue-tag">蓝</span>
                        <span class="stage">1阶</span>
                      </div>
                      <div class="detail-effect" v-html="highlightEffect(soul.effects.blue.base)"></div>
                    </div>
                    <div v-if="soul.effects?.blue?.adv20" class="detail-row">
                      <div class="detail-head">
                        <span v-if="!soul.effects?.blue?.base" class="tag blue-tag">蓝</span>
                        <span v-else class="tag tag-placeholder" aria-hidden="true"></span>
                        <span class="stage">2阶</span>
                      </div>
                      <div class="detail-effect" v-html="highlightEffect(soul.effects.blue.adv20)"></div>
                    </div>
                  </div>

                  <!-- 紫色 -->
                  <div v-if="hasAny(soul.effects?.purple)" class="detail-block purple">
                    <div v-if="soul.effects?.purple?.base" class="detail-row">
                      <div class="detail-head">
                        <span class="tag purple-tag">紫</span>
                        <span class="stage">1阶</span>
                      </div>
                      <div class="detail-effect" v-html="highlightEffect(soul.effects.purple.base)"></div>
                    </div>
                    <div v-if="soul.effects?.purple?.adv20" class="detail-row">
                      <div class="detail-head">
                        <span v-if="!soul.effects?.purple?.base" class="tag purple-tag">紫</span>
                        <span v-else class="tag tag-placeholder" aria-hidden="true"></span>
                        <span class="stage">2阶</span>
                      </div>
                      <div class="detail-effect" v-html="highlightEffect(soul.effects.purple.adv20)"></div>
                    </div>
                    <div v-if="soul.effects?.purple?.adv30" class="detail-row">
                      <div class="detail-head">
                        <span
                          v-if="!soul.effects?.purple?.base && !soul.effects?.purple?.adv20"
                          class="tag purple-tag"
                        >紫</span>
                        <span v-else class="tag tag-placeholder" aria-hidden="true"></span>
                        <span class="stage">3阶</span>
                      </div>
                      <div class="detail-effect" v-html="highlightEffect(soul.effects.purple.adv30)"></div>
                    </div>
                  </div>

                  <div
                    v-if="!soul.effects?.green?.base && !hasAny(soul.effects?.blue) && !hasAny(soul.effects?.purple)"
                    class="empty-hint"
                  >暂无数据</div>
                </div>
              </Card>

              <div v-if="filterSouls(cat.key).length === 0" class="empty-tip">
                🍂 暂无匹配的灵魂
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
import { Card, Input, Tabs, Divider } from 'animal-island-vue'
import { GetSoulCatalog } from '../../wailsjs/go/backend/App'
import { useDataReload } from '@/logic/useDataReload'

interface SoulEffectSet {
  base?: string
  adv20?: string
  adv30?: string
}

interface SoulData {
  name: string
  desc: string
  category: string
  effects?: {
    green?: { base?: string }
    blue?: SoulEffectSet
    purple?: SoulEffectSet
  }
}

interface CategoryDef {
  key: string
  label: string
  slots: string[]
}

const categories = ref<CategoryDef[]>([])
const SOUL_LIST = ref<SoulData[]>([])

async function loadCatalog() {
  try {
    const data = await GetSoulCatalog()
    if (data) {
      categories.value = data.categories ?? []
      SOUL_LIST.value = data.souls ?? []
      if (categories.value.length && !categories.value.some((c) => c.key === currentCat.value)) {
        currentCat.value = categories.value[0].key
      }
    }
  } catch (e) {
    console.error('加载灵魂图鉴数据失败:', e)
  }
}

useDataReload(loadCatalog)

const search = ref('')
const currentCat = ref('liren')
const expandedSouls = ref<Record<string, boolean>>({})

const categoryItems = computed(() =>
  categories.value.map((c) => ({ key: c.key, label: c.label })),
)

function filterSouls(catKey: string) {
  let list = SOUL_LIST.value.filter((s) => s.category === catKey)
  const q = search.value.trim().toLowerCase()
  if (q) {
    list = list.filter((s) => s.name.toLowerCase().includes(q))
  }
  return list
}

function toggleSoul(name: string) {
  expandedSouls.value[name] = !expandedSouls.value[name]
}

function hasAny(set: SoulEffectSet | undefined): boolean {
  if (!set) return false
  return !!(set.base || set.adv20 || set.adv30)
}

function highlightEffect(text: string | undefined): string {
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

.search-icon {
  color: #b8a26e;
}

/* 适用部位 */
.slot-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #e9f0ff;
  border: 1.5px dashed #889df0;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  color: #4855a8;
  font-weight: 600;
  margin-bottom: 12px;
}

/* 列表 */
.soul-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.soul-card {
  cursor: default;
}

.soul-header {
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.soul-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.soul-bar {
  width: 5px;
  height: 18px;
  background: linear-gradient(135deg, #f7cd67, #e59266);
  border-radius: 3px;
}

.soul-name {
  font-size: 16px;
  font-weight: 800;
  color: #5d4a32;
  flex: 1;
}

.soul-arrow {
  font-size: 11px;
  color: #b8a26e;
}

.soul-desc {
  font-size: 13px;
  color: #8a7654;
  padding-left: 15px;
}

/* 展开详情 */
.soul-detail {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 8px;
}

.detail-block {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  padding: 10px 14px;
  border: 1.5px solid;
}

.detail-block.green {
  background: #effbef;
  border-color: #8ac68a;
}

.detail-block.blue {
  background: #eef0fe;
  border-color: #889df0;
}

.detail-block.purple {
  background: #f5edff;
  border-color: #b77dee;
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
}

.detail-row:first-child {
  padding-top: 0;
}

.detail-row:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 80px;
  flex-shrink: 0;
}

.tag {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.tag-placeholder {
  background: transparent;
  visibility: hidden;
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

.stage {
  font-size: 12px;
  color: #8a7654;
  font-weight: 700;
  width: 50px;
  flex-shrink: 0;
}

.detail-effect {
  font-size: 13px;
  color: #5d4a32;
  line-height: 1.6;
  flex: 1;
}

.empty-hint {
  font-size: 13px;
  color: #b8a26e;
  text-align: center;
  padding: 8px 0;
}

.empty-tip {
  text-align: center;
  color: #a89572;
  padding: 32px 0;
  font-size: 14px;
}

:deep(.hl-num) {
  color: #fc736d;
  font-weight: 800;
}
</style>
