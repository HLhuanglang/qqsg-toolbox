<template>
  <label class="field">
    <span class="head">
      <span class="label">{{ label }}</span>
      <span v-if="extra" class="extra">{{ extra }}</span>
    </span>
    <slot />
  </label>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  extra?: string
}>()
</script>

<style scoped>
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 700;
  color: #5d4a32;
  letter-spacing: 0.3px;
}

.label::before {
  content: '🌱 ';
  font-size: 11px;
}

.extra {
  color: #fc736d;
  font-size: 12px;
}
</style>
