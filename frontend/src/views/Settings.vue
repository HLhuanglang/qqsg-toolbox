<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-green">设置</Card>

      <Card>
        <div class="row">
          <div class="row-main">
            <div class="row-title">主题色调</div>
            <div class="row-sub">当前固定为「动物岛 · 奶油沙滩」，更多主题敬请期待</div>
          </div>
          <div class="row-tail muted">动物岛风</div>
        </div>
      </Card>

      <Card>
        <div class="row">
          <div class="row-main">
            <div class="row-title">数据来源</div>
            <div class="row-sub">{{ dataSourceLabel }}</div>
          </div>
          <div class="row-tail">
            <button class="btn" @click="openDataViewer">查看</button>
          </div>
        </div>
        <div class="row">
          <div class="row-main">
            <div class="row-title">存档位置</div>
            <div class="row-sub" :title="storePath">
              {{ storePath || '尚未初始化' }}
            </div>
          </div>
          <div class="row-tail">
            <button class="btn" @click="openStoreViewer">查看</button>
          </div>
        </div>
        <div class="row">
          <div class="row-main">
            <div class="row-title">清空记录器数据</div>
            <div class="row-sub">删除所有账户、羽灵 / 八阵图 / 投城 等记录（无法恢复）</div>
          </div>
          <div class="row-tail">
            <button class="btn danger" @click="clearCache">清空</button>
          </div>
        </div>
      </Card>

      <Card>
        <div class="row">
          <div class="row-main">
            <div class="row-title">关于</div>
            <div class="row-sub">QQ 三国 · 日常工具箱 · v1.0.0</div>
          </div>
        </div>
      </Card>
    </div>

    <!-- ── 数据来源 · 文件浏览 ── -->
    <div v-if="viewerOpen" class="modal-mask" @click.self="closeDataViewer">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">数据来源 · 文件浏览</div>
          <button class="close-btn" @click="closeDataViewer">✕</button>
        </div>

        <div class="modal-meta">
          <span class="meta-tag" :class="{ disk: !isEmbedded, embed: isEmbedded }">
            {{ isEmbedded ? '嵌入资源' : '磁盘目录' }}
          </span>
          <span class="meta-path" :title="dataDir">{{ dataDir }}</span>
        </div>

        <div class="modal-body">
          <aside class="file-list">
            <div v-if="loadingList" class="empty">加载中…</div>
            <div v-else-if="files.length === 0" class="empty">未找到 JSON 文件</div>
            <button
              v-for="f in files"
              :key="f.path"
              class="file-item"
              :class="{ active: f.path === currentFile }"
              @click="selectFile(f.path)"
              :title="describeFile(f.path)"
            >
              <div class="file-row">
                <span class="file-name">{{ f.path }}</span>
                <span class="file-size">{{ formatSize(f.size) }}</span>
              </div>
              <div class="file-desc">{{ describeFile(f.path) }}</div>
            </button>
          </aside>

          <section class="file-content">
            <div v-if="!currentFile" class="empty pad">
              在左侧选择一个文件查看内容
            </div>
            <div v-else-if="loadingContent" class="empty pad">读取中…</div>
            <div v-else-if="contentError" class="empty pad error">
              读取失败：{{ contentError }}
            </div>
            <template v-else>
              <div class="content-desc">
                <span class="content-desc-icon">📖</span>
                <span class="content-desc-text">{{ describeFile(currentFile) }}</span>
              </div>
              <pre class="code"><code>{{ currentContent }}</code></pre>
            </template>
          </section>
        </div>
      </div>
    </div>

    <!-- ── 存档查看 ── -->
    <div v-if="storeViewerOpen" class="modal-mask" @click.self="closeStoreViewer">
      <div class="modal">
        <div class="modal-head">
          <div class="modal-title">存档位置 · 键值浏览</div>
          <button class="close-btn" @click="closeStoreViewer">✕</button>
        </div>

        <div class="modal-meta">
          <span class="meta-tag disk">本地存档</span>
          <span class="meta-path" :title="storePath">{{ storePath || '(未初始化)' }}</span>
        </div>

        <div class="modal-body">
          <aside class="file-list">
            <div v-if="storeKeys.length === 0" class="empty">暂无存档数据</div>
            <button
              v-for="k in storeKeys"
              :key="k.key"
              class="file-item"
              :class="{ active: k.key === currentStoreKey }"
              @click="selectStoreKey(k.key)"
              :title="describeStoreKey(k.key)"
            >
              <div class="file-row">
                <span class="file-name">{{ k.shortLabel }}</span>
                <span class="file-size">{{ formatSize(k.size) }}</span>
              </div>
              <div class="file-desc">{{ describeStoreKey(k.key) }}</div>
            </button>
          </aside>

          <section class="file-content">
            <div v-if="!currentStoreKey" class="empty pad">
              在左侧选择一个键查看内容
            </div>
            <template v-else>
              <div class="content-desc">
                <span class="content-desc-icon">🗝️</span>
                <span class="content-desc-text">
                  <code class="key-inline">{{ currentStoreKey }}</code>
                  · {{ describeStoreKey(currentStoreKey) }}
                </span>
              </div>
              <pre class="code"><code>{{ currentStoreContent }}</code></pre>
            </template>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Card } from 'animal-island-vue'
import {
  GetDataDir,
  ListDataFiles,
  ReadDataFile,
  KVStorePath,
} from '@/../wailsjs/go/backend/App'
import type { entity } from '@/../wailsjs/go/models'
import { storage } from '@/logic/kvStore'

const dataDir = ref<string>('')
const storePath = ref<string>('')
const isEmbedded = computed(() => dataDir.value === '(embedded)' || !dataDir.value)
const dataSourceLabel = computed(() => {
  if (!dataDir.value) return '本地 JSON · 离线可用'
  return isEmbedded.value
    ? '内置 JSON · 离线可用（嵌入资源）'
    : `本地 JSON · 离线可用（${dataDir.value}）`
})

onMounted(async () => {
  try {
    dataDir.value = await GetDataDir()
  } catch {
    dataDir.value = ''
  }
  try {
    storePath.value = await KVStorePath()
  } catch {
    storePath.value = ''
  }
})

// ── 模态状态 ──
const viewerOpen = ref(false)
const files = ref<entity.DataFileInfo[]>([])
const loadingList = ref(false)
const currentFile = ref<string>('')
const currentContent = ref<string>('')
const loadingContent = ref(false)
const contentError = ref<string>('')

async function openDataViewer() {
  viewerOpen.value = true
  if (files.value.length === 0) {
    loadingList.value = true
    try {
      const list = await ListDataFiles()
      files.value = (list || []).slice().sort((a, b) => a.path.localeCompare(b.path))
      // 默认打开第一个
      if (files.value.length > 0) {
        await selectFile(files.value[0].path)
      }
    } catch (e: any) {
      contentError.value = String(e?.message || e)
    } finally {
      loadingList.value = false
    }
  }
}

function closeDataViewer() {
  viewerOpen.value = false
}

async function selectFile(path: string) {
  if (currentFile.value === path && currentContent.value) return
  currentFile.value = path
  currentContent.value = ''
  contentError.value = ''
  loadingContent.value = true
  try {
    const text = await ReadDataFile(path)
    currentContent.value = prettify(text)
  } catch (e: any) {
    contentError.value = String(e?.message || e)
  } finally {
    loadingContent.value = false
  }
}

function prettify(text: string): string {
  if (!text) return ''
  try {
    return JSON.stringify(JSON.parse(text), null, 2)
  } catch {
    return text
  }
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

// ── 文件用途说明（按相对路径精确匹配，未命中走前缀兜底） ──
const FILE_DESCRIPTIONS: Record<string, string> = {
  'soul/soul_awaken.json': '开灵属性表：所有开灵的属性加成',
  'soul/soul_catalog.json': '灵魂图鉴：所有灵魂的分类、品质、属性等信息',
  'soul/soul_levels.json': '灵魂等级表：升级所需经验以及对应的绿灵数',
  'imtimate/imtimate.json': '亲密度数据：好友 / 师徒 / 结拜等关系的亲密度等级与加成',
}

const PREFIX_DESCRIPTIONS: { prefix: string; desc: string }[] = [
  { prefix: 'soul/', desc: '灵魂系统相关数据' },
  { prefix: 'imtimate/', desc: '亲密度系统相关数据' },
]

function describeFile(path: string): string {
  if (!path) return ''
  if (FILE_DESCRIPTIONS[path]) return FILE_DESCRIPTIONS[path]
  for (const { prefix, desc } of PREFIX_DESCRIPTIONS) {
    if (path.startsWith(prefix)) return desc
  }
  return '工具箱使用的本地 JSON 数据'
}

/* ─── 存档查看 ─── */

interface StoreKeyItem {
  key: string
  shortLabel: string
  size: number
}

const storeViewerOpen = ref(false)
const storeKeys = ref<StoreKeyItem[]>([])
const currentStoreKey = ref('')
const currentStoreContent = ref('')

/** 业务模块的 key 中文用途说明 */
const STORE_KEY_DESCRIPTIONS: { match: RegExp; desc: string }[] = [
  { match: /^qqsg\.accounts\.v1$/, desc: '账户列表与当前活跃账户' },
  { match: /^qqsg\.record\.yulin\.v1::/, desc: '羽灵记录器：每周培养与材料价格' },
  { match: /^qqsg\.record\.bazhentu\.v1::/, desc: '八阵图记录器（旧版快照格式）' },
  { match: /^qqsg\.record\.bazhentu\.v2::/, desc: '八阵图记录器：每周属性增量与战阵评分' },
  { match: /^qqsg\.record\.city\.v1::/, desc: '投城记录器：每周城市投资与产出' },
  { match: /^qqsg\.kv\.migrated\.v1$/, desc: '迁移标记（首次启动是否已把 localStorage 数据迁到本存档）' },
]

function describeStoreKey(key: string): string {
  if (!key) return ''
  for (const { match, desc } of STORE_KEY_DESCRIPTIONS) {
    if (match.test(key)) return desc
  }
  return '工具箱本地业务数据'
}

/** 把 ::accountId 后缀截短，便于在窄列表里展示 */
function shortenStoreKey(key: string): string {
  const idx = key.indexOf('::')
  if (idx < 0) return key
  const base = key.slice(0, idx)
  const acc = key.slice(idx + 2)
  const accShort = acc.length > 6 ? acc.slice(0, 4) + '…' + acc.slice(-2) : acc
  return `${base}::${accShort}`
}

function refreshStoreKeys(): void {
  const keys = storage.keys('qqsg.')
  const items: StoreKeyItem[] = keys
    .map((k) => ({
      key: k,
      shortLabel: shortenStoreKey(k),
      size: (storage.get(k) ?? '').length,
    }))
    .sort((a, b) => a.key.localeCompare(b.key))
  storeKeys.value = items
}

function openStoreViewer() {
  refreshStoreKeys()
  storeViewerOpen.value = true
  // 默认打开第一个
  if (storeKeys.value.length > 0) {
    selectStoreKey(storeKeys.value[0].key)
  }
}

function closeStoreViewer() {
  storeViewerOpen.value = false
}

function selectStoreKey(key: string) {
  currentStoreKey.value = key
  const raw = storage.get(key) ?? ''
  currentStoreContent.value = prettify(raw)
}

async function clearCache() {
  if (!confirm('将清空所有账户与记录器数据，此操作不可恢复。是否继续？')) return
  try {
    await storage.clearAll()
    try {
      sessionStorage.clear()
    } catch {
      /* ignore */
    }
    alert('已清空。应用将重新加载以应用更改。')
    location.reload()
  } catch (e) {
    alert('清理失败：' + e)
  }
}
</script>

<style scoped>
.page {
  padding: 18px 22px 28px;
}
.container {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 760px;
  margin: 0 auto;
}
.row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 4px;
}
.row + .row {
  border-top: 1.5px dashed #e7dcb1;
}
.row-main {
  flex: 1;
  min-width: 0;
}
.row-title {
  font-size: 14px;
  font-weight: 700;
  color: #5d4a32;
}
.row-sub {
  margin-top: 4px;
  font-size: 12px;
  color: #9a835a;
  word-break: break-all;
}
.row-tail {
  flex-shrink: 0;
  font-size: 13px;
  color: #6e5a3f;
}
.muted {
  color: #a89572;
}
.btn {
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 2px 0 #e0d293;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}
.btn:hover {
  background: #fff8de;
  transform: translateY(-1px);
}
.btn.danger {
  border-color: #e9b3a3;
  color: #b34a32;
  background: #fff5f0;
  box-shadow: 0 2px 0 #e9b3a3;
}
.btn.danger:hover {
  background: #ffe9dd;
}
.btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 #e0d293;
}

/* ── Modal ── */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(80, 60, 30, 0.35);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  backdrop-filter: blur(2px);
}
.modal {
  width: min(960px, 100%);
  height: min(640px, 100%);
  background: #fbf6e4;
  border: 2px solid #e0b94d;
  border-radius: 18px;
  box-shadow: 0 12px 32px -6px rgba(120, 90, 30, 0.35), 0 4px 0 #c9a93f;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 2px dashed #d8c995;
  background: #f7f3df;
}
.modal-title {
  font-size: 16px;
  font-weight: 800;
  color: #5d4a32;
  flex: 1;
}
.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 0 #e0d293;
  transition: transform 0.15s, background 0.15s;
}
.close-btn:hover {
  background: #fff8de;
  transform: translateY(-1px);
}

.modal-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1.5px dashed #e7dcb1;
  font-size: 12px;
  color: #6e5a3f;
}
.meta-tag {
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.4px;
  border: 1.5px solid transparent;
}
.meta-tag.disk {
  background: #d6f0c5;
  color: #4f7a2f;
  border-color: #b6d99b;
}
.meta-tag.embed {
  background: #ffe7ad;
  color: #8a6618;
  border-color: #f0c95a;
}
.meta-path {
  flex: 1;
  font-family: ui-monospace, Consolas, "Courier New", monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #8a7146;
}

.modal-body {
  flex: 1;
  display: flex;
  min-height: 0;
}
.file-list {
  width: 240px;
  flex-shrink: 0;
  border-right: 1.5px dashed #e7dcb1;
  overflow-y: auto;
  padding: 8px 6px;
  background: #f7f3df;
}
.file-item {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  text-align: left;
  padding: 8px 10px;
  margin: 3px 0;
  border-radius: 10px;
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 2px 0 #e0d293;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}
.file-item:hover {
  background: #fff8de;
  transform: translateY(-1px);
}
.file-item.active {
  background: linear-gradient(135deg, #f7cd67, #e59266);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #b56e3f;
}
.file-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}
.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ui-monospace, Consolas, "Courier New", monospace;
}
.file-size {
  font-size: 10px;
  opacity: 0.8;
  flex-shrink: 0;
}
.file-desc {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  color: #9a835a;
  white-space: normal;
  word-break: break-all;
}
.file-item.active .file-desc {
  color: #fff8e7;
  opacity: 0.92;
}

.file-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fffdf3;
  overflow: hidden;
}
.content-desc {
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 18px;
  background: #fff5d9;
  border-bottom: 1.5px dashed #e7dcb1;
  font-size: 12px;
  line-height: 1.5;
  color: #6e5a3f;
}
.content-desc-icon {
  flex-shrink: 0;
  font-size: 14px;
}
.content-desc-text {
  flex: 1;
  font-weight: 600;
  word-break: break-all;
}
.key-inline {
  display: inline-block;
  padding: 1px 6px;
  margin-right: 4px;
  border-radius: 6px;
  background: #fff5d9;
  border: 1px solid #e7dcb1;
  font-family: ui-monospace, Consolas, "Courier New", monospace;
  font-size: 11.5px;
  font-weight: 700;
  color: #8a6618;
}
.code {
  margin: 0;
  padding: 14px 18px;
  font-size: 12px;
  line-height: 1.55;
  color: #4d3e26;
  font-family: ui-monospace, Consolas, "Courier New", monospace;
  white-space: pre;
  overflow: auto;
  flex: 1;
  min-height: 0;
}
.empty {
  color: #a89572;
  font-size: 13px;
  text-align: center;
}
.empty.pad {
  padding: 40px 20px;
}
.empty.error {
  color: #c4663a;
}
</style>
