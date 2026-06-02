/**
 * 灵魄基础数据：四大类型及对应属性
 */

export type SoulCategory = 'blade' | 'roar' | 'shield' | 'guard'

export const CATEGORY_LABEL: Record<SoulCategory, string> = {
  blade: '利刃',
  roar: '灵啸',
  shield: '坚盾',
  guard: '守神',
}

export const CATEGORY_SLOT: Record<SoulCategory, string[]> = {
  blade: ['武器', '护手', '衣服'],
  roar: ['项链', '戒指'],
  shield: ['帽子', '裤子', '鞋子', '面具'],
  guard: ['翅膀', '符咒'],
}

export const CATEGORY_ATTRS: Record<SoulCategory, string[]> = {
  blade: [
    '博学', '炽炎', '刺杀', '断魂', '奋迅', '风暴', '黑暗', '棘刃',
    '戮神', '魔咒', '泣冰', '杀戮', '摄魂', '圣歌', '星光', '妖法', '斩风',
  ],
  roar: ['博学', '裁决', '狂热', '怒焰', '破风', '破空', '启迪', '突袭', '野兽'],
  shield: [
    '博学', '百炼', '庇佑', '不动', '光明', '坚韧', '警卫',
    '晶铸', '魔御', '平衡', '守护', '天赐', '仙法', '秩序',
  ],
  guard: ['博学', '庇护', '赐福', '洞察', '复苏', '坚壁', '微光', '压制', '专注'],
}

/** 4 类合计种类数（用于"随机进化"的期望系数） */
export const TOTAL_CATEGORIES = 4
