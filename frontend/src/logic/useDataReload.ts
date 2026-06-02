import { onBeforeUnmount, onMounted } from 'vue'
import { EventsOn } from '../../wailsjs/runtime/runtime'

/**
 * 监听后端 "data:changed" 事件（开发期文件监听），自动调用 reload。
 * 同时在挂载时立即执行一次首屏加载。
 *
 * 用法：
 *   useDataReload(loadData)
 *
 * @param reload 重新加载数据的回调（异步亦可）
 */
export function useDataReload(reload: () => void | Promise<void>) {
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    void reload()
    unsubscribe = EventsOn('data:changed', () => {
      void reload()
    })
  })

  onBeforeUnmount(() => {
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  })
}
