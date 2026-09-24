<template>
  <v-card class="mx-auto mt-6" max-width="640" title="Bayar order">
    <v-card-text>
      <v-text-field v-model="form.orderId" :error-messages="field('orderId')" label="Order ID" />
      <v-text-field v-model.number="form.amount" :error-messages="field('amount')" label="Nominal (Rp)" type="number" />
      <v-alert v-if="formLevel" class="mt-2" type="error" variant="tonal" density="compact">{{ formLevel }}</v-alert>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn color="primary" :loading="saving" variant="flat" @click="submit">Bayar</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, createPayment, newIdempotencyKey, type Problem } from '@/lib/api'

const route = useRoute()
const router = useRouter()
const form = ref({ orderId: String(route.query.orderId ?? ''), amount: 0 })
const saving = ref(false)
const serverProblem = ref<Problem | null>(null)
const formLevel = ref<string | null>(null)
const idempotencyKey = ref(newIdempotencyKey())

const errs = () => {
  const out: Record<string, string> = {}
  for (const e of serverProblem.value?.['invalid-params'] ?? []) out[e.name] = e.reason
  return out
}
const field = (n: string) => (errs()[n] ? [errs()[n]] : [])

async function submit() {
  serverProblem.value = null
  formLevel.value = null
  if (!form.value.orderId.trim()) {
    serverProblem.value = { type: 'about:blank', title: 'Validation', status: 400, detail: '', instance: '', 'invalid-params': [{ name: 'orderId', reason: 'Order ID wajib diisi.' }] }
    return
  }
  if (!form.value.amount || form.value.amount <= 0) {
    serverProblem.value = { type: 'about:blank', title: 'Validation', status: 400, detail: '', instance: '', 'invalid-params': [{ name: 'amount', reason: 'Nominal harus lebih dari 0.' }] }
    return
  }
  saving.value = true
  try {
    const { data } = await createPayment({ ...form.value }, idempotencyKey.value)
    idempotencyKey.value = newIdempotencyKey()
    await router.push(`/payments/${data.id}`)
  }
  catch (e) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
      serverProblem.value = e.problem
      if (e.status === 422 || !e.problem['invalid-params']) formLevel.value = e.problem.detail
    }
    else if (e instanceof ApiError && e.status === 409) {
      formLevel.value = e.problem.detail
    }
    else if (e instanceof ApiError) {
      formLevel.value = e.problem.detail
    }
  }
  finally {
    saving.value = false
  }
}
</script>
