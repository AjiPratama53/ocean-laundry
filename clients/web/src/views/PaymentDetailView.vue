<template>
  <div class="py-6">
    <v-btn class="mb-3" variant="text" @click="$router.back()">← Back</v-btn>
    <div v-if="state.kind === 'loading'"><v-skeleton-loader type="card" /></div>
    <v-alert v-else-if="state.kind === 'empty'" type="info" variant="tonal">Payment tidak ditemukan.</v-alert>
    <v-alert v-else-if="state.kind === 'error'" type="error" variant="tonal">
      <div class="font-weight-bold">{{ state.problem.status === 404 ? 'Not found.' : 'Something went wrong.' }}</div>
      <div>{{ state.problem.detail }}</div>
      <v-btn class="mt-3" color="error" variant="outlined" @click="load()">Retry</v-btn>
    </v-alert>
    <v-card v-else :subtitle="payment!.id" :title="`Payment · ${payment!.status}`" variant="outlined">
      <v-card-text>
        <div>Order: <router-link :to="`/orders/${payment!.orderId}`">{{ payment!.orderId }}</router-link></div>
        <div>Amount: Rp {{ payment!.amount.toLocaleString('id-ID') }}</div>
        <div class="text-caption">Updated {{ fetchedAt.toLocaleTimeString() }}</div>
        <v-alert v-if="actionError" class="mt-3" type="error" variant="tonal" density="compact">{{ actionError }}</v-alert>
      </v-card-text>
      <v-card-actions v-if="payment!.status === 'pending'">
        <v-btn color="primary" :loading="busy === 'proceed'" variant="flat" @click="act('proceed')">Bayar</v-btn>
        <v-btn color="error" :loading="busy === 'cancel'" variant="text" @click="act('cancel')">Batalkan</v-btn>
      </v-card-actions>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, getPaymentConditional, proceedPayment, cancelPayment, type Payment, type Problem } from '@/lib/api'

const route = useRoute()
const id = String(route.params.id)
const payment = ref<Payment | null>(null)
const fetchedAt = ref(new Date())
const state = ref<{ kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; problem: Problem } | { kind: 'content' }>({ kind: 'loading' })
const etag = ref<string | null>(null)
const busy = ref<'proceed' | 'cancel' | null>(null)
const actionError = ref<string | null>(null)


async function load() {
  state.value = payment.value ? state.value : { kind: 'loading' }
  try {
    const r = await getPaymentConditional(id, etag.value)
    if (!r.notModified) {
      payment.value = r.data
      fetchedAt.value = r.fetchedAt
      etag.value = r.etag
    }
    state.value = payment.value ? { kind: 'content' } : { kind: 'empty' }
  } catch (e) {
    if (e instanceof ApiError) {
      state.value = {
        kind: 'error',
        problem: e.status === 404
          ? { ...e.problem, detail: 'Payment tidak ditemukan.' }
          : e.problem,
      }
    }
  }
}

async function act(kind: 'proceed' | 'cancel') {
  actionError.value = null
  busy.value = kind
  try {
    const { data, etag: next } = await (kind === 'proceed' ? proceedPayment : cancelPayment)(id, etag.value)
    payment.value = data
    etag.value = next
    fetchedAt.value = new Date()
  } catch (e) {
    if (e instanceof ApiError && e.status === 412) {
      actionError.value = 'Payment ini sudah diubah orang lain — data terbaru sudah dimuat.'
      await load()
    } else if (e instanceof ApiError) {
      actionError.value = e.problem.detail
    }
  } finally {
    busy.value = null
  }
}

onMounted(() => load())
</script>
