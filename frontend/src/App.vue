<template>
  <Cursor>
    <div class="app">
      <!-- ────── 侧边栏 ────── -->
      <aside class="sidebar" :style="{ width: sidebarWidth + 'px' }">
        <nav class="menu">
          <div v-for="group in menuGroups" :key="group.key" class="menu-group">
            <div
              class="group-header"
              :class="{ open: expandedGroups[group.key] }"
              @click="toggleGroup(group.key)"
            >
              <span class="group-icon">{{ group.icon }}</span>
              <span class="group-label">{{ group.label }}</span>
              <span class="group-arrow" :class="{ expanded: expandedGroups[group.key] }">▸</span>
            </div>
            <transition name="slide">
              <div v-show="expandedGroups[group.key]" class="group-children">
                <router-link
                  v-for="child in group.children"
                  :key="child.path"
                  :to="child.path"
                  class="menu-item"
                  active-class="active"
                >
                  <!-- <span class="leaf">🍃</span> -->
                  <span class="label">{{ child.label }}</span>
                </router-link>
              </div>
            </transition>
          </div>
        </nav>

        <div class="footer">
          <div class="footer-actions">
            <router-link to="/profile" class="footer-btn" active-class="active">
              <span class="footer-btn-icon">{{ activeAccount?.avatar || '🦊' }}</span>
              <span class="footer-btn-label">{{ activeAccount?.nickname || '个人中心' }}</span>
            </router-link>
            <router-link to="/settings" class="footer-btn" active-class="active">
              <span class="footer-btn-icon">⚙️</span>
              <span class="footer-btn-label">设置</span>
            </router-link>
          </div>
          <div class="footer-info">v1.0.0 · QQSG工具助手</div>
        </div>
      </aside>

      <div class="resize-handle" @mousedown="startResize"></div>

      <!-- ────── 主内容 ────── -->
      <main class="main">
        <router-view />
      </main>
    </div>
  </Cursor>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { Cursor } from 'animal-island-vue'
import { activeAccount } from '@/logic/account'

interface MenuChild {
  path: string
  label: string
}

interface MenuGroup {
  key: string
  label: string
  icon: string
  children: MenuChild[]
}

const menuGroups: MenuGroup[] = [
  {
    key: 'soul',
    label: '灵魄',
    icon: '👻',
    children: [
      { path: '/soul/level', label: '等级计算' },
      { path: '/soul/catalog', label: '灵魂图鉴' },
      { path: '/soul/awaken', label: '开灵属性' },
      { path: '/soul/craft', label: '升阶开灵' },
    ],
  },
  {
    key: "record",
    label: "记录器",
    icon: "📓",
    children: [
      { path: '/record/yulin', label: '羽灵' },
      { path: '/record/bazhentu', label: '八阵图' },
      { path: '/record/city',label:'投城'},
      { path: '/record/asset', label: '资产' }
    ]
  },
]

const expandedGroups = reactive<Record<string, boolean>>({ soul: true })

const route = useRoute()
watch(
  () => route.path,
  (path) => {
    for (const g of menuGroups) {
      if (g.children.some((c) => path.startsWith(c.path))) {
        expandedGroups[g.key] = true
      }
    }
  },
  { immediate: true }
)

function toggleGroup(key: string) {
  expandedGroups[key] = !expandedGroups[key]
}

// ─── 侧边栏拖拽调宽 ───
const MIN_WIDTH = 160
const MAX_WIDTH = 360
const sidebarWidth = ref(232)

function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startW = sidebarWidth.value

  const onMove = (ev: MouseEvent) => {
    const diff = ev.clientX - startX
    sidebarWidth.value = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW + diff))
  }

  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
  background: #fbf6e4;
}

/* ── 侧边栏：奶油沙滩底色 ── */
.sidebar {
  flex-shrink: 0;
  background: #f7f3df;
  color: #725d42;
  display: flex;
  flex-direction: column;
  user-select: none;
  overflow: hidden;
  border-right: 2px dashed #d8c995;
  position: relative;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 18px 14px;
  border-bottom: 2px dashed #d8c995;
  font-weight: 800;
  font-size: 16px;
  color: #5d4a32;
  letter-spacing: 0.5px;
}

.brand-text {
  white-space: nowrap;
}

.resize-handle {
  width: 4px;
  cursor: col-resize;
  background: transparent;
  transition: background 0.15s;
  flex-shrink: 0;
}

.resize-handle:hover {
  background: #f7cd67;
}

/* ── 菜单 ── */
.menu {
  flex: 1;
  padding: 8px 8px;
  overflow-y: auto;
  min-height: 0;
}

.menu-group {
  margin-bottom: 6px;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 15px;
  font-weight: 700;
  color: #5d4a32;
  border-radius: 14px;
  transition: background 0.15s;
}

.group-header:hover {
  background: #f0e8c4;
}

.group-header.open {
  background: #e9dfa8;
}

.group-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #8ac68a;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  box-shadow: 0 2px 0 #6ba66b;
}

.group-arrow {
  margin-left: auto;
  font-size: 14px;
  transition: transform 0.2s;
  opacity: 0.55;
  color: #9a835a;
}

.group-arrow.expanded {
  transform: rotate(90deg);
}

/* ── 子菜单：木叶卡片 ── */
.group-children {
  overflow: hidden;
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 6px;
  padding: 8px 12px 8px 38px;
  border-radius: 12px;
  color: #6e5a3f;
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  box-shadow: 0 2px 0 #e0d293;
  transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
}

.menu-item:hover {
  background: #fff8de;
  transform: translateY(-1px);
}

.menu-item.active {
  background: linear-gradient(135deg, #f7cd67, #e59266);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #b56e3f;
}

.leaf {
  font-size: 12px;
  flex-shrink: 0;
}

.menu-item.active .leaf {
  filter: brightness(1.4);
}

/* ── 折叠动画 ── */
.slide-enter-active,
.slide-leave-active {
  transition: max-height 0.25s ease, opacity 0.25s ease;
  max-height: 320px;
  opacity: 1;
}

.slide-enter-from,
.slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── 底部：操作按钮 + 版本 ── */
.footer {
  border-top: 2px dashed #d8c995;
  padding: 10px 10px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.footer-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.footer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  border-radius: 12px;
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  box-shadow: 0 2px 0 #e0d293;
  color: #6e5a3f;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.footer-btn:hover {
  background: #fff8de;
  transform: translateY(-1px);
}

.footer-btn:active {
  transform: translateY(1px);
  box-shadow: 0 1px 0 #e0d293;
}

.footer-btn.active {
  background: linear-gradient(135deg, #f7cd67, #e59266);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 3px 0 #b56e3f;
}

.footer-btn-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.footer-btn-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.footer-info {
  font-size: 11px;
  color: #a89572;
  text-align: center;
  letter-spacing: 0.3px;
  padding: 2px 0 0;
}

/* ── 主内容 ── */
.main {
  flex: 1;
  overflow: auto;
  background: #fbf6e4;
}
</style>
