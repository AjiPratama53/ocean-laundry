<template>
  <!-- loading -->
  <div v-if="state.kind === 'loading'">
    <slot name="skeleton">
      <v-skeleton-loader v-for="i in 3" :key="i" class="mb-3" type="article" />
    </slot>
  </div>

  <!-- empty -->
  <v-alert v-else-if="state.kind === 'empty'" type="info" variant="tonal">
    {{ emptyText }}
  </v-alert>

  <!-- error -->
  <div v-else-if="state.kind === 'error'">
    <v-alert type="error" variant="tonal">
      <div class="font-weight-bold">{{ errorTitle(state.problem.status) }}</div>
      <div>{{ state.problem.detail }}</div>
      <div v-if="state.willRetry" class="text-caption mt-1">Retrying automatically…</div>
      <v-btn class="mt-3" color="error" variant="outlined" @click="state.retry()">Retry</v-btn>
    </v-alert>
  </div>

  <!-- content (+ stale marker when background refresh fails) -->
  <div v-else>
    <v-alert v-if="state.stale" class="mb-3" type="warning" variant="tonal" density="compact">
      Showing data as of {{ formatTime(state.fetchedAt) }}. Reconnecting… {{ state.staleNote ?? 'last refresh failed.' }}
    </v-alert>
    <div v-else-if="showFreshness" class="text-caption text-medium-emphasis mb-2">
      Updated {{ formatTime(state.fetchedAt) }}
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
import type { ViewState } from '@/lib/viewState'

defineProps<{
  state: ViewState<unknown>
  emptyText: string
  showFreshness?: boolean
}>()

function errorTitle(status: number): string {
  // A.3.2 — 401/403/404 are three different situations, never treated alike.
  if (status === 401) return 'Your session expired — please sign in again.'
  if (status === 403) return 'This account is not allowed to do that.'
  if (status === 404) return 'Not found.'
  if (status === 0) return 'Cannot reach the service.'
  return 'Something went wrong.'
}

function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString()
}
</script>
