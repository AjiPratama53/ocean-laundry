<template>
  <v-card class="mx-auto mt-6" max-width="640" title="Buat order">
    <v-card-text>
      <v-text-field v-model="form.customerId" :error-messages="field('customerId')" label="Customer ID" />
      <v-select v-model="form.packageId" :error-messages="field('packageId')" :items="packageItems" label="Paket" />
      <v-textarea v-model="form.pickupAddress" auto-grow :error-messages="field('pickupAddress')" label="Alamat jemput"
        rows="2" />
      <v-alert v-if="formLevel" class="mt-2" type="error" variant="tonal" density="compact">{{ formLevel }}</v-alert>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <!-- A.6.3 — disabled while in flight; Idempotency-Key is the guarantee. -->
      <v-btn color="primary" :loading="saving" variant="flat" @click="submit">Buat order</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ApiError, createOrder, listPackagesConditional, newIdempotencyKey, type Problem } from '@/lib/api'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const router = useRouter()

const form = ref({ customerId: session.subject || '', packageId: '', pickupAddress: '' })
const packageItems = ref<Array<{ title: string; value: string }>>([])
const saving = ref(false)
const serverProblem = ref<Problem | null>(null)
const formLevel = ref<string | null>(null)
// One key per form instance: safe retries of the same intent, no double order.
const idempotencyKey = ref(newIdempotencyKey())

const errs = () => {
  const out: Record<string, string> = {}
  for (const e of serverProblem.value?.['invalid-params'] ?? []) out[e.name] = e.reason
  return out
}
const field = (n: string) => (errs()[n] ? [errs()[n]] : [])

onMounted(async () => {
  try {
    const r = await listPackagesConditional()
    if (!r.notModified) {
      packageItems.value = r.data.map(p => ({ title: `${p.name} — Rp ${p.price.toLocaleString('id-ID')}`, value: p.id }))
    }
  }
  catch { /* catalogue failing must not block the form skeleton */ }
})

async function submit() {
  serverProblem.value = null
  formLevel.value = null
  if (!form.value.customerId.trim()) {
    serverProblem.value = { type: 'about:blank', title: 'Validation', status: 400, detail: '', instance: '', 'invalid-params': [{ name: 'customerId', reason: 'Customer ID wajib diisi.' }] }
    return
  }
  if (!form.value.packageId) {
    serverProblem.value = { type: 'about:blank', title: 'Validation', status: 400, detail: '', instance: '', 'invalid-params': [{ name: 'packageId', reason: 'Pilih paket dulu.' }] }
    return
  }
  if (!form.value.pickupAddress.trim()) {
    serverProblem.value = { type: 'about:blank', title: 'Validation', status: 400, detail: '', instance: '', 'invalid-params': [{ name: 'pickupAddress', reason: 'Alamat jemput wajib diisi.' }] }
    return
  }
  saving.value = true
  try {
    const { data } = await createOrder({ ...form.value }, idempotencyKey.value)
    idempotencyKey.value = newIdempotencyKey()
    await router.push(`/orders/${data.id}`)
  }
  catch (e) {
    if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
      // A.6.1 — invalid-params land on their fields; whole-form failures at form level.
      serverProblem.value = e.problem
      if (e.status === 422 || !e.problem['invalid-params']) formLevel.value = e.problem.detail
    }
    else if (e instanceof ApiError && e.status === 409) {
      formLevel.value = 'Order yang sama sudah dibuat (idempotency key dipakai ulang dengan isi berbeda).'
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
