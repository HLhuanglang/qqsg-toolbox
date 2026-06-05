import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'animal-island-vue/style'
import './style.css'
import { initKVStore } from './logic/kvStore'
import { initAccountStore } from './logic/account'

// 启动顺序非常关键：
//   1) 先把后端持久化数据加载进内存（含一次性 localStorage → 后端迁移）。
//   2) 再触发账户模块的 bootstrap：此时 storage 才能读到磁盘上恢复出来的账户/记录。
//   3) 最后才挂载 Vue。
// 颠倒任何一步都会让 account.ts 顶层在拿不到数据时新建一个空账户，
// 把 store.json 上恢复出来的真实账户记录覆盖掉。
async function start() {
  try {
    await initKVStore()
  } catch (e) {
    // 任何异常都已在内部 fallback 到 localStorage，这里仅打印
    console.error('[main] initKVStore failed:', e)
  }
  try {
    initAccountStore()
  } catch (e) {
    console.error('[main] initAccountStore failed:', e)
  }
  createApp(App).use(router).mount('#app')
}

void start()
