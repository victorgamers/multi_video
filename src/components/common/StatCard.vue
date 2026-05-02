<template>
  <div class="stat-card" :class="[`stat-${color}`]">
    <div class="stat-icon">
      <slot name="icon"></slot>
    </div>
    <div class="stat-content">
      <div class="stat-value">{{ value }}</div>
      <div class="stat-label">{{ label }}</div>
      <div v-if="trend" class="stat-trend" :class="trendClass">
        <svg v-if="trend > 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span>{{ Math.abs(trend) }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: {
    type: [String, Number],
    required: true
  },
  label: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: 'primary'
  },
  trend: {
    type: Number,
    default: null
  }
})

const trendClass = computed(() => {
  if (props.trend > 0) return 'trend-up'
  if (props.trend < 0) return 'trend-down'
  return ''
})
</script>

<style scoped>
.stat-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2);
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.stat-icon :deep(svg) {
  width: 24px;
  height: 24px;
}

.stat-primary .stat-icon {
  background: rgba(59, 130, 246, 0.15);
  color: var(--accent-primary);
}

.stat-success .stat-icon {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
}

.stat-warning .stat-icon {
  background: rgba(245, 158, 11, 0.15);
  color: var(--warning);
}

.stat-danger .stat-icon {
  background: rgba(239, 68, 68, 0.15);
  color: var(--danger);
}

.stat-cyan .stat-icon {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent-secondary);
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.stat-trend {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.stat-trend svg {
  width: 14px;
  height: 14px;
}

.trend-up {
  background: rgba(16, 185, 129, 0.1);
  color: var(--success);
}

.trend-down {
  background: rgba(239, 68, 68, 0.1);
  color: var(--danger);
}
</style>
