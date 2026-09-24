<template>
  <div class="py-6">
    <div class="d-flex align-center mb-4 flex-wrap gap-2">
      <h1 class="text-h5 font-weight-bold">Orders</h1>
      <v-spacer />
      <v-select v-model="status" clearable density="compact" :items="statuses" label="Status" style="max-width: 220px"
        @update:model-value="onFilter" />
      <v-btn icon="mdi-refresh" variant="text" @click="refresh(true)" />
      <v-btn color="primary" to="/orders/new" variant="flat">New order</v-btn>
    </div>

    <ViewStateShell :state="shell" :empty-text="emptyText" show-freshness>
      <v-list lines="two">
        <v-list-item v-for="o in orders" :key="o.id" :subtitle="`${o.status} · ${o.pickupAddress}`" :title="o.id"
          :to="`/orders/${o.id}`">
          <template #append><v-chip size="small">{{ o.status }}</v-chip></template>
        </v-list-item>
      </v-list>
      <div class="d-flex mt-3">
        <v-btn :disabled="!cursorStack.length" variant="text" @click="prevPage">← Newer</v-btn>
        <v-spacer />
        <!-- Cursor pagination (A.7.4): cursor names a row, never an offset. -->
        <v-btn :disabled="!hasMore" variant="text" @click="nextPage">Older →</v-btn>
      </div>
    </ViewStateShell>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ViewStateShell from '@/components/ViewStateShell.vue'
import { ApiError, listOrdersConditional, type Order, type OrderStatus } from '@/lib/api'
import type { ViewState } from '@/lib/viewState'

const route = useRoute()
const router = useRouter()
const statuses: OrderStatus[] = ['placed', 'picked_up', 'awaiting_payment', 'washing', 'ready', 'delivering', 'completed', 'cancelled']
const status = ref<OrderStatus | undefined>((route.query.status as OrderStatus) || undefined)

const orders = ref<Order[]>([])
const fetchedAt = ref(new Date())
const shell = ref<ViewState<unknown>>({ kind: 'loading' })
const cursorStack = ref<string[]>([])
const cursor = ref<string | undefined>(undefined)
const limit = 20
const hasMore = computed(() => orders.value.length === limit)
const emptyText = computed(() => status.value ? `Tidak ada order berstatus "${status.value}".` : 'Belum ada order.')

const pollMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 10000)
let timer: number | undefined

async function load(background: boolean) {
  try {
    const r = await listOrdersConditional({ status: status.value, limit, cursor: cursor.value })
    if (!r.notModified) {
      orders.value = r.data
      fetchedAt.value = r.fetchedAt
    }
    shell.value = orders.value.length === 0
      ? { kind: 'empty' }
      : { kind: 'content', items: orders.value, fetchedAt: fetchedAt.value, stale: false, staleNote: null }
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 401) return
    if (e instanceof ApiError && e.status === 403) {
      shell.value = {
        kind: 'error',
        problem: { ...e.problem, detail: 'Akun ini tidak boleh melihat daftar order tersebut.' },
        willRetry: false,
        retry: () => refresh(true),
      }
      return
    }
    if (background && orders.value.length > 0) {
      shell.value = { kind: 'content', items: orders.value, fetchedAt: fetchedAt.value, stale: true, staleNote: 'percobaan terakhir gagal.' }
      return
    }
    shell.value = {
      kind: 'error',
      problem: e instanceof ApiError ? e.problem : { type: 'about:blank', title: 'Network', status: 0, detail: String(e), instance: '/orders' },
      willRetry: true,
      retry: () => refresh(true),
    }
  }
}

function refresh(manual: boolean) {
  if (manual && orders.value.length === 0) shell.value = { kind: 'loading' }
  void load(false)
}

function onFilter() {
  cursor.value = undefined
  cursorStack.value = []
  router.replace({ path: '/orders', query: status.value ? { status: status.value } : {} })
  refresh(true)
}

function nextPage() {
  if (!orders.value.length) return
  cursorStack.value.push(cursor.value ?? '')
  cursor.value = orders.value[orders.value.length - 1].id
  refresh(true)
}

function prevPage() {
  cursorStack.value.pop()
  cursor.value = cursorStack.value.length ? cursorStack.value[cursorStack.value.length - 1] || undefined : undefined
  refresh(true)
}

watch(() => route.query.status, (s) => {
  status.value = (s as OrderStatus) || undefined
  cursor.value = undefined
  cursorStack.value = []
  refresh(true)
})

onMounted(() => {
  void load(false)
  timer = window.setInterval(() => load(true), pollMs)
})
onUnmounted(() => window.clearInterval(timer))
</script>
