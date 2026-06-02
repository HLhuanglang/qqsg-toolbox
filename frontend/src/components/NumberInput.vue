<template>
  <Input
    :model-value="display"
    type="number"
    @update:model-value="onUpdate"
  >
    <template v-if="suffix" #suffix>
      <span class="num-suffix">{{ suffix }}</span>
    </template>
  </Input>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Input } from 'animal-island-vue'

const props = defineProps<{
  modelValue: number
  min?: number
  max?: number
  suffix?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', v: number): void
}>()

const display = computed(() => String(props.modelValue))

function onUpdate(raw: string) {
  let v = Number(raw)
  if (Number.isNaN(v)) v = 0
  if (props.min !== undefined && v < props.min) v = props.min
  if (props.max !== undefined && v > props.max) v = props.max
  emit('update:modelValue', v)
}
</script>

<style scoped>
.num-suffix {
  color: #9a835a;
  font-size: 13px;
  font-weight: 700;
}
</style>
