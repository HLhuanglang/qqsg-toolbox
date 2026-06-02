import type { SoulNode, Totals, OpCount } from './soul'

export interface SingleResult {
  tree: SoulNode
  totals: Totals
  ops: OpCount
}

/** 计算输出（仅保留 single 模式：进化对比已废弃） */
export interface ComputeOutput {
  mode: 'single'
  single: SingleResult
}
