<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-yellow">八阵图 · 周记录</Card>

      <!-- 0. 初始化向导（未初始化时显示） -->
      <Card v-if="!initialized">
        <div class="card-head">
          <span class="card-title">🎯 初始化我的战阵</span>
          <span class="card-hint">先告诉系统你目前的境界与属性，再开始周记录</span>
        </div>

        <div class="setup">
          <!-- 起点境界 -->
          <div class="setup-block">
            <div class="setup-h">
              <span class="guide-bar" />
              <span class="setup-h-text">起点境界</span>
              <span class="setup-h-tip">你目前所在的境界</span>
            </div>
            <div class="realm-grid">
              <button
                v-for="r in REALMS"
                :key="r.name"
                type="button"
                class="realm-btn"
                :class="{ active: setupForm.realm === r.name }"
                :style="{ '--accent': r.color }"
                @click="pickRealm(r.name)"
              >
                <span class="rb-name">{{ r.name }}</span>
                <span class="rb-tier">{{ r.tier }}阶</span>
                <span class="rb-unlock">{{ r.unlockText }}</span>
              </button>
            </div>

            <div class="attr-snapshot">
              <div class="attr-snapshot-h">
                起点属性
                <span class="snapshot-hint">
                  默认填入
                  <b :style="{ color: REALM_BY_NAME[setupForm.realm].color }">{{ setupForm.realm }}</b>
                  基础值，可按实际微调
                </span>
              </div>
              <div class="attr-grid">
                <div
                  v-for="a in setupVisibleAttrs"
                  :key="a.key"
                  class="attr-cell"
                  :style="{ '--accent': a.color }"
                >
                  <Field :label="a.label">
                    <NumberInput v-model="setupForm.attrs[a.key]" :min="0" />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <!-- 目标境界 -->
          <div class="setup-block goal">
            <div class="setup-h">
              <span class="guide-bar goal-bar" />
              <span class="setup-h-text">目标境界</span>
              <span class="setup-h-tip">
                想最终修炼到的境界，必须 ≥ 起点
              </span>
            </div>
            <div class="realm-grid">
              <button
                v-for="r in REALMS"
                :key="r.name"
                type="button"
                class="realm-btn"
                :class="{
                  active: setupForm.goal === r.name,
                  disabled: r.tier < REALM_BY_NAME[setupForm.realm].tier,
                }"
                :style="{ '--accent': r.color }"
                :disabled="r.tier < REALM_BY_NAME[setupForm.realm].tier"
                @click="pickGoal(r.name)"
              >
                <span class="rb-name">{{ r.name }}</span>
                <span class="rb-tier">{{ r.tier }}阶</span>
                <span class="rb-unlock">{{ r.unlockText }}</span>
              </button>
            </div>

            <div v-if="setupHasUpgrade" class="upgrade-cost">
              <div class="uc-row">
                <span class="uc-from" :style="{ color: REALM_BY_NAME[setupForm.realm].color }">
                  {{ setupForm.realm }}
                </span>
                <span class="uc-arr">→</span>
                <span class="uc-to" :style="{ color: REALM_BY_NAME[setupForm.goal].color }">
                  {{ setupForm.goal }}
                </span>
                <span class="uc-sep">需要</span>
                <span class="uc-chip">
                  <b>{{ fmtInt(setupRangeCost.runs) }}</b> 次修炼
                </span>
                <span class="uc-chip">
                  <b>{{ fmtInt(setupRangeCost.sundays) }}</b> 日月
                </span>
                <span class="uc-chip">
                  <b>{{ fmtCost(setupRangeCost.gold) }}</b> 三国币
                </span>
                <span class="uc-days">
                  约 <b>{{ realmRangeDays(setupForm.realm, setupForm.goal) }}</b>
                  天（每天 {{ DAILY_RUN_LIMIT }} 次）
                </span>
              </div>
            </div>
            <p v-else class="upgrade-empty">
              目标 = 起点，无需境界升级，仅记录修炼数据
            </p>

            <div class="attr-snapshot">
              <div class="attr-snapshot-h">
                目标属性
                <span class="snapshot-hint">
                  目标境界
                  <b :style="{ color: REALM_BY_NAME[setupForm.goal].color }">{{ setupForm.goal }}</b>
                  达成时的预期值（可仅作参考）
                </span>
              </div>
              <div class="attr-grid">
                <div
                  v-for="a in setupGoalVisibleAttrs"
                  :key="a.key"
                  class="attr-cell"
                  :style="{ '--accent': a.color }"
                >
                  <Field :label="a.label">
                    <NumberInput v-model="setupForm.goalAttrs[a.key]" :min="0" />
                  </Field>
                </div>
              </div>
            </div>
          </div>

          <!-- 起点信息 -->
          <div class="setup-block">
            <div class="setup-h">
              <span class="guide-bar" />
              <span class="setup-h-text">起点信息</span>
            </div>
            <div class="grid-3">
              <Field label="起始日期">
                <Input v-model="setupForm.date" type="date" />
              </Field>
              <Field label="战阵评分">
                <NumberInput v-model="setupForm.score" :min="0" />
              </Field>
              <Field label="日月单价（万 / 个，可空）">
                <NumberInput v-model="setupForm.sundayPrice" :min="0" />
              </Field>
            </div>
          </div>

          <p v-if="setupError" class="err">{{ setupError }}</p>

          <div class="modal-actions setup-actions single">
            <Button type="primary" block @click="confirmSetup">保存并开始记录</Button>
          </div>
        </div>
      </Card>

      <!-- 1. 八卦盘：最新一周属性快照 -->
      <Card v-if="initialized">
        <div class="card-head">
          <span class="card-title">
            🧭 战阵属性快照
            <button
              type="button"
              class="title-help"
              title="查看境界提升说明"
              @click="guideOpen = true"
            >📖 境界说明</button>
          </span>
          <span class="card-hint">
            <span
              class="realm-badge"
              :style="{ '--accent': currentRealm.color }"
              title="点击调整境界"
              @click="openRealmEdit"
            >
              <span class="rb-dot" />
              <span class="rb-text">{{ currentRealm.name }}</span>
              <span class="rb-tier-tag">{{ currentRealm.tier }}阶</span>
            </span>
            <template v-if="hasUpgradePlan">
              <span class="realm-arrow">→</span>
              <span
                class="realm-badge goal"
                :style="{ '--accent': goalRealm.color }"
                title="点击调整境界"
                @click="openRealmEdit"
              >
                <span class="rb-dot" />
                <span class="rb-text">{{ goalRealm.name }}</span>
                <span class="rb-tier-tag">{{ goalRealm.tier }}阶</span>
              </span>
            </template>
            <template v-if="latest">
              · {{ latest.note || latest.date }}
            </template>
          </span>
        </div>

        <div class="octagon">
          <div
            v-for="a in ATTRS_BY_POS"
            :key="a.key"
            class="oct-slot"
            :class="['p-' + a.pos, 'g-' + a.group]"
          >
            <div class="oct-card" :style="{ '--accent': a.color }">
              <div class="oct-name">{{ a.label }}</div>
              <div class="oct-value">{{ latestAttr(a.key) }}</div>
            </div>
          </div>

          <div class="oct-center">
            <div class="taiji">
              <div class="taiji-inner">
                <div class="taiji-light" />
                <div class="taiji-dark" />
                <div class="taiji-dot light-dot" />
                <div class="taiji-dot dark-dot" />
              </div>
              <div class="taiji-rating">
                <div class="taiji-rating-label">战阵评分</div>
                <div class="taiji-rating-value">{{ fmtInt(currentCumScore) }}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 2. 总览（仅累计成本明细） -->
      <Card v-if="initialized">
        <div class="stats-grid">
          <div class="stat full cost-summary">
            <div class="cs-head">
              <span class="cs-title">💰 累计成本</span>
              <span v-if="hasUpgradePlan" class="cs-sub">
                {{ currentRealm.name }} → {{ goalRealm.name }} ·
                境界提升 + 每周材料
              </span>
              <span v-else class="cs-sub">仅含每周材料成本（未设升级目标）</span>
            </div>
            <div class="cs-body">
              <div class="cs-item">
                <div class="cs-item-label">
                  境界提升花费
                  <span v-if="hasUpgradePlan" class="cs-item-hint">
                    {{ fmtCost(totalUpgradeGold) }} 三国币
                    <template v-if="sundayPrice > 0">
                      + {{ fmtInt(totalSundays) }} 日月 × {{ fmtDec(sundayPrice, 2) }} 万
                    </template>
                    <template v-else>
                      + {{ fmtInt(totalSundays) }} 日月（未设单价）
                    </template>
                  </span>
                </div>
                <div class="cs-item-value">{{ fmtCost(totalUpgradeAll) }}</div>
              </div>
              <div class="cs-plus">+</div>
              <div class="cs-item">
                <div class="cs-item-label">每周材料成本</div>
                <div class="cs-item-value">{{ fmtCost(totalCost) }}</div>
              </div>
              <div class="cs-eq">=</div>
              <div class="cs-total">
                <div class="cs-total-label">累计成本</div>
                <div class="cs-total-value">{{ fmtCost(totalCostAll) }}</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <!-- 2.5 周增量趋势 -->
      <Card v-if="initialized && records.length > 0">
        <div class="card-head">
          <span class="card-title">📈 每周增量趋势</span>
          <div class="head-ops">
            <div class="trend-tabs">
              <button
                type="button"
                class="trend-tab"
                :class="{ active: trendMode === 'attrs' }"
                @click="trendMode = 'attrs'"
              >8 项属性</button>
              <button
                type="button"
                class="trend-tab"
                :class="{ active: trendMode === 'score' }"
                @click="trendMode = 'score'"
              >战阵评分</button>
            </div>
          </div>
        </div>

        <div class="trend-wrap">
          <div class="trend-stage" @mouseleave="hoverIdx = -1">
            <svg
              :viewBox="`0 0 ${TREND_W} ${TREND_H}`"
              class="trend-svg"
              preserveAspectRatio="none"
            >
              <!-- 网格 -->
              <g class="trend-grid">
                <line
                  v-for="(y, i) in trendYTicks"
                  :key="'gl' + i"
                  :x1="TREND_PAD_L"
                  :x2="TREND_W - TREND_PAD_R"
                  :y1="y.y"
                  :y2="y.y"
                />
              </g>
              <!-- Y 轴标签 -->
              <g class="trend-axis">
                <text
                  v-for="(y, i) in trendYTicks"
                  :key="'yl' + i"
                  :x="TREND_PAD_L - 6"
                  :y="y.y"
                  text-anchor="end"
                  dominant-baseline="central"
                >{{ fmtTrendY(y.v) }}</text>
              </g>
              <!-- X 轴标签 -->
              <g class="trend-axis x">
                <text
                  v-for="(p, i) in trendXTicks"
                  :key="'xl' + i"
                  :x="p.x"
                  :y="TREND_H - TREND_PAD_B + 14"
                  text-anchor="middle"
                >{{ p.label }}</text>
              </g>
              <!-- 折线 -->
              <g class="trend-lines">
                <g v-for="s in trendSeries" :key="s.key">
                  <polyline
                    :points="s.path"
                    :stroke="s.color"
                    fill="none"
                    stroke-width="1.8"
                    stroke-linejoin="round"
                    stroke-linecap="round"
                  />
                  <circle
                    v-for="(p, i) in s.points"
                    :key="i"
                    :cx="p.x"
                    :cy="p.y"
                    :r="hoverIdx === i ? 4 : 2.5"
                    :fill="s.color"
                    class="trend-dot"
                    :class="{ active: hoverIdx === i }"
                  />
                </g>
              </g>
              <!-- 悬浮垂直线 -->
              <line
                v-if="hoverIdx >= 0 && trendHoverX !== null"
                :x1="trendHoverX"
                :x2="trendHoverX"
                :y1="TREND_PAD_T"
                :y2="TREND_H - TREND_PAD_B"
                class="trend-hover-line"
              />
              <!-- 透明 hover 矩形（按周一列覆盖整个 plot 区域） -->
              <g class="trend-hover-bands">
                <rect
                  v-for="(b, i) in trendHoverBands"
                  :key="'hb' + i"
                  :x="b.x"
                  :y="TREND_PAD_T"
                  :width="b.w"
                  :height="TREND_H - TREND_PAD_T - TREND_PAD_B"
                  fill="transparent"
                  @mouseenter="hoverIdx = i"
                />
              </g>
            </svg>

            <!-- 自定义 HTML tooltip（不受 SVG 拉伸影响） -->
            <div
              v-if="hoverIdx >= 0 && trendTooltip"
              class="trend-tooltip"
              :style="trendTooltip.style"
            >
              <div class="tt-head">
                <span class="tt-week">{{ trendTooltip.weekLabel }}</span>
                <span class="tt-date">{{ trendTooltip.date }}</span>
              </div>
              <div class="tt-body">
                <div
                  v-for="row in trendTooltip.rows"
                  :key="row.key"
                  class="tt-row"
                >
                  <span class="tt-dot" :style="{ background: row.color }" />
                  <span class="tt-label">{{ row.label }}</span>
                  <span class="tt-val">{{ row.text }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 图例（属性模式才显示） -->
          <div v-if="trendMode === 'attrs'" class="trend-legend">
            <span
              v-for="s in trendSeries"
              :key="s.key"
              class="legend-chip"
              :style="{ '--accent': s.color }"
            >
              <span class="legend-dot" />
              {{ s.label }}{{ s.scaleNote ? ' ' + s.scaleNote : '' }}
            </span>
          </div>
        </div>
      </Card>

      <!-- 3. 周记录列表 -->
      <Card v-if="initialized">
        <div class="card-head">
          <span class="card-title">📒 周修炼记录</span>
          <div class="head-ops">
            <Button type="primary" size="small" @click="openAdd">＋ 添加本周</Button>
          </div>
        </div>

        <div v-if="records.length === 0" class="empty-block">
          还没有周记录，点击右上角"＋ 添加本周"开始记录第一次修炼数据。
        </div>

        <div v-else class="rec-list">
          <div
            v-for="(r, i) in recordsDesc"
            :key="r.id"
            class="rec-card"
            :class="{ expanded: isExpanded(r.id) }"
          >
            <div
              class="rec-head"
              role="button"
              tabindex="0"
              @click="toggleExpand(r.id)"
              @keydown.enter.prevent="toggleExpand(r.id)"
              @keydown.space.prevent="toggleExpand(r.id)"
            >
              <div class="rec-title">
                <span class="rec-chevron" :class="{ open: isExpanded(r.id) }">▸</span>
                <span class="head-tag week">
                  <span class="head-tag-label">周次</span>
                  <span class="head-tag-value">
                    {{ r.note || ('第 ' + (records.length - i) + ' 周') }}
                  </span>
                </span>
                <span class="head-tag date">
                  <span class="head-tag-label">日期</span>
                  <span class="head-tag-value">{{ r.date }}</span>
                </span>
                <span class="head-tag score">
                  <span class="head-tag-label">评分</span>
                  <span class="head-tag-value">{{ fmtInt(cumScoreOf(r)) }}</span>
                </span>
                <span
                  v-if="r.score !== 0"
                  class="head-tag delta"
                  :class="{ pos: r.score > 0, neg: r.score < 0 }"
                >
                  <span class="head-tag-label">加分</span>
                  <span class="head-tag-value">{{ fmtDelta(r.score) }}</span>
                </span>
              </div>
              <div class="rec-ops" @click.stop>
                <button class="op-btn" @click="openEdit(r)">编辑</button>
                <button class="op-btn danger" @click="confirmDel(r)">删除</button>
              </div>
            </div>

            <!-- 折叠：核心数据预览 -->
            <div v-if="!isExpanded(r.id)" class="rec-preview" @click="toggleExpand(r.id)">
              <div class="prev-item">
                <span class="prev-label">材料</span>
                <span class="prev-value">
                  {{ r.material || '—' }}
                  <span v-if="r.materialQty" class="prev-mat-qty">×{{ fmtInt(r.materialQty) }}</span>
                </span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">总次数</span>
                <span class="prev-value">{{ totalCounts(r.counts) }} / {{ WEEKLY_LIMIT }}</span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">分布</span>
                <span class="prev-value mini">
                  4×{{ r.counts.n4 }} · 3×{{ r.counts.n3 }} · 2×{{ r.counts.n2 }} · 1×{{ r.counts.n1 }}
                </span>
              </div>
              <div class="prev-divider" />
              <div class="prev-item">
                <span class="prev-label">材料成本</span>
                <span class="prev-value pos">{{ fmtCost(weeklyCost(r)) }}</span>
              </div>
              <span class="prev-expand">展开详情 ▾</span>
            </div>

            <!-- 展开：完整 8 属性表 + 修炼次数 -->
            <template v-if="isExpanded(r.id)">
              <div class="table-scroll">
                <table class="rec-table">
                  <thead>
                    <tr>
                      <th colspan="8" class="grp grp-attr">8 项属性</th>
                      <th rowspan="2">评分</th>
                      <th rowspan="2">加分</th>
                    </tr>
                    <tr>
                      <th
                        v-for="a in ATTRS_BY_POS"
                        :key="a.key"
                        class="sub"
                        :style="{ color: a.color }"
                      >{{ a.short }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td v-for="a in ATTRS_BY_POS" :key="a.key">
                        {{ fmtDec(cumAttrsOf(r)[a.key], 2) }}
                      </td>
                      <td class="strong">{{ fmtInt(cumScoreOf(r)) }}</td>
                      <td :class="{ pos: r.score > 0, neg: r.score < 0 }">
                        {{ fmtDelta(r.score) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- 修炼次数 + 材料 -->
              <div class="rec-summary">
                <div class="sum-chip">
                  <span class="sum-chip-label">4 项次数</span>
                  <span class="sum-chip-value">{{ r.counts.n4 }}</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">3 项次数</span>
                  <span class="sum-chip-value">{{ r.counts.n3 }}</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">2 项次数</span>
                  <span class="sum-chip-value">{{ r.counts.n2 }}</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">1 项次数</span>
                  <span class="sum-chip-value">{{ r.counts.n1 }}</span>
                </div>
                <div class="sum-chip highlight">
                  <span class="sum-chip-label">
                    总次数
                    <span class="sum-chip-hint">/ {{ WEEKLY_LIMIT }}</span>
                  </span>
                  <span class="sum-chip-value strong">{{ totalCounts(r.counts) }}</span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">材料</span>
                  <span class="sum-chip-value mat">
                    {{ r.material || '—' }}
                    <span v-if="r.materialQty" class="mat-qty">×{{ fmtInt(r.materialQty) }}</span>
                  </span>
                </div>
                <div class="sum-chip">
                  <span class="sum-chip-label">单价</span>
                  <span class="sum-chip-value">
                    {{ r.materialPrice ? fmtDec(r.materialPrice, 4) + ' 万' : '—' }}
                  </span>
                </div>
                <div class="sum-chip highlight">
                  <span class="sum-chip-label">材料成本</span>
                  <span class="sum-chip-value strong pos">{{ fmtCost(weeklyCost(r)) }}</span>
                </div>
              </div>
            </template>
          </div>
        </div>
      </Card>
    </div>

    <!-- 4. 添加 / 编辑 弹窗 -->
    <Modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑周记录' : '添加周记录'"
      :typewriter="false"
      :show-footer="false"
      width="780px"
    >
      <div class="form">
        <!-- 基本信息 -->
        <div class="form-section">
          <div class="section-title">
            基本信息
            <span class="section-hint">
              本周之前累计评分 <b>{{ fmtInt(formCumBefore.score) }}</b>
            </span>
          </div>
          <div class="grid-3">
            <Field label="日期">
              <Input v-model="form.date" type="date" />
            </Field>
            <Field label="备注 / 进度">
              <Input v-model="form.note" :placeholder="defaultNote" />
            </Field>
            <Field label="本周累计评分">
              <NumberInput v-model="form.score" :min="0" />
              <div class="field-delta">
                本周加分 →
                <b :class="{ pos: formScoreDelta > 0, neg: formScoreDelta < 0 }">
                  {{ fmtDelta(formScoreDelta) }}
                </b>
              </div>
            </Field>
          </div>
        </div>

        <!-- 8 属性 -->
        <div class="form-section">
          <div class="section-title">
            8 项属性 · 本周累计快照
            <span class="section-hint">
              目标境界
              <b :style="{ color: goalRealm.color }">{{ goalRealm.name }}</b>
              共 {{ goalRealmAttrs.length }} 项 · 输入框下方自动计算本周增量
            </span>
          </div>
          <div class="attr-grid">
            <div
              v-for="a in goalRealmAttrs"
              :key="a.key"
              class="attr-cell"
              :style="{ '--accent': a.color }"
            >
              <Field :label="a.label">
                <NumberInput v-model="form.attrs[a.key]" :min="0" />
                <div class="field-delta">
                  本周增量 →
                  <b
                    :class="{
                      pos: formAttrDelta(a.key) > 1e-9,
                      neg: formAttrDelta(a.key) < -1e-9,
                    }"
                  >
                    {{ fmtDeltaDec(formAttrDelta(a.key)) }}
                  </b>
                </div>
              </Field>
            </div>
          </div>
        </div>

        <!-- 修炼次数 -->
        <div class="form-section">
          <div class="section-title">
            本周修炼次数
            <span class="section-hint">
              已用 <b :class="{ over: totalCountPreview > WEEKLY_LIMIT }">{{ totalCountPreview }}</b>
              / {{ WEEKLY_LIMIT }} 次
            </span>
          </div>
          <div class="grid-4">
            <Field label="4 项次数"><NumberInput v-model="form.counts.n4" :min="0" /></Field>
            <Field label="3 项次数"><NumberInput v-model="form.counts.n3" :min="0" /></Field>
            <Field label="2 项次数"><NumberInput v-model="form.counts.n2" :min="0" /></Field>
            <Field label="1 项次数"><NumberInput v-model="form.counts.n1" :min="0" /></Field>
          </div>
        </div>

        <!-- 材料 -->
        <div class="form-section">
          <div class="section-title">
            材料
            <span class="section-hint">单价单位：万 / 个</span>
          </div>
          <div class="grid-3">
            <Field label="材料名称">
              <Input v-model="form.material" placeholder="如：精要" />
            </Field>
            <Field label="使用数量">
              <NumberInput v-model="form.materialQty" :min="0" />
            </Field>
            <Field label="材料单价">
              <NumberInput v-model="form.materialPrice" :min="0" />
            </Field>
          </div>
          <p class="price-tip">
            本周材料成本 ≈ <b>{{ fmtCost(weekCostPreview) }}</b>
          </p>
        </div>

        <p v-if="formError" class="err">{{ formError }}</p>

        <div class="modal-actions">
          <Button block @click="modalOpen = false">取消</Button>
          <Button type="primary" block @click="submit">
            {{ editingId ? '保存' : '添加' }}
          </Button>
        </div>
      </div>
    </Modal>

    <!-- 5. 删除确认弹窗 -->
    <Modal
      v-model:open="delModalOpen"
      title="删除确认"
      :typewriter="false"
      :show-footer="false"
      width="420px"
    >
      <div class="confirm-body">
        <div class="confirm-icon"><span>!</span></div>
        <div class="confirm-text">
          确定删除这条修炼记录吗？
          <div class="confirm-target"><span class="confirm-tip">删除后无法恢复</span></div>
          <div v-if="pendingDel" class="confirm-meta">
            <span class="confirm-meta-tag">{{ pendingDel.note || pendingDel.date }}</span>
            <span class="confirm-meta-range">评分 {{ fmtInt(pendingDel.score) }}</span>
          </div>
        </div>
        <div class="modal-actions confirm-actions">
          <Button block @click="cancelDel">取消</Button>
          <Button type="primary" danger block @click="doDel">确定删除</Button>
        </div>
      </div>
    </Modal>

    <!-- 7. 境界提升说明 -->
    <Modal
      v-model:open="guideOpen"
      title="境界说明"
      :typewriter="false"
      :show-footer="false"
      width="520px"
    >
      <div class="guide-body">
        <div class="guide-section">
          <div class="guide-h">
            <span class="guide-bar" />
            境界与基础属性
          </div>
          <div class="guide-table-wrap">
            <table class="guide-table">
              <thead>
                <tr>
                  <th>境界</th>
                  <th>阶层</th>
                  <th>基础属性</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in REALM_UNLOCKS" :key="row.tier">
                  <td class="g-name" :style="{ color: row.color }">{{ row.name }}</td>
                  <td class="g-tier">{{ row.tier }}阶</td>
                  <td class="g-unlock">
                    <span
                      v-for="(v, k) in row.baseEntries"
                      :key="k"
                      class="base-chip"
                      :style="{ '--accent': v.color }"
                    >
                      {{ v.short }}<b>{{ v.value }}</b>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="guide-section">
          <div class="guide-h">
            <span class="guide-bar" />
            境界升级消耗
            <span class="guide-h-tip">每天可培养 {{ DAILY_RUN_LIMIT }} 次</span>
          </div>
          <ul class="guide-list">
            <li v-for="(it, i) in REALM_UPGRADES" :key="i">
              <span class="ul-from" :style="{ color: it.fromColor }">{{ it.from }}</span>
              <span class="ul-arr">→</span>
              <span class="ul-to" :style="{ color: it.toColor }">{{ it.to }}</span>
              <span class="ul-sep">：</span>
              <span class="ul-runs">{{ fmtInt(it.runs) }}<span class="ul-unit">次</span></span>
              <span class="ul-cost">
                · 每次 {{ it.perSunday }} 日月 + {{ it.perGold }} 万
              </span>
              <span class="ul-total">
                = <b>{{ fmtInt(it.totalSundays) }}</b> 日月 +
                <b>{{ fmtCost(it.totalGold) }}</b>
              </span>
            </li>
          </ul>
        </div>

        <div class="modal-actions guide-actions">
          <Button type="primary" block @click="guideOpen = false">知道了</Button>
        </div>
      </div>
    </Modal>

    <!-- 8. 调整境界 -->
    <Modal
      v-model:open="realmEditOpen"
      title="调整境界"
      :typewriter="false"
      :show-footer="false"
      width="560px"
    >
      <div class="setup">
        <div class="setup-block">
          <div class="setup-h">
            <span class="guide-bar" />
            <span class="setup-h-text">起点境界</span>
            <span class="setup-h-tip">影响可录入的属性数量</span>
          </div>
          <div class="realm-grid compact">
            <button
              v-for="r in REALMS"
              :key="r.name"
              type="button"
              class="realm-btn"
              :class="{ active: realmEditForm.realm === r.name }"
              :style="{ '--accent': r.color }"
              @click="pickEditRealm(r.name)"
            >
              <span class="rb-name">{{ r.name }}</span>
              <span class="rb-tier">{{ r.tier }}阶</span>
              <span class="rb-unlock">{{ r.unlockText }}</span>
            </button>
          </div>
        </div>

        <div class="setup-block goal">
          <div class="setup-h">
            <span class="guide-bar goal-bar" />
            <span class="setup-h-text">目标境界</span>
            <span class="setup-h-tip">必须 ≥ 起点</span>
          </div>
          <div class="realm-grid compact">
            <button
              v-for="r in REALMS"
              :key="r.name"
              type="button"
              class="realm-btn"
              :class="{
                active: realmEditForm.goal === r.name,
                disabled: r.tier < REALM_BY_NAME[realmEditForm.realm].tier,
              }"
              :style="{ '--accent': r.color }"
              :disabled="r.tier < REALM_BY_NAME[realmEditForm.realm].tier"
              @click="pickEditGoal(r.name)"
            >
              <span class="rb-name">{{ r.name }}</span>
              <span class="rb-tier">{{ r.tier }}阶</span>
              <span class="rb-unlock">{{ r.unlockText }}</span>
            </button>
          </div>
          <p class="setup-cost">
            <b :style="{ color: REALM_BY_NAME[realmEditForm.realm].color }">{{ realmEditForm.realm }}</b>
            →
            <b :style="{ color: REALM_BY_NAME[realmEditForm.goal].color }">{{ realmEditForm.goal }}</b>
            需要
            <b class="hl-need">{{ fmtInt(realmEditRangeCost.runs) }}</b> 次 ·
            <b class="hl-need">{{ fmtInt(realmEditRangeCost.sundays) }}</b> 日月 ·
            <b class="hl-need">{{ fmtCost(realmEditRangeCost.gold) }}</b> 三国币
          </p>
        </div>

        <div class="setup-block">
          <div class="setup-h">
            <span class="guide-bar" />
            <span class="setup-h-text">日月单价</span>
            <span class="setup-h-tip">可空，仅用于成本展示</span>
          </div>
          <div class="grid-3">
            <Field label="日月单价（万 / 个）">
              <NumberInput v-model="realmEditForm.sundayPrice" :min="0" />
            </Field>
          </div>
        </div>

        <div class="modal-actions confirm-actions">
          <Button block @click="realmEditOpen = false">取消</Button>
          <Button type="primary" block @click="saveRealmEdit">保存</Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Button, Card, Modal, Input } from 'animal-island-vue'
import Field from '@/components/Field.vue'
import NumberInput from '@/components/NumberInput.vue'
import {
  ATTRS_BY_POS,
  WEEKLY_LIMIT,
  DAILY_RUN_LIMIT,
  type AttrKey,
  type AttrValues,
  type WeekRecord,
  type WeeklyCounts,
  type RealmName,
  REALMS,
  REALM_BY_NAME,
  DEFAULT_REALM,
  realmRangeCost,
  realmRangeDays,
  realmBaseAttrs,
  emptyAttrs,
  emptyCounts,
  totalCounts,
  weeklyCost,
  loadStore,
  saveStore,
  genId,
  todayStr,
  fmtInt,
  fmtDec,
  fmtCost,
} from '@/logic/bazhentu'
import { activeAccountId } from '@/logic/account'

/* ─── 数据 ─── */
const records = ref<WeekRecord[]>([])
const lastMaterial = ref<string>('精要')
const lastMaterialPrice = ref<number>(0)
const initialRealm = ref<RealmName>(DEFAULT_REALM)
const targetRealm = ref<RealmName>(DEFAULT_REALM)
const sundayPrice = ref<number>(0)
/** 起点快照（不作为周记录存在 records，独立保存） */
const startAttrs = ref<AttrValues | null>(null)
const startScore = ref<number>(0)
const startDate = ref<string>('')

function reloadFromStore() {
  const s = loadStore()
  const all = s.records.slice().sort((a, b) => a.date.localeCompare(b.date))
  if (typeof s.lastMaterial === 'string') lastMaterial.value = s.lastMaterial
  if (typeof s.lastMaterialPrice === 'number') lastMaterialPrice.value = s.lastMaterialPrice
  initialRealm.value = s.initialRealm || DEFAULT_REALM
  targetRealm.value = s.targetRealm || s.initialRealm || DEFAULT_REALM
  sundayPrice.value = typeof s.sundayPrice === 'number' ? s.sundayPrice : 0
  startAttrs.value = s.startAttrs ? { ...s.startAttrs } : null
  startScore.value = typeof s.startScore === 'number' ? s.startScore : 0
  startDate.value = typeof s.startDate === 'string' ? s.startDate : ''

  // 兼容旧版本：把以"起点 · XXX"为 note 的首条记录迁移成独立的起点快照，
  // 并从 records 中剔除，避免在列表中重复展示
  const baselineIdx = all.findIndex((r) => /^起点\s*·/.test(r.note || ''))
  if (baselineIdx >= 0) {
    const b = all[baselineIdx]
    if (!startAttrs.value) startAttrs.value = { ...b.attrs }
    if (!startScore.value) startScore.value = b.score || 0
    if (!startDate.value) startDate.value = b.date
    all.splice(baselineIdx, 1)
  }
  records.value = all

  // 如果发生过迁移，立即落盘新结构
  if (baselineIdx >= 0) persist()
}
reloadFromStore()

/** 是否已完成初始化（保存过起点 → 显示主界面而非 setup 卡） */
const initialized = computed(() => !!startDate.value && !!startAttrs.value)

watch(activeAccountId, () => {
  modalOpen.value = false
  formError.value = ''
  expandedIds.value = new Set()
  delModalOpen.value = false
  pendingDel.value = null
  guideOpen.value = false
  realmEditOpen.value = false
  reloadFromStore()
  resetSetup()
})

function persist() {
  saveStore({
    records: records.value,
    lastMaterial: lastMaterial.value,
    lastMaterialPrice: lastMaterialPrice.value,
    initialRealm: initialRealm.value,
    targetRealm: targetRealm.value,
    sundayPrice: sundayPrice.value,
    startAttrs: startAttrs.value || undefined,
    startScore: startScore.value,
    startDate: startDate.value,
  })
}

/* ─── 派生 ─── *
 *  数据语义说明：
 *    WeekRecord.attrs  = 本周培养带来的"属性增量"（不是周末快照）
 *    WeekRecord.score  = 本周战阵评分"加分"（不是绝对评分）
 *  通过 startAttrs / startScore 起点 + 历次增量累加，得到累计快照。
 */

/** 倒序展示用 */
const recordsDesc = computed(() => [...records.value].reverse())

/** 累计到第 idx 条（含）的属性快照；idx = -1 表示尚未有任何周，返回起点 */
function cumAttrsAt(idx: number): AttrValues {
  const out: AttrValues = { ...(startAttrs.value || emptyAttrs()) }
  for (let i = 0; i <= idx && i < records.value.length; i++) {
    const a = records.value[i].attrs
    for (const k of ATTRS_BY_POS) {
      out[k.key] = (out[k.key] || 0) + (a[k.key] || 0)
    }
  }
  return out
}
/** 累计到第 idx 条（含）的评分 */
function cumScoreAt(idx: number): number {
  let s = startScore.value || 0
  for (let i = 0; i <= idx && i < records.value.length; i++) {
    s += records.value[i].score || 0
  }
  return s
}
/** 某条记录的累计属性 / 评分 */
function cumAttrsOf(r: WeekRecord): AttrValues {
  const idx = records.value.findIndex((x) => x.id === r.id)
  return cumAttrsAt(idx)
}
function cumScoreOf(r: WeekRecord): number {
  const idx = records.value.findIndex((x) => x.id === r.id)
  return cumScoreAt(idx)
}

/** "最新一条"周记录（不含起点） */
const latest = computed<WeekRecord | undefined>(
  () => records.value[records.value.length - 1],
)
/** 八卦盘 / 总览展示的"当前累计快照"（无周记录时即起点本身） */
const currentCumAttrs = computed(() => cumAttrsAt(records.value.length - 1))
const currentCumScore = computed(() => cumScoreAt(records.value.length - 1))

function latestAttr(k: AttrKey): string {
  return fmtDec(currentCumAttrs.value[k] || 0, 2)
}

const totalCost = computed(() =>
  records.value.reduce((s, r) => s + weeklyCost(r), 0),
)

/* ─── 趋势图 ─── */
type TrendMode = 'attrs' | 'score'
const trendMode = ref<TrendMode>('attrs')

const TREND_W = 720
const TREND_H = 220
const TREND_PAD_L = 44
const TREND_PAD_R = 12
const TREND_PAD_T = 12
const TREND_PAD_B = 28

interface TrendPoint { x: number; y: number; v: number; weekLabel: string }
interface TrendSeries {
  key: string
  label: string
  color: string
  points: TrendPoint[]
  path: string
  /** 用于 Y 轴缩放的系数（v 在参与缩放时会乘以该值；显示时仍按原始 v） */
  scale: number
  /** 图例 / tooltip 中显示的缩放说明，如 "×1/100" */
  scaleNote: string
}

/** 属性级缩放系数：生命增量通常上万，而其他属性多在 0~几百，缩小 100 倍让所有线在同一坐标系下可比 */
const ATTR_TREND_SCALE: Partial<Record<string, number>> = {
  hp: 1 / 100,
}
const ATTR_TREND_SCALE_NOTE: Partial<Record<string, string>> = {
  hp: '(×1/100)',
}

const hoverIdx = ref(-1)

/** 当前 X 轴刻度：每条记录对应一个点；最多 8 个等距标签 */
const trendXTicks = computed(() => {
  const n = records.value.length
  if (n === 0) return []
  const plotW = TREND_W - TREND_PAD_L - TREND_PAD_R
  const step = n > 1 ? plotW / (n - 1) : 0
  const maxLabels = 8
  const stride = n > maxLabels ? Math.ceil(n / maxLabels) : 1
  const out: { x: number; label: string }[] = []
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1 || i % stride === 0) {
      out.push({
        x: TREND_PAD_L + i * step,
        label: records.value[i].note || `第 ${i + 1} 周`,
      })
    }
  }
  return out
})

function buildSeries(
  key: string,
  label: string,
  color: string,
  getter: (i: number) => number,
  scale = 1,
  scaleNote = '',
): TrendSeries {
  const n = records.value.length
  const plotW = TREND_W - TREND_PAD_L - TREND_PAD_R
  const step = n > 1 ? plotW / (n - 1) : 0
  const points: TrendPoint[] = []
  for (let i = 0; i < n; i++) {
    points.push({
      x: TREND_PAD_L + i * step,
      y: 0, // 占位，统一缩放时再算
      v: getter(i),
      weekLabel: records.value[i].note || `第 ${i + 1} 周`,
    })
  }
  return { key, label, color, points, path: '', scale, scaleNote }
}

const rawSeries = computed<TrendSeries[]>(() => {
  if (records.value.length === 0) return []
  if (trendMode.value === 'score') {
    return [buildSeries('score', '评分加分', '#d97706', (i) => records.value[i].score || 0)]
  }
  // 属性：只展示当前目标境界已解锁的项（避免一堆 0 线）
  return goalRealmAttrs.value.map((a) => {
    const scale = ATTR_TREND_SCALE[a.key] ?? 1
    const note = ATTR_TREND_SCALE_NOTE[a.key] ?? ''
    return buildSeries(
      a.key,
      a.label,
      a.color,
      (i) => records.value[i].attrs[a.key] || 0,
      scale,
      note,
    )
  })
})

/** 全局 y 轴范围（按"缩放后"的值统一，最小值视作 0） */
const yRange = computed(() => {
  let max = 0
  for (const s of rawSeries.value) {
    for (const p of s.points) max = Math.max(max, p.v * s.scale)
  }
  if (max <= 0) max = 1
  // 向上取一个友好的整数：例如 23 → 30、150 → 200
  const pow = Math.pow(10, Math.floor(Math.log10(max)))
  const mult = max / pow
  let niceMult = 1
  if (mult <= 1) niceMult = 1
  else if (mult <= 2) niceMult = 2
  else if (mult <= 5) niceMult = 5
  else niceMult = 10
  return { min: 0, max: niceMult * pow }
})

const trendYTicks = computed(() => {
  const { min, max } = yRange.value
  const plotH = TREND_H - TREND_PAD_T - TREND_PAD_B
  const steps = 4
  const out: { y: number; v: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const v = min + (max - min) * (1 - i / steps)
    // i=0 是顶 (max)；i=steps 是底 (min)
    const y = TREND_PAD_T + (plotH * i) / steps
    out.push({ y, v })
  }
  return out
})

/** 按 yRange 把每个点的 y 坐标算出来，并组装 polyline 的 points 字符串（y 用缩放后的值） */
const trendSeries = computed<TrendSeries[]>(() => {
  const { min, max } = yRange.value
  const plotH = TREND_H - TREND_PAD_T - TREND_PAD_B
  return rawSeries.value.map((s) => {
    const pts = s.points.map((p) => {
      const scaled = p.v * s.scale
      const ratio = (scaled - min) / (max - min || 1)
      const y = TREND_PAD_T + plotH * (1 - ratio)
      return { ...p, y }
    })
    return {
      ...s,
      points: pts,
      path: pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
    }
  })
})

/* ─── 趋势图：hover 交互 ─── */

/** 每周点的 X 坐标（SVG viewBox 坐标系） */
const trendPointXs = computed<number[]>(() => {
  const n = records.value.length
  if (n === 0) return []
  const plotW = TREND_W - TREND_PAD_L - TREND_PAD_R
  const step = n > 1 ? plotW / (n - 1) : 0
  const out: number[] = []
  for (let i = 0; i < n; i++) out.push(TREND_PAD_L + i * step)
  return out
})

/** 透明 hover 矩形区域（按周列） */
const trendHoverBands = computed<{ x: number; w: number }[]>(() => {
  const xs = trendPointXs.value
  const n = xs.length
  if (n === 0) return []
  const leftEdge = TREND_PAD_L
  const rightEdge = TREND_W - TREND_PAD_R
  return xs.map((x, i) => {
    const prev = i === 0 ? leftEdge : (xs[i - 1] + x) / 2
    const next = i === n - 1 ? rightEdge : (x + xs[i + 1]) / 2
    return { x: prev, w: Math.max(1, next - prev) }
  })
})

/** 当前 hover 列的 X 坐标 */
const trendHoverX = computed<number | null>(() =>
  hoverIdx.value >= 0 ? trendPointXs.value[hoverIdx.value] ?? null : null,
)

/** tooltip 数据 + 定位（以 % 表示，避免受 SVG preserveAspectRatio="none" 影响） */
const trendTooltip = computed(() => {
  const idx = hoverIdx.value
  if (idx < 0) return null
  const rec = records.value[idx]
  if (!rec) return null
  const rows = trendSeries.value.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    text: fmtTrendVal(s.points[idx]?.v ?? 0) + (s.scaleNote ? ' ' + s.scaleNote : ''),
  }))
  const x = trendPointXs.value[idx] ?? 0
  const leftPct = (x / TREND_W) * 100
  // tooltip 默认在右侧；若太靠右则改放左侧
  const placeRight = leftPct < 65
  const style: Record<string, string> = {
    left: `${leftPct}%`,
    top: '8px',
    transform: placeRight ? 'translate(8px, 0)' : 'translate(calc(-100% - 8px), 0)',
  }
  return {
    weekLabel: rec.note || `第 ${idx + 1} 周`,
    date: rec.date || '',
    rows,
    style,
  }
})

function fmtTrendY(v: number): string {
  if (v >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + 'w'
  if (v >= 1000) return (v / 1000).toFixed(v % 1000 === 0 ? 0 : 1) + 'k'
  if (v === Math.floor(v)) return String(v)
  return v.toFixed(1)
}
function fmtTrendVal(v: number): string {
  if (Math.abs(v) >= 10000) return v.toLocaleString('zh-CN')
  if (v === Math.floor(v)) return String(v)
  return v.toFixed(2)
}

function fmtDelta(n: number): string {
  if (!n) return '0'
  return (n > 0 ? '+' : '') + fmtInt(n)
}
/** 属性增量：保留两位小数（去尾随 0），带 ± 前缀 */
function fmtDeltaDec(n: number, digits = 2): string {
  // 浮点误差兜底：绝对值小于 1e-9 视为 0
  if (Math.abs(n) < 1e-9) return '0'
  return (n > 0 ? '+' : '') + fmtDec(n, digits)
}

/* ─── 折叠/展开 ─── */
const expandedIds = ref<Set<string>>(new Set())
function isExpanded(id: string): boolean {
  return expandedIds.value.has(id)
}
function toggleExpand(id: string) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}

/* ─── 添加 / 编辑 弹窗 ─── */
const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const form = reactive<{
  date: string
  note: string
  score: number
  attrs: AttrValues
  counts: WeeklyCounts
  material: string
  materialQty: number
  materialPrice: number
}>({
  date: todayStr(),
  note: '',
  score: 0,
  attrs: emptyAttrs(),
  counts: emptyCounts(),
  material: '精要',
  materialQty: 0,
  materialPrice: 0,
})

const defaultNote = computed(() => '第 ' + (records.value.length + 1) + ' 周')

const totalCountPreview = computed(() => totalCounts(form.counts))
const weekCostPreview = computed(() =>
  weeklyCost({ materialQty: form.materialQty, materialPrice: form.materialPrice }),
)

/**
 * 表单"本周之前"的累计快照。
 * 用户输入框里填的是「本周结束时的累计值」，提交时再用本快照算出存储用的"本周增量"。
 * - 新增：取当前所有 records 累加（即"现在的最新累计"）
 * - 编辑：取被编辑记录前一条结尾时的累计快照
 */
const formCumBefore = reactive({
  attrs: emptyAttrs() as AttrValues,
  score: 0,
})
/** 本周增量 = 当前输入(累计) - 本周之前累计 */
function formAttrDelta(k: AttrKey): number {
  return (form.attrs[k] || 0) - (formCumBefore.attrs[k] || 0)
}
const formScoreDelta = computed(() => (form.score || 0) - (formCumBefore.score || 0))

function setFormBaseline(beforeIdx: number) {
  formCumBefore.attrs = cumAttrsAt(beforeIdx)
  formCumBefore.score = cumScoreAt(beforeIdx)
}

function resetForm() {
  form.date = todayStr()
  form.note = ''
  form.counts = emptyCounts()
  form.material = lastMaterial.value || '精要'
  form.materialQty = 0
  form.materialPrice = lastMaterialPrice.value || 0
  formError.value = ''
  // 默认预填：表单值 = 本周之前的累计（用户在此基础上往上加即可）
  form.attrs = { ...formCumBefore.attrs }
  form.score = formCumBefore.score
}

function openAdd() {
  editingId.value = null
  // 先设置基线，resetForm 会读它
  setFormBaseline(records.value.length - 1)
  resetForm()
  modalOpen.value = true
}

function openEdit(r: WeekRecord) {
  editingId.value = r.id
  // 编辑：基线 = 被编辑记录之前的累计（不含本身）
  const idx = records.value.findIndex((x) => x.id === r.id)
  setFormBaseline(idx - 1)

  form.date = r.date
  form.note = r.note
  // 表单值 = 本周之前累计 + 本周增量（即本周结束时的累计）
  form.score = (formCumBefore.score || 0) + (r.score || 0)
  form.attrs = { ...formCumBefore.attrs }
  for (const a of ATTRS_BY_POS) {
    form.attrs[a.key] = (formCumBefore.attrs[a.key] || 0) + (r.attrs[a.key] || 0)
  }
  form.counts = { ...r.counts }
  form.material = r.material
  form.materialQty = r.materialQty
  form.materialPrice = r.materialPrice
  formError.value = ''
  modalOpen.value = true
}

function submit() {
  formError.value = ''
  if (!form.date) {
    formError.value = '请填写日期'
    return
  }
  if (totalCountPreview.value > WEEKLY_LIMIT) {
    formError.value = `本周修炼次数已超过 ${WEEKLY_LIMIT} 次（当前 ${totalCountPreview.value} 次）`
    return
  }
  const note = form.note || defaultNote.value

  // 表单存的是"累计快照"，存进 records 前要换算回"本周增量"
  // 属性差值四舍五入到两位小数，规避浮点误差（如 73.5-72.84=0.6599…）
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
  const deltaAttrs = emptyAttrs()
  for (const a of ATTRS_BY_POS) {
    deltaAttrs[a.key] = round2((form.attrs[a.key] || 0) - (formCumBefore.attrs[a.key] || 0))
  }
  // 评分仍按整数（游戏内评分本身是整数）
  const deltaScore = Math.round((form.score || 0) - (formCumBefore.score || 0))

  if (editingId.value) {
    const idx = records.value.findIndex((x) => x.id === editingId.value)
    if (idx >= 0) {
      records.value[idx] = {
        ...records.value[idx],
        date: form.date,
        note,
        score: deltaScore,
        attrs: deltaAttrs,
        counts: { ...form.counts },
        material: form.material,
        materialQty: form.materialQty,
        materialPrice: form.materialPrice,
      }
    }
  } else {
    records.value.push({
      id: genId(),
      date: form.date,
      note,
      score: deltaScore,
      attrs: deltaAttrs,
      counts: { ...form.counts },
      material: form.material,
      materialQty: form.materialQty,
      materialPrice: form.materialPrice,
    })
  }
  records.value.sort((a, b) => a.date.localeCompare(b.date))

  // 记忆最近材料 / 价格
  if (form.material) lastMaterial.value = form.material
  if (form.materialPrice) lastMaterialPrice.value = form.materialPrice

  persist()
  modalOpen.value = false
}

/* ─── 删除确认 ─── */
const delModalOpen = ref(false)
const pendingDel = ref<WeekRecord | null>(null)
function confirmDel(r: WeekRecord) {
  pendingDel.value = r
  delModalOpen.value = true
}
function cancelDel() {
  delModalOpen.value = false
  pendingDel.value = null
}
function doDel() {
  const r = pendingDel.value
  if (!r) {
    delModalOpen.value = false
    return
  }
  const idx = records.value.findIndex((x) => x.id === r.id)
  if (idx >= 0) records.value.splice(idx, 1)
  persist()
  delModalOpen.value = false
  pendingDel.value = null
}

/* ─── 境界说明（只读参考表） ─── */
const guideOpen = ref(false)

/* ─── 境界说明：基于公共数据 ─── */
const REALM_UNLOCKS = REALMS.map((r) => ({
  name: r.name,
  tier: r.tier,
  unlock: r.unlockText,
  color: r.color,
  baseEntries: r.unlocks.map((k) => {
    const spec = ATTRS_BY_POS.find((a) => a.key === k)!
    return {
      key: k,
      short: spec.short,
      color: spec.color,
      value: r.base[k] || 0,
    }
  }),
}))

const REALM_UPGRADES = (() => {
  const list: {
    from: RealmName; to: RealmName
    fromColor: string; toColor: string
    runs: number; runsCum: number
    /** 每次消耗 */
    perSunday: number; perGold: number
    /** 这一段累计消耗 */
    totalSundays: number; totalGold: number
  }[] = []
  let cum = 0
  for (let i = 1; i < REALMS.length; i++) {
    const prev = REALMS[i - 1]
    const cur = REALMS[i]
    cum += cur.upgrade.runs
    list.push({
      from: prev.name, to: cur.name,
      fromColor: prev.color, toColor: cur.color,
      runs: cur.upgrade.runs, runsCum: cum,
      perSunday: cur.upgrade.sundays, perGold: cur.upgrade.gold,
      totalSundays: cur.upgrade.runs * cur.upgrade.sundays,
      totalGold: cur.upgrade.runs * cur.upgrade.gold,
    })
  }
  return list
})()

/* ─── 当前境界 + 累计升级消耗 ─── */
/** 起点境界 spec */
const startRealm = computed(() => REALM_BY_NAME[initialRealm.value] || REALM_BY_NAME[DEFAULT_REALM])
/** 目标境界 spec */
const goalRealm = computed(() => REALM_BY_NAME[targetRealm.value] || REALM_BY_NAME[DEFAULT_REALM])
/** 当前境界 = 起点境界（用于属性解锁、表头徽章） */
const currentRealm = computed(() => startRealm.value)
/** 目标境界已解锁的属性（添加记录时优先展示这些） */
const goalRealmAttrs = computed(() => unlockedAttrsBy(targetRealm.value))
/** 是否设置了真正的目标（高于起点） */
const hasUpgradePlan = computed(() => goalRealm.value.tier > startRealm.value.tier)
/** 起点 → 目标的累计升级消耗 */
const realmCost = computed(() => realmRangeCost(initialRealm.value, targetRealm.value))
/** 升级累计金币（万） */
const totalUpgradeGold = computed(() => realmCost.value.gold)
const totalSundays = computed(() => realmCost.value.sundays)
/** 把日月按单价折算回三国币（万） */
const totalSundayCost = computed(() => totalSundays.value * (sundayPrice.value || 0))
/** 境界提升总花费（万） = 升级三国币 + 日月折算 */
const totalUpgradeAll = computed(() => totalUpgradeGold.value + totalSundayCost.value)
/** 累计成本（万） = 境界提升 + 周材料 */
const totalCostAll = computed(() => totalUpgradeAll.value + totalCost.value)

/** 解锁的属性顺序（按八卦盘顺序） */
function unlockedAttrsBy(realm: RealmName) {
  const set = new Set(REALM_BY_NAME[realm].unlocks)
  return ATTRS_BY_POS.filter((a) => set.has(a.key))
}

/* ─── 初始化 setup 向导 ─── */
const setupForm = reactive<{
  realm: RealmName
  goal: RealmName
  attrs: AttrValues
  goalAttrs: AttrValues
  score: number
  date: string
  sundayPrice: number
}>({
  realm: initialRealm.value || DEFAULT_REALM,
  goal: targetRealm.value || initialRealm.value || DEFAULT_REALM,
  attrs: realmBaseAttrs(initialRealm.value || DEFAULT_REALM),
  goalAttrs: realmBaseAttrs(targetRealm.value || initialRealm.value || DEFAULT_REALM),
  score: 0,
  date: todayStr(),
  sundayPrice: sundayPrice.value || 0,
})
const setupError = ref('')
const setupVisibleAttrs = computed(() => unlockedAttrsBy(setupForm.realm))
const setupGoalVisibleAttrs = computed(() => unlockedAttrsBy(setupForm.goal))
const setupRangeCost = computed(() => realmRangeCost(setupForm.realm, setupForm.goal))
const setupHasUpgrade = computed(
  () => REALM_BY_NAME[setupForm.goal].tier > REALM_BY_NAME[setupForm.realm].tier,
)

function pickRealm(name: RealmName) {
  setupForm.realm = name
  // 切换境界 → 起点属性整体重填为该境界的基础值（未解锁的字段保持 0）
  setupForm.attrs = realmBaseAttrs(name)
  // 目标境界自动顺延：不允许低于起点
  if (REALM_BY_NAME[setupForm.goal].tier < REALM_BY_NAME[name].tier) {
    pickGoal(name)
  }
}
function pickGoal(name: RealmName) {
  // 限制目标 >= 起点
  const startTier = REALM_BY_NAME[setupForm.realm].tier
  const final =
    REALM_BY_NAME[name].tier < startTier ? setupForm.realm : name
  setupForm.goal = final
  // 切换目标 → 目标属性整体重填为该境界的基础值
  setupForm.goalAttrs = realmBaseAttrs(final)
}
function resetSetup() {
  const r = initialRealm.value || DEFAULT_REALM
  const g = targetRealm.value || r
  setupForm.realm = r
  setupForm.goal = g
  setupForm.attrs = realmBaseAttrs(r)
  setupForm.goalAttrs = realmBaseAttrs(g)
  setupForm.score = 0
  setupForm.date = todayStr()
  setupForm.sundayPrice = sundayPrice.value || 0
  setupError.value = ''
}
function confirmSetup() {
  setupError.value = ''
  if (!setupForm.date) {
    setupError.value = '请选择起始日期'
    return
  }
  if (REALM_BY_NAME[setupForm.goal].tier < REALM_BY_NAME[setupForm.realm].tier) {
    setupError.value = '目标境界不能低于起点境界'
    return
  }
  if (setupForm.score < 0) {
    setupForm.score = 0
  }
  // 仅保存"起点境界"解锁属性的值，未解锁的全部归 0
  const attrs = emptyAttrs()
  const allowed = new Set(REALM_BY_NAME[setupForm.realm].unlocks)
  for (const a of ATTRS_BY_POS) {
    if (allowed.has(a.key)) attrs[a.key] = setupForm.attrs[a.key] || 0
  }

  initialRealm.value = setupForm.realm
  targetRealm.value = setupForm.goal
  sundayPrice.value = setupForm.sundayPrice || 0

  // 保存起点快照（独立字段，不写入 records 列表）
  startAttrs.value = attrs
  startScore.value = setupForm.score
  startDate.value = setupForm.date

  persist()
}

/* ─── 调整境界（已有记录后用） ─── */
const realmEditOpen = ref(false)
const realmEditForm = reactive<{
  realm: RealmName
  goal: RealmName
  sundayPrice: number
}>({
  realm: DEFAULT_REALM,
  goal: DEFAULT_REALM,
  sundayPrice: 0,
})
const realmEditRangeCost = computed(() =>
  realmRangeCost(realmEditForm.realm, realmEditForm.goal),
)
function openRealmEdit() {
  realmEditForm.realm = initialRealm.value
  realmEditForm.goal = targetRealm.value || initialRealm.value
  realmEditForm.sundayPrice = sundayPrice.value || 0
  realmEditOpen.value = true
}
function pickEditRealm(name: RealmName) {
  realmEditForm.realm = name
  if (REALM_BY_NAME[realmEditForm.goal].tier < REALM_BY_NAME[name].tier) {
    realmEditForm.goal = name
  }
}
function pickEditGoal(name: RealmName) {
  const startTier = REALM_BY_NAME[realmEditForm.realm].tier
  realmEditForm.goal =
    REALM_BY_NAME[name].tier < startTier ? realmEditForm.realm : name
}
function saveRealmEdit() {
  initialRealm.value = realmEditForm.realm
  targetRealm.value = realmEditForm.goal
  sundayPrice.value = realmEditForm.sundayPrice || 0
  persist()
  realmEditOpen.value = false
}
</script>

<style scoped>
.page {
  min-height: 100%;
  padding: 16px;
  box-sizing: border-box;
}
.container {
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ── 卡片头 ── */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  flex-wrap: wrap;
  gap: 6px;
}
.card-title {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
}
.card-hint {
  font-size: 12px;
  color: #a89572;
  font-weight: 700;
}
.hl-score {
  color: #d97706;
  font-weight: 800;
  margin-left: 2px;
}
.head-ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ── 八卦盘：4×4 网格 ── */
.octagon {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(4, minmax(64px, auto));
  gap: 10px;
  padding: 8px 4px;
  background:
    radial-gradient(ellipse at center, #fff7d4 0%, #fffdf3 60%, #fffdf3 100%);
  border: 1.5px dashed #e7dcb1;
  border-radius: 14px;
}

/* 各位置：与 ATTRS 中 pos 对应（图 1 的八边形） */
.oct-slot.p-0 { grid-column: 2 / 3; grid-row: 1 / 2; }
.oct-slot.p-1 { grid-column: 3 / 4; grid-row: 1 / 2; }
.oct-slot.p-2 { grid-column: 1 / 2; grid-row: 2 / 3; }
.oct-slot.p-3 { grid-column: 4 / 5; grid-row: 2 / 3; }
.oct-slot.p-4 { grid-column: 1 / 2; grid-row: 3 / 4; }
.oct-slot.p-5 { grid-column: 4 / 5; grid-row: 3 / 4; }
.oct-slot.p-6 { grid-column: 2 / 3; grid-row: 4 / 5; }
.oct-slot.p-7 { grid-column: 3 / 4; grid-row: 4 / 5; }

.oct-card {
  --accent: #d97706;
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-top: 4px solid var(--accent);
  border-radius: 12px;
  padding: 8px 10px;
  text-align: center;
  box-shadow: 0 2px 0 #e0d293;
  display: flex;
  flex-direction: column;
  gap: 2px;
  height: 100%;
  box-sizing: border-box;
}
.oct-name {
  font-size: 12px;
  font-weight: 800;
  color: var(--accent);
  letter-spacing: 0.4px;
}
.oct-value {
  font-size: 18px;
  font-weight: 800;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}
.oct-delta {
  font-size: 11px;
  font-weight: 800;
  color: #a89572;
}

/* 中心：太极 + 评分 */
.oct-center {
  grid-column: 2 / 4;
  grid-row: 2 / 4;
  display: flex;
  align-items: center;
  justify-content: center;
}
.taiji {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 50%, #fff7d4 0%, #f5edc4 70%, #e7dcb1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    inset 0 0 0 4px #f7cd67,
    inset 0 0 0 6px #fffdf3,
    inset 0 0 0 8px #d97706,
    0 6px 16px rgba(247, 205, 103, 0.35);
}
.taiji-inner {
  position: absolute;
  inset: 16px;
  border-radius: 50%;
  overflow: hidden;
  background:
    linear-gradient(90deg, #5d4a32 50%, #fffdf3 50%);
  opacity: 0.35;
}
.taiji-light {
  position: absolute;
  top: 0;
  left: 50%;
  width: 50%;
  height: 50%;
  background: #fffdf3;
  border-radius: 0 50% 50% 50%;
}
.taiji-dark {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 50%;
  height: 50%;
  background: #5d4a32;
  border-radius: 50% 0 50% 50%;
}
.taiji-dot {
  position: absolute;
  width: 14px;
  height: 14px;
  border-radius: 50%;
}
.taiji-dot.light-dot {
  background: #fffdf3;
  bottom: 18%;
  left: 18%;
}
.taiji-dot.dark-dot {
  background: #5d4a32;
  top: 18%;
  right: 18%;
}
.taiji-rating {
  position: relative;
  z-index: 2;
  background: rgba(255, 253, 243, 0.92);
  border: 1.5px solid #f7cd67;
  border-radius: 12px;
  padding: 8px 14px;
  text-align: center;
  box-shadow: 0 2px 0 rgba(247, 205, 103, 0.45);
}
.taiji-rating-label {
  font-size: 11px;
  font-weight: 800;
  color: #b56e3f;
  letter-spacing: 0.6px;
}
.taiji-rating-value {
  font-size: 22px;
  font-weight: 900;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
  line-height: 1.15;
}
.taiji-rating-delta {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 800;
  color: #9a835a;
}

/* ── 总览 ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.stat {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
}
.stat-label {
  font-size: 11px;
  color: #9a835a;
  font-weight: 700;
}
.stat-value {
  margin-top: 4px;
  font-size: 18px;
  font-weight: 800;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
}
.cost-sun {
  color: #b56e3f;
  font-weight: 900;
  margin-right: 2px;
}
.cost-unit {
  font-size: 12px;
  font-weight: 800;
  color: #9a835a;
}
.stat.full {
  grid-column: 1 / -1;
  background: linear-gradient(180deg, #fff7d4 0%, #fde9b6 100%);
  border-style: solid;
  border-color: #f7cd67;
}
.stat.full .stat-label {
  color: #8a5d10;
}
.stat.full .stat-value {
  font-size: 22px;
}
.stat.full.cost-summary {
  padding: 12px 16px;
  text-align: left;
}
.stat-sub {
  margin-left: 4px;
  font-size: 10.5px;
  font-weight: 700;
  color: #c0a878;
  letter-spacing: 0.2px;
}
.hl-total {
  color: #d97706;
  font-weight: 900;
  margin-right: 6px;
  letter-spacing: 0.4px;
}

/* ── 累计成本明细 ── */
.cost-summary {
  text-align: left;
  padding: 12px 16px;
}
.cs-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  margin-bottom: 10px;
}
.cs-title {
  font-size: 13.5px;
  font-weight: 900;
  color: #8a5d10;
  letter-spacing: 0.3px;
}
.cs-sub {
  font-size: 11.5px;
  font-weight: 700;
  color: #b56e3f;
}
.cs-body {
  display: flex;
  align-items: stretch;
  gap: 8px;
  flex-wrap: wrap;
}
.cs-item {
  flex: 1 1 0;
  min-width: 140px;
  background: rgba(255, 253, 243, 0.78);
  border: 1.5px dashed #f7cd67;
  border-radius: 10px;
  padding: 8px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.cs-item-label {
  font-size: 11.5px;
  font-weight: 800;
  color: #9a835a;
  letter-spacing: 0.3px;
}
.cs-item-hint {
  display: block;
  margin-top: 1px;
  font-size: 10.5px;
  font-weight: 700;
  color: #b56e3f;
  letter-spacing: 0.2px;
}
.cs-item-hint.warn { color: #c0a878; font-style: italic; }
.cs-item-value {
  font-size: 18px;
  font-weight: 900;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.3px;
}
.cs-plus, .cs-eq {
  display: inline-flex;
  align-items: center;
  font-size: 20px;
  font-weight: 900;
  color: #b56e3f;
  padding: 0 2px;
}
.cs-eq { color: #d97706; font-size: 22px; }
.cs-total {
  flex: 1.2 1 0;
  min-width: 160px;
  background: linear-gradient(180deg, #f7cd67 0%, #f0b94a 100%);
  border: 1.5px solid #d97706;
  border-radius: 12px;
  padding: 10px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  box-shadow: 0 2px 0 rgba(217, 119, 6, 0.25);
}
.cs-total-label {
  font-size: 11.5px;
  font-weight: 900;
  color: #5d4a32;
  letter-spacing: 0.6px;
}
.cs-total-value {
  font-size: 24px;
  font-weight: 900;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.4px;
}

@media (max-width: 720px) {
  .cs-body {
    flex-direction: column;
    align-items: stretch;
  }
  .cs-plus, .cs-eq { display: none; }
}

/* ── 趋势图 ── */
.trend-tabs {
  display: inline-flex;
  align-items: stretch;
  background: #fffaf0;
  border: 1.5px solid #e7dcb1;
  border-radius: 999px;
  padding: 2px;
}
.trend-tab {
  font-family: inherit;
  font-size: 12px;
  font-weight: 800;
  color: #9a835a;
  background: transparent;
  border: none;
  padding: 4px 14px;
  border-radius: 999px;
  cursor: pointer;
  letter-spacing: 0.4px;
  transition: background 0.15s, color 0.15s;
}
.trend-tab:hover { color: #b56e3f; }
.trend-tab.active {
  background: linear-gradient(180deg, #f7cd67 0%, #f0b94a 100%);
  color: #5d4a32;
  box-shadow: 0 1px 0 rgba(217, 119, 6, 0.25);
}
.trend-wrap {
  background:
    linear-gradient(180deg, #fffdf3 0%, #fffaf0 100%);
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
}
.trend-stage {
  position: relative;
  width: 100%;
}
.trend-svg {
  display: block;
  width: 100%;
  height: 240px;
  overflow: visible;
}
.trend-hover-bands rect {
  cursor: crosshair;
}
.trend-hover-line {
  stroke: #b56e3f;
  stroke-width: 1;
  stroke-dasharray: 2 3;
  opacity: 0.55;
  pointer-events: none;
}
.trend-dot {
  transition: r 0.12s;
}
.trend-dot.active {
  stroke: #fff;
  stroke-width: 1.5;
}
.trend-tooltip {
  position: absolute;
  z-index: 5;
  min-width: 150px;
  max-width: 240px;
  background: #5d4a32;
  color: #fffdf3;
  border-radius: 8px;
  padding: 8px 10px 9px;
  box-shadow: 0 4px 14px rgba(93, 74, 50, 0.28);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.3px;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
}
.trend-tooltip .tt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 5px;
  margin-bottom: 5px;
  border-bottom: 1px dashed rgba(247, 205, 103, 0.45);
}
.trend-tooltip .tt-week {
  color: #f7cd67;
  font-size: 12px;
  font-weight: 800;
}
.trend-tooltip .tt-date {
  color: #d8c89a;
  font-size: 10.5px;
}
.trend-tooltip .tt-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.trend-tooltip .tt-row {
  display: flex;
  align-items: center;
  gap: 6px;
  line-height: 1.45;
}
.trend-tooltip .tt-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.18);
}
.trend-tooltip .tt-label {
  flex: 1;
  color: #f4eccd;
}
.trend-tooltip .tt-val {
  color: #fff;
  font-weight: 800;
}
.trend-grid line {
  stroke: #e7dcb1;
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.trend-axis text {
  fill: #9a835a;
  font-size: 10.5px;
  font-weight: 700;
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}
.trend-axis.x text { fill: #b56e3f; }
.trend-legend {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  padding: 6px 4px 0;
  border-top: 1px dashed #e7dcb1;
}
.legend-chip {
  --accent: #b56e3f;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11.5px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.3px;
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px #fffdf3;
}

.pos { color: #d97706; font-weight: 800; }
.neg { color: #4a90c8; font-weight: 800; }

/* ── 周记录列表 ── */
.empty-block {
  padding: 28px 10px;
  text-align: center;
  color: #a89572;
  font-style: italic;
  font-size: 13px;
}
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rec-card {
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.rec-card.expanded {
  border-color: #f7cd67;
  box-shadow: 0 2px 0 rgba(247, 205, 103, 0.18);
}
.rec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  border-radius: 10px;
  outline: none;
  margin: -4px;
  padding: 4px;
  transition: background 0.15s;
}
.rec-head:hover { background: rgba(247, 205, 103, 0.08); }
.rec-head:focus-visible { box-shadow: 0 0 0 2px #f7cd67; }
.rec-card.expanded .rec-head { margin-bottom: 6px; }
.rec-chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  font-size: 12px;
  font-weight: 800;
  color: #b56e3f;
  transition: transform 0.2s ease;
}
.rec-chevron.open { transform: rotate(90deg); }

.rec-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.head-tag {
  display: inline-flex;
  align-items: stretch;
  height: 26px;
  border-radius: 999px;
  overflow: hidden;
  font-size: 12.5px;
  font-weight: 800;
  line-height: 1;
  border: 1.5px solid transparent;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
}
.head-tag-label {
  display: inline-flex;
  align-items: center;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.4px;
  background: rgba(255, 255, 255, 0.92);
}
.head-tag-value {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  letter-spacing: 0.3px;
  font-variant-numeric: tabular-nums;
}
.head-tag.week { background: #c8e1c8; border-color: #8ac68a; }
.head-tag.week .head-tag-label { color: #3f7a3f; }
.head-tag.week .head-tag-value { color: #2f5d2f; }

.head-tag.date { background: #f7cd67; border-color: #e6b94c; }
.head-tag.date .head-tag-label { color: #8a5d10; }
.head-tag.date .head-tag-value { color: #5d4a32; }

.head-tag.score { background: #f7b48a; border-color: #e89266; }
.head-tag.score .head-tag-label { color: #8a4a1f; }
.head-tag.score .head-tag-value { color: #5d4a32; }

.head-tag.delta.pos { background: #ffe2c2; border-color: #f7b48a; }
.head-tag.delta.pos .head-tag-label { color: #8a4a1f; }
.head-tag.delta.pos .head-tag-value { color: #d97706; }
.head-tag.delta.neg { background: #d8e7f4; border-color: #a8c8e3; }
.head-tag.delta.neg .head-tag-label { color: #2e5a85; }
.head-tag.delta.neg .head-tag-value { color: #4a90c8; }

.rec-ops {
  display: flex;
  gap: 6px;
}
.op-btn {
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
}
.op-btn:hover { background: #fff8de; }
.op-btn.danger { color: #fc736d; border-color: #fac9c5; }
.op-btn.danger:hover { background: #fde9e7; }

/* ── 折叠预览 ── */
.rec-preview {
  margin-top: 8px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding: 8px 14px;
  background: linear-gradient(180deg, #fffaf0 0%, #fff7d4 100%);
  border: 1.5px dashed #e7dcb1;
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}
.rec-preview:hover {
  border-color: #f7cd67;
  background: linear-gradient(180deg, #fff7d4 0%, #fde9b6 100%);
}
.prev-item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-variant-numeric: tabular-nums;
}
.prev-label {
  font-size: 11.5px;
  font-weight: 700;
  color: #9a835a;
}
.prev-value {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.2px;
}
.prev-value.mini { font-size: 12.5px; }
.prev-value.pos { color: #d97706; }
.prev-mat-qty {
  font-size: 12px;
  font-weight: 800;
  color: #b56e3f;
  margin-left: 2px;
}
.prev-divider {
  width: 1px;
  height: 16px;
  background: #e7dcb1;
}
.prev-expand {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 800;
  color: #b56e3f;
  letter-spacing: 0.4px;
}

/* ── 展开：表格 ── */
.table-scroll {
  overflow-x: auto;
  margin-top: 8px;
}
.rec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12.5px;
  color: #5d4a32;
}
.rec-table th,
.rec-table td {
  padding: 8px 10px;
  text-align: center;
  border-bottom: 1px dashed #e7dcb1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.rec-table th {
  background: #f5edc4;
  font-weight: 800;
  color: #725d42;
}
.rec-table th.grp { background: #f0e0a0; letter-spacing: 0.5px; }
.rec-table th.sub { background: #faf3d0; font-size: 12px; }
.rec-table .strong { font-weight: 800; color: #d97706; }
.rec-table tr.delta-row td {
  background: #fffaf0;
  font-size: 11.5px;
  font-weight: 800;
  color: #a89572;
  border-bottom: none;
  padding: 4px 10px 6px;
  letter-spacing: 0.3px;
}
.rec-table tr.delta-row td.strong {
  color: #b56e3f;
  font-weight: 800;
}
.rec-table tr.delta-row td.pos { color: #d97706; }
.rec-table tr.delta-row td.neg { color: #4a90c8; }

/* ── 展开：汇总徽章 ── */
.rec-summary {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.sum-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px 10px;
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  text-align: center;
}
.sum-chip.highlight {
  background: #fff7d4;
  border-color: #f7cd67;
  box-shadow: inset 0 0 0 1px rgba(247, 205, 103, 0.35);
}
.sum-chip-label {
  font-size: 11px;
  font-weight: 800;
  color: #9a835a;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}
.sum-chip-hint {
  font-size: 10px;
  font-weight: 700;
  color: #c0a878;
}
.sum-chip-value {
  font-size: 16px;
  font-weight: 800;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
}
.sum-chip-value.strong { font-size: 18px; color: #b56e3f; }
.sum-chip-value.mat { color: #5d4a32; font-size: 13.5px; }
.sum-chip-value.pos { color: #d97706; }
.mat-qty {
  margin-left: 4px;
  font-size: 12px;
  color: #b56e3f;
}

/* ── 弹窗 ── */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.form-section {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
}
.section-title {
  font-size: 13px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 8px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}
.section-hint {
  font-size: 11px;
  font-weight: 700;
  color: #a89572;
}
.section-hint b { color: #5d4a32; }
.section-hint b.over { color: #fc736d; }
.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.grid-4 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.attr-cell {
  --accent: #d97706;
  background: #fff;
  border: 1.5px solid #e7dcb1;
  border-top: 3px solid var(--accent);
  border-radius: 10px;
  padding: 6px 8px 8px;
}
.field-delta {
  margin-top: 2px;
  font-size: 11px;
  font-weight: 800;
  text-align: right;
  letter-spacing: 0.3px;
  color: #a89572;
  font-variant-numeric: tabular-nums;
}
.field-delta .pos { color: #d97706; }
.field-delta .neg { color: #4a90c8; }
.price-tip {
  margin: 8px 2px 0;
  font-size: 12px;
  font-weight: 700;
  color: #9a835a;
}
.price-tip b { color: #d97706; }

.err {
  margin: 0;
  color: #fc736d;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
}
.modal-actions {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 10px;
  margin-top: 4px;
}

/* ── 删除确认 ── */
.confirm-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 6px 4px 2px;
}
.confirm-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(180deg, #ffe2dd 0%, #fac9c5 100%);
  border: 2px solid #fac9c5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 0 rgba(252, 115, 109, 0.18);
}
.confirm-icon span {
  font-size: 30px;
  font-weight: 900;
  color: #fc736d;
  line-height: 1;
  font-family: 'Georgia', serif;
}
.confirm-text {
  width: 100%;
  text-align: center;
  font-size: 15px;
  font-weight: 800;
  color: #5d4a32;
  line-height: 1.6;
}
.confirm-target { margin-top: 4px; }
.confirm-tip {
  display: inline-block;
  font-size: 12px;
  font-weight: 700;
  color: #b56e3f;
}
.confirm-meta {
  margin-top: 10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: #fffaf0;
  border: 1.5px dashed #e7dcb1;
  border-radius: 10px;
}
.confirm-meta-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  color: #fff;
  background: #d97706;
  letter-spacing: 0.5px;
}
.confirm-meta-range {
  font-size: 13.5px;
  font-weight: 800;
  color: #5d4a32;
}
.confirm-actions {
  width: 100%;
  margin-top: 6px;
}

/* ── 导入示例数据弹窗 ── */
.confirm-icon.import {
  background: linear-gradient(180deg, #fff7d4 0%, #f7cd67 100%);
  border-color: #f7cd67;
  box-shadow: 0 2px 0 rgba(217, 119, 6, 0.18);
}
.confirm-icon.import span {
  font-size: 28px;
  color: #b56e3f;
  font-family: inherit;
}
.confirm-text .hl-import {
  color: #d97706;
  font-weight: 900;
  margin: 0 2px;
}
.import-meta {
  margin-top: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #fffaf0;
  border: 1.5px dashed #e7dcb1;
  border-radius: 999px;
}
.im-tag {
  font-size: 12px;
  font-weight: 800;
  color: #5d4a32;
  letter-spacing: 0.4px;
  padding: 2px 10px;
  background: #f5edc4;
  border-radius: 999px;
}
.im-tag.end {
  background: #f7cd67;
  color: #5d4a32;
}
.im-arr {
  font-weight: 900;
  color: #b56e3f;
}
.import-summary {
  list-style: none;
  margin: 12px 0 0;
  padding: 8px 10px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
  background: #fffaf0;
  border: 1.5px solid #e7dcb1;
  border-radius: 10px;
  text-align: left;
}
.import-summary li {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}
.is-k {
  color: #9a835a;
  font-weight: 700;
}
.is-v {
  color: #5d4a32;
  font-weight: 800;
  letter-spacing: 0.3px;
}
.is-v.pos {
  color: #d97706;
}

/* ── 境界说明按钮 ── */
.title-help {
  margin-left: 8px;
  font-family: inherit;
  font-size: 11.5px;
  font-weight: 800;
  color: #b56e3f;
  background: #fff7d4;
  border: 1.5px solid #f7cd67;
  border-radius: 999px;
  padding: 2px 10px;
  cursor: pointer;
  letter-spacing: 0.3px;
  vertical-align: middle;
  transition: background 0.15s, transform 0.1s;
}
.title-help:hover {
  background: #fde9b6;
}
.title-help:active {
  transform: translateY(1px);
}

/* ── 境界说明弹窗 ── */
.guide-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 2px 2px 0;
}
.guide-section {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
}
.guide-h {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 8px;
  letter-spacing: 0.3px;
}
.guide-bar {
  display: inline-block;
  width: 4px;
  height: 14px;
  background: linear-gradient(180deg, #f7cd67 0%, #d97706 100%);
  border-radius: 2px;
}
.guide-table-wrap {
  overflow-x: auto;
}
.guide-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  color: #5d4a32;
  background: #fffaf0;
  border-radius: 10px;
  overflow: hidden;
}
.guide-table th,
.guide-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px dashed #e7dcb1;
}
.guide-table th {
  background: #f5edc4;
  font-weight: 800;
  color: #725d42;
  font-size: 12.5px;
  letter-spacing: 0.4px;
}
.guide-table tr:last-child td { border-bottom: none; }
.g-name {
  font-weight: 800;
  letter-spacing: 0.5px;
}
.g-tier {
  font-weight: 800;
  color: #b56e3f;
  font-variant-numeric: tabular-nums;
  width: 60px;
}
.g-unlock {
  font-weight: 700;
  color: #5d4a32;
}

.guide-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.guide-list li {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 12px;
  background: #fffaf0;
  border: 1.5px solid #e7dcb1;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
}
.ul-from,
.ul-to {
  font-weight: 800;
  letter-spacing: 0.4px;
}
.ul-arr {
  color: #c0a878;
  font-weight: 800;
}
.ul-sep {
  color: #9a835a;
}
.ul-runs {
  font-weight: 900;
  color: #d97706;
  letter-spacing: 0.3px;
}
.ul-unit {
  margin-left: 1px;
  font-size: 11.5px;
  font-weight: 800;
  color: #b56e3f;
}
.ul-cost {
  font-weight: 700;
  color: #9a835a;
  font-size: 12.5px;
}
.ul-total {
  margin-left: auto;
  font-size: 12.5px;
  font-weight: 700;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
}
.ul-total b {
  font-weight: 900;
  color: #d97706;
}
.guide-h-tip {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: #b56e3f;
  background: #fff7d4;
  border: 1.5px solid #f7cd67;
  border-radius: 999px;
  padding: 1px 8px;
  letter-spacing: 0.3px;
}

.base-chip {
  --accent: #b56e3f;
  display: inline-flex;
  align-items: baseline;
  gap: 2px;
  margin: 2px 4px 2px 0;
  padding: 1px 8px;
  font-size: 11.5px;
  font-weight: 700;
  color: #5d4a32;
  background: #fffaf0;
  border: 1.5px solid var(--accent);
  border-radius: 999px;
  font-variant-numeric: tabular-nums;
}
.base-chip b {
  margin-left: 2px;
  color: var(--accent);
  font-weight: 900;
}
.guide-actions {
  grid-template-columns: 1fr;
}

/* ── 初始化向导 / 调整境界 ── */
.setup {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.setup-block {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 12px;
  padding: 10px 12px 12px;
}
.setup-block.goal {
  background: linear-gradient(180deg, #fffaf0 0%, #fff7d4 100%);
  border-color: #f7cd67;
  border-style: solid;
}
.setup-h {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 10px;
  letter-spacing: 0.3px;
}
.setup-h-text { font-weight: 900; }
.setup-h-tip {
  margin-left: auto;
  font-size: 11.5px;
  font-weight: 700;
  color: #a89572;
  letter-spacing: 0.2px;
}
.setup-h-tip b { color: #d97706; }
.goal-bar {
  background: linear-gradient(180deg, #d97706 0%, #a13c8c 100%) !important;
}

/* 起点 / 目标的属性快照 */
.attr-snapshot {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1.5px dashed #e7dcb1;
}
.attr-snapshot-h {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12.5px;
  font-weight: 800;
  color: #5d4a32;
  margin-bottom: 8px;
}
.snapshot-hint {
  font-size: 11.5px;
  font-weight: 700;
  color: #a89572;
}
.snapshot-hint b { font-weight: 900; }

/* 起点→目标 升级消耗 */
.upgrade-cost {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fffdf3;
  border: 1.5px dashed #f7cd67;
  border-radius: 10px;
}
.uc-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  font-size: 12.5px;
  font-weight: 700;
  color: #5d4a32;
  font-variant-numeric: tabular-nums;
}
.uc-from, .uc-to {
  font-weight: 900;
  letter-spacing: 0.5px;
}
.uc-arr {
  font-weight: 900;
  color: #b56e3f;
}
.uc-sep {
  color: #9a835a;
  font-weight: 700;
}
.uc-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  padding: 2px 10px;
  background: #fffaf0;
  border: 1.5px solid #e7dcb1;
  border-radius: 999px;
}
.uc-chip b {
  font-weight: 900;
  color: #d97706;
}
.uc-days {
  margin-left: auto;
  color: #b56e3f;
  font-weight: 700;
  font-size: 12px;
}
.uc-days b {
  font-weight: 900;
  color: #d97706;
}
.upgrade-empty {
  margin: 10px 2px 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #9a835a;
}

.realm-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}
.realm-grid.compact { grid-template-columns: repeat(3, 1fr); }
.realm-btn {
  --accent: #8a7a55;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 10px 6px 10px;
  background: #fffaf0;
  border: 1.5px solid #e7dcb1;
  border-top: 4px solid var(--accent);
  border-radius: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.15s, border-color 0.15s, background 0.15s;
}
.realm-btn:hover {
  background: #fff7d4;
  border-color: var(--accent);
}
.realm-btn:active { transform: translateY(1px); }
.realm-btn:disabled,
.realm-btn.disabled {
  cursor: not-allowed;
  opacity: 0.4;
  background: #f5edc4;
  border-color: #e7dcb1;
  border-top-color: #cfc193;
  filter: grayscale(0.4);
}
.realm-btn:disabled:hover,
.realm-btn.disabled:hover {
  background: #f5edc4;
  border-color: #e7dcb1;
  transform: none;
}
.realm-btn.active {
  background: #fff7d4;
  border-color: var(--accent);
  box-shadow:
    0 0 0 2px var(--accent),
    inset 0 0 0 1px #fffdf3;
}
.realm-btn.active::after {
  content: '✓';
  position: absolute;
  top: 4px;
  right: 6px;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent);
  color: #fffdf3;
  border-radius: 50%;
  font-size: 10px;
  font-weight: 900;
}
.rb-name {
  font-size: 14px;
  font-weight: 900;
  color: var(--accent);
  letter-spacing: 0.5px;
}
.rb-tier {
  font-size: 10.5px;
  font-weight: 800;
  color: #b56e3f;
  background: #fff7d4;
  border-radius: 999px;
  padding: 1px 8px;
  margin-top: 1px;
}
.rb-unlock {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #9a835a;
  text-align: center;
  line-height: 1.3;
}

.setup-cost {
  margin: 10px 2px 0;
  font-size: 12.5px;
  font-weight: 700;
  color: #9a835a;
  line-height: 1.7;
}
.setup-cost b { font-weight: 900; }
.hl-need { color: #d97706; }
.setup-cost-sub {
  margin-left: 4px;
  color: #b56e3f;
  font-weight: 700;
}
.setup-cost-sub b { color: #d97706; }

.setup-actions {
  width: 100%;
}
.setup-actions.single {
  grid-template-columns: 1fr;
}

/* ── 境界徽章（卡片头） ── */
.realm-badge {
  --accent: #a13c8c;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 6px;
  border-radius: 999px;
  background: #fff7d4;
  border: 1.5px solid var(--accent);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.3px;
  cursor: pointer;
  vertical-align: middle;
  transition: background 0.15s, transform 0.1s;
}
.realm-badge:hover { background: #fde9b6; }
.realm-badge:active { transform: translateY(1px); }
.rb-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 2px #fffdf3;
}
.rb-text {
  color: var(--accent);
  font-weight: 900;
}
.rb-tier-tag {
  font-size: 10.5px;
  font-weight: 800;
  color: #5d4a32;
  background: #f5edc4;
  border-radius: 999px;
  padding: 1px 6px;
}
.realm-badge.goal {
  background: #fff7d4;
  box-shadow: 0 0 0 1px var(--accent) inset;
}
.realm-arrow {
  margin: 0 2px;
  font-weight: 900;
  color: #b56e3f;
  font-size: 13px;
  vertical-align: middle;
}

@media (max-width: 900px) {
  .stats-grid { grid-template-columns: repeat(3, 1fr); }
  .attr-grid { grid-template-columns: repeat(2, 1fr); }
  .rec-summary { grid-template-columns: repeat(2, 1fr); }
  .grid-3 { grid-template-columns: 1fr 1fr; }
  .grid-4 { grid-template-columns: 1fr 1fr; }
  .head-tag { font-size: 12px; height: 24px; }
  .head-tag-label { padding: 0 8px; }
  .head-tag-value { padding: 0 10px; }
  .prev-divider { display: none; }
  .prev-expand { margin-left: 0; }
  .taiji { width: 140px; height: 140px; }
  .taiji-rating-value { font-size: 18px; }
  .realm-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .attr-grid { grid-template-columns: 1fr 1fr; }
  .realm-grid { grid-template-columns: 1fr; }
}
</style>
