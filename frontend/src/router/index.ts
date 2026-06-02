import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/soul/craft' },
  {
    path: '/soul/level',
    name: 'soul-level',
    component: () => import('@/views/SoulLevel.vue'),
    meta: { title: '等级计算' },
  },
  {
    path: '/soul/craft',
    name: 'soul-craft',
    component: () => import('@/views/SoulCraft.vue'),
    meta: { title: '合成计算' },
  },
  {
    path: '/soul/catalog',
    name: 'soul-catalog',
    component: () => import('@/views/SoulCatalog.vue'),
    meta: { title: '灵魂图鉴' },
  },
  {
    path: '/soul/awaken',
    name: 'soul-awaken',
    component: () => import('@/views/SoulAwaken.vue'),
    meta: { title: '开灵属性' },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/Profile.vue'),
    meta: { title: '个人中心' },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/Settings.vue'),
    meta: { title: '设置' },
  },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router
