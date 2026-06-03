<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-green">个人中心</Card>

      <!-- 当前账户卡片 -->
      <Card>
        <div class="profile-head">
          <div class="avatar">{{ activeAccount?.avatar || '🦊' }}</div>
          <div class="info">
            <div class="nick">{{ activeAccount?.nickname || '旅行者' }}</div>
            <div class="sub">
              当前账户 · 创建于 {{ formatDate(activeAccount?.createdAt) }}
            </div>
          </div>
          <button v-if="activeAccount" class="head-edit" @click="openEdit(activeAccount)">
            编辑
          </button>
        </div>
      </Card>

      <!-- 账户列表 -->
      <Card>
        <div class="card-head">
          <span class="card-title">🦊 我的账户 ({{ accounts.length }})</span>
          <Button type="primary" size="small" @click="openAdd">＋ 新建账户</Button>
        </div>
        <p class="tip">
          每个账户的「记录器」数据相互独立。可以为主号 / 小号 / 仓库号分别建账户，随时切换。
        </p>

        <div class="acc-list">
          <div
            v-for="a in accounts"
            :key="a.id"
            class="acc-row"
            :class="{ active: a.id === activeAccountId }"
          >
            <div class="acc-avatar">{{ a.avatar }}</div>
            <div class="acc-meta">
              <div class="acc-name">
                {{ a.nickname }}
                <span v-if="a.id === activeAccountId" class="acc-tag">当前</span>
              </div>
              <div class="acc-sub">创建于 {{ formatDate(a.createdAt) }}</div>
            </div>
            <div class="acc-actions">
              <button
                v-if="a.id !== activeAccountId"
                class="acc-btn primary"
                @click="onSwitch(a.id)"
              >
                切换
              </button>
              <button class="acc-btn" @click="openEdit(a)">编辑</button>
              <button class="acc-btn danger" @click="confirmDelete(a)">删除</button>
            </div>
          </div>
        </div>
      </Card>

      <!-- 信息卡 -->
      <Card>
        <div class="stats">
          <div class="stat">
            <div class="stat-label">账户数</div>
            <div class="stat-value">{{ accounts.length }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">使用天数</div>
            <div class="stat-value">{{ usedDays }}</div>
          </div>
          <div class="stat">
            <div class="stat-label">羽灵周记录</div>
            <div class="stat-value">{{ yulinWeeks }}</div>
          </div>
        </div>
        <div class="bottom-tip">更多个性化数据正在路上 🍃</div>
      </Card>
    </div>

    <!-- 新建/编辑弹窗 -->
    <Modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑账户' : '新建账户'"
      :typewriter="false"
      :show-footer="false"
      width="480px"
    >
      <div class="form">
        <Field label="昵称">
          <Input v-model="form.nickname" placeholder="如：主号 / 小号 / 仓库号" />
        </Field>
        <Field label="头像">
          <div class="avatar-pick">
            <button
              v-for="a in AVATAR_PRESETS"
              :key="a"
              type="button"
              class="avatar-btn"
              :class="{ on: form.avatar === a }"
              @click="form.avatar = a"
            >
              {{ a }}
            </button>
          </div>
        </Field>

        <p v-if="formError" class="err">{{ formError }}</p>

        <div class="modal-actions">
          <Button block @click="modalOpen = false">取消</Button>
          <Button type="primary" block @click="submit">
            {{ editingId ? '保存' : '创建' }}
          </Button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Button, Card, Modal, Input } from 'animal-island-vue'
import Field from '@/components/Field.vue'
import {
  AVATAR_PRESETS,
  type Account,
  accounts,
  activeAccount,
  activeAccountId,
  addAccount,
  removeAccount,
  switchAccount,
  updateAccount,
} from '@/logic/account'
import { clearAccountData as clearYulinData, loadStore as loadYulinStore } from '@/logic/yulin'

const modalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

const form = reactive<{ nickname: string; avatar: string }>({
  nickname: '',
  avatar: '🦊',
})

function pickRandomAvatar(): string {
  return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)]
}

function openAdd(): void {
  editingId.value = null
  form.nickname = ''
  form.avatar = pickRandomAvatar()
  formError.value = ''
  modalOpen.value = true
}

function openEdit(a: Account): void {
  editingId.value = a.id
  form.nickname = a.nickname
  form.avatar = a.avatar
  formError.value = ''
  modalOpen.value = true
}

function submit(): void {
  formError.value = ''
  if (!form.nickname.trim()) {
    formError.value = '请输入昵称'
    return
  }
  if (editingId.value) {
    updateAccount(editingId.value, {
      nickname: form.nickname,
      avatar: form.avatar,
    })
  } else {
    addAccount(form.nickname, form.avatar)
  }
  modalOpen.value = false
}

function onSwitch(id: string): void {
  switchAccount(id)
}

function confirmDelete(a: Account): void {
  if (accounts.value.length === 1) {
    alert('至少需要保留一个账户')
    return
  }
  if (
    !confirm(
      `确定要删除「${a.nickname}」？\n该账户下的所有记录器数据会被清除，无法恢复。`,
    )
  )
    return
  removeAccount(a.id, {
    onCleanup: (id) => clearYulinData(id),
  })
}

function formatDate(ts?: number | null): string {
  if (!ts) return '—'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

// ─── 个人中心简单统计 ───
const usedDays = computed(() => {
  if (!activeAccount.value) return '—'
  const days = Math.max(
    1,
    Math.ceil((Date.now() - activeAccount.value.createdAt) / 86400000),
  )
  return days
})

const yulinWeeks = computed(() => {
  // 依赖 activeAccountId 触发重计算
  void activeAccountId.value
  return loadYulinStore().records.length
})
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

/* ── 当前账户头部 ── */
.profile-head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 4px;
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(135deg, #f7cd67, #e59266);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  box-shadow: 0 4px 0 #b56e3f;
  flex-shrink: 0;
}
.info {
  flex: 1;
  min-width: 0;
}
.info .nick {
  font-size: 18px;
  font-weight: 800;
  color: #5d4a32;
  word-break: break-all;
}
.info .sub {
  margin-top: 4px;
  font-size: 13px;
  color: #9a835a;
}
.head-edit {
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  font-size: 12px;
  font-weight: 700;
  padding: 6px 14px;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
}
.head-edit:hover {
  background: #fff8de;
}

/* ── 卡片头部 ── */
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.card-title {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
}
.tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: #9a835a;
}

/* ── 账户列表 ── */
.acc-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.acc-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fffdf3;
  border: 1.5px solid #e7dcb1;
  border-radius: 12px;
  transition: background 0.15s, border-color 0.15s;
}
.acc-row.active {
  border-color: #f7cd67;
  background: #fff8de;
  box-shadow: 0 2px 0 #e0d293;
}
.acc-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #f5edc4;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}
.acc-row.active .acc-avatar {
  background: linear-gradient(135deg, #f7cd67, #e59266);
}
.acc-meta {
  flex: 1;
  min-width: 0;
}
.acc-name {
  font-size: 14px;
  font-weight: 800;
  color: #5d4a32;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  word-break: break-all;
}
.acc-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 999px;
  background: #8ac68a;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.5px;
}
.acc-sub {
  margin-top: 2px;
  font-size: 11px;
  color: #9a835a;
}
.acc-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.acc-btn {
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  color: #6e5a3f;
  font-size: 11px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.acc-btn:hover {
  background: #fff8de;
}
.acc-btn.primary {
  background: #8ac68a;
  border-color: #8ac68a;
  color: #fff;
}
.acc-btn.primary:hover {
  background: #6ba66b;
}
.acc-btn.danger {
  color: #fc736d;
  border-color: #fac9c5;
}
.acc-btn.danger:hover {
  background: #fde9e7;
}

/* ── 统计 ── */
.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
.stat {
  background: #fffdf3;
  border: 1.5px dashed #e7dcb1;
  border-radius: 14px;
  padding: 14px 10px;
  text-align: center;
}
.stat-label {
  font-size: 12px;
  color: #9a835a;
  letter-spacing: 0.4px;
  font-weight: 700;
}
.stat-value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 800;
  color: #5d4a32;
}
.bottom-tip {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #a89572;
}

/* ── 弹窗 ── */
.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.avatar-pick {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.avatar-btn {
  height: 40px;
  font-size: 22px;
  border: 1.5px solid #e7dcb1;
  background: #fffdf3;
  border-radius: 10px;
  cursor: pointer;
  font-family: inherit;
  transition: transform 0.1s, background 0.15s, border-color 0.15s;
}
.avatar-btn:hover {
  background: #fff8de;
  transform: translateY(-1px);
}
.avatar-btn.on {
  background: linear-gradient(135deg, #f7cd67, #e59266);
  border-color: transparent;
  box-shadow: 0 3px 0 #b56e3f;
}
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

@media (max-width: 540px) {
  .stats {
    grid-template-columns: repeat(2, 1fr);
  }
  .acc-row {
    flex-wrap: wrap;
  }
  .acc-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .avatar-pick {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
