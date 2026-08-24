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
    path: '/record/yulin',
    name: 'record-yulin',
    component: () => import('@/views/RecordYulin.vue'),
    meta: { title: '羽灵记录' },
  },
  {
    path: '/record/bazhentu',
    name: 'record-bazhentu',
    component: () => import('@/views/RecordBazhentu.vue'),
    meta: { title: '八阵图记录' },
  },
  {
    path: '/record/city',
    name: 'record-city',
    component: () => import('@/views/RecordCity.vue'),
    meta: { title: '投城记录' },
  },
  {
    path: '/record/asset',
    name: 'record-asset',
    component: () => import('@/views/RecordAsset.vue'),
    meta: { title: '资产记录' },
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
