<template>
  <div class="py-6">
    <v-btn class="mb-3" to="/orders" variant="text">← Orders</v-btn>

    <div v-if="view.kind === 'loading'">
      <v-skeleton-loader type="card" />
    </div>
    <v-alert v-else-if="view.kind === 'empty'" type="info" variant="tonal">Order tidak ditemukan.</v-alert>
    <v-alert v-else-if="view.kind === 'error'" type="error" variant="tonal">
      <div class="font-weight-bold">{{ errorTitle }}</div>
      <div>{{ view.problem.detail }}</div>
      <v-btn class="mt-3" color="error" variant="outlined" @click="load(false)">Retry</v-btn>
    </v-alert>

    <div v-else>
      <v-alert v-if="stale" class="mb-3" type="warning" variant="tonal" density="compact">
        Showing order as of {{ fetchedAt.toLocaleTimeString() }}. Reconnecting…
      </v-alert>
      <!-- A.8.2 — 412 is a normal condition: explain in domain terms, show current data. -->
      <v-alert v-if="conflictNote" class="mb-3" type="warning" variant="tonal">
        {{ conflictNote }} Data terbaru sudah dimuat di bawah.
        <v-btn class="ml-2" size="small" variant="text" @click="conflictNote = null">OK</v-btn>
      </v-alert>
      <v-alert v-if="refusal" class="mb-3" type="warning" variant="tonal" @click:close="refusal = null">
        {{ refusal }}
      </v-alert>

      <v-card :subtitle="order!.id" :title="`Order · ${order!.status}`" variant="outlined">
        <v-card-text>
          <div>Paket: <code>{{ order!.packageId }}</code></div>
          <div>Alamat jemput: {{ order!.pickupAddress }}</div>
          <div>Berat: {{ order!.weightGrams ?? '—' }} g · Total: {{ order!.totalAmount != null ? `Rp
            ${order!.totalAmount.toLocaleString('id-ID')}` : '—' }}</div>
          <div class="text-caption mt-1">ETag versi ini: <code>{{ etag ?? '(none)' }}</code></div>
        </v-card-text>
        <v-card-actions class="flex-wrap">
          <!-- Buttons reflect role as UX only; the service refuses what is not allowed. -->
          <v-btn v-if="can('deliveries:write')" :loading="busy === 'pickup'" variant="outlined"
            @click="act('pickup')">Pickup</v-btn>
          <v-btn v-if="can('orders:fulfil')" color="primary" :loading="busy === 'wash'" variant="outlined"
            @click="act('wash')">Wash</v-btn>
          <v-btn v-if="can('orders:fulfil')" :loading="busy === 'ready'" variant="outlined"
            @click="act('ready')">Ready</v-btn>
          <v-btn v-if="can('deliveries:write')" :loading="busy === 'delivery'" variant="outlined"
            @click="act('delivery')">Delivery</v-btn>
          <v-btn v-if="can('deliveries:write')" :loading="busy === 'complete'" variant="outlined"
            @click="act('complete')">Complete</v-btn>
          <v-btn v-if="can('orders:write')" color="error" :loading="busy === 'cancel'" variant="text"
            @click="act('cancel')">Cancel</v-btn>
          <v-btn v-if="can('payments:write')" :to="`/payments/new?orderId=${order!.id}`" variant="text">Pay</v-btn>
        </v-card-actions>
      </v-card>

      <v-card v-if="can('orders:fulfil')" class="mt-4" title="Timbang (staff)" variant="outlined">
        <v-card-text>
          <v-text-field v-model.number="weight" :error-messages="weighError ? [weighError] : []" label="Berat (gram)"
            type="number" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn color="primary" :disabled="!weight" :loading="busy === 'weigh'" variant="flat"
            @click="act('weigh')">Simpan timbangan</v-btn>
        </v-card-actions>
      </v-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  ApiError, cancelOrder, completeOrder, deliverOrder, getOrderConditional,
  pickupOrder, readyOrder, washOrder, weighOrder, type Order,
} from '@/lib/api'
import { useSessionStore } from '@/stores/session'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const id = computed(() => String(route.params.id))

const view = ref<{ kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; problem: { detail: string; status: number } } | { kind: 'content' }>({ kind: 'loading' })
const order = ref<Order | null>(null)
const etag = ref<string | null>(null)
const fetchedAt = ref(new Date())
const stale = ref(false)
const busy = ref<string | null>(null)
const conflictNote = ref<string | null>(null)
const refusal = ref<string | null>(null)
const weight = ref<number | null>(null)
const weighError = ref<string | null>(null)

const errorTitle = computed(() => {
  if (view.value.kind !== 'error') return ''
  if (view.value.problem.status === 404) return 'Not found.'
  if (view.value.problem.status === 403) return 'This account is not allowed to see this order.'
  return 'Something went wrong.'
})

const can = (s: string) => session.scopes.includes(s)

const pollMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 10000)
let timer: number | undefined

async function load(background: boolean) {
  try {
    // Conditional read: ETag from the module cache; 304 keeps current content.
    const r = await getOrderConditional(id.value, etag.value)
    if (!r.notModified) {
      order.value = r.data
      etag.value = r.etag
      fetchedAt.value = r.fetchedAt
    }
    stale.value = false
    view.value = order.value ? { kind: 'content' } : { kind: 'empty' }
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 401) return
    if (e instanceof ApiError && (e.status === 404 || e.status === 403)) {
      // A.3.2 — 404 shows "not found" without leaking which of the two it is.
      view.value = { kind: 'error', problem: { detail: e.status === 404 ? 'Order tidak ditemukan.' : 'Akun ini tidak boleh membuka order ini.', status: e.status } }
      if (e.status === 404 && !background) void router.push({ path: '/not-found' })
      return
    }
    if (background && order.value) {
      stale.value = true
      return
    }
    view.value = { kind: 'error', problem: { detail: e instanceof ApiError ? e.problem.detail : String(e), status: e instanceof ApiError ? e.status : 0 } }
  }
}

const ACTION_LABEL: Record<string, string> = {
  pickup: 'menjemput', weigh: 'menimbang', wash: 'mencuci',
  ready: 'menyiapkan', delivery: 'mengantar', complete: 'menyelesaikan', cancel: 'membatalkan',
}

async function act(kind: 'pickup' | 'weigh' | 'wash' | 'ready' | 'delivery' | 'complete' | 'cancel') {
  if (!order.value) return
  weighError.value = null
  refusal.value = null
  if (kind === 'weigh' && (!weight.value || weight.value <= 0)) {
    weighError.value = 'Berat harus lebih dari 0 gram.'
    return
  }
  busy.value = kind
  try {
    const fn = { pickup: pickupOrder, weigh: (i: string, e: string | null) => weighOrder(i, weight.value!, e), wash: washOrder, ready: readyOrder, delivery: deliverOrder, complete: completeOrder, cancel: cancelOrder }[kind]
    const { data, etag: next } = await fn(order.value.id, etag.value)
    order.value = data
    etag.value = next
    fetchedAt.value = new Date()
  }
  catch (e) {
    if (e instanceof ApiError && e.status === 412) {
      // Two windows, same action: somebody else got there first. Refresh + explain.
      conflictNote.value = `Order ini sudah ${ACTION_LABEL[kind]} lebih dulu oleh orang lain.`
      await load(false)
    }
    else if (e instanceof ApiError && e.status === 409) {
      refusal.value = e.problem.detail
      await load(false)
    }
    else if (e instanceof ApiError && e.status === 403) {
      refusal.value = 'Akun ini tidak diizinkan melakukan aksi itu.'
    }
    else if (e instanceof ApiError && e.status === 422) {
      weighError.value = e.problem.detail
    }
    else if (e instanceof ApiError) {
      refusal.value = e.problem.detail
    }
  }
  finally {
    busy.value = null
  }
}

onMounted(() => {
  void load(false)
  timer = window.setInterval(() => load(true), pollMs)
})
onUnmounted(() => window.clearInterval(timer))
</script>
