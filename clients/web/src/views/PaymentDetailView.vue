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
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, getPaymentConditional, type Payment, type Problem } from '@/lib/api'

const route = useRoute()
const id = String(route.params.id)
const payment = ref<Payment | null>(null)
const fetchedAt = ref(new Date())
const state = ref<{ kind: 'loading' } | { kind: 'empty' } | { kind: 'error'; problem: Problem } | { kind: 'content' }>({ kind: 'loading' })

async function load() {
  state.value = payment.value ? state.value : { kind: 'loading' }
  try {
    const r = await getPaymentConditional(id)
    if (!r.notModified) {
      payment.value = r.data
      fetchedAt.value = r.fetchedAt
    }
    state.value = payment.value ? { kind: 'content' } : { kind: 'empty' }
  }
  catch (e) {
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

onMounted(() => load())
</script>
