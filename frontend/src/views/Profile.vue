<template>
  <div class="page">
    <div class="container">
      <Card type="title" color="app-green">个人中心</Card>

      <Card>
        <div class="profile-head">
          <div class="avatar">🦊</div>
          <div class="info">
            <div class="nick">旅行者</div>
            <div class="sub">欢迎来到 QQ 三国 · 日常工具箱</div>
          </div>
        </div>
      </Card>

      <Card>
        <div class="stats">
          <div class="stat">
            <div class="stat-label">使用天数</div>
            <div class="stat-value">--</div>
          </div>
          <div class="stat">
            <div class="stat-label">合成模拟</div>
            <div class="stat-value">--</div>
          </div>
          <div class="stat">
            <div class="stat-label">收藏方案</div>
            <div class="stat-value">--</div>
          </div>
        </div>
        <div class="tip">更多个性化数据正在路上 🍃</div>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Card } from 'animal-island-vue'
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
.info .nick {
  font-size: 18px;
  font-weight: 800;
  color: #5d4a32;
}
.info .sub {
  margin-top: 4px;
  font-size: 13px;
  color: #9a835a;
}
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
}
.stat-value {
  margin-top: 6px;
  font-size: 22px;
  font-weight: 800;
  color: #5d4a32;
}
.tip {
  margin-top: 12px;
  text-align: center;
  font-size: 12px;
  color: #a89572;
}
</style>
