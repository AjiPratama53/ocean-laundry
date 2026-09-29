<template>
  <v-alert class="mt-10" type="info" variant="tonal">
    <div class="font-weight-bold">Payment not found (404).</div>
    <div>The payment does not exist — or it exists and is not visible to this account.</div>
    <div v-if="state.kind === 'loading'">
      <v-skeleton-loader type="article" />
    </div>
    <div v-else-if="state.kind === 'content' && payment">
      <div class="mt-3">ID: <code>{{ payment.id }}</code></div>
      <div>Order: <code>{{ payment.orderId }}</code></div>
      <div>Amount: Rp {{ formatBalance(payment.amount) }}</div>
      <div>Status: {{ payment.status }}</div>
      <div class="text-caption mt-1">Updated {{ fetchedAt?.toLocaleTimeString() }}<span v-if="stale"> · stale — reconnecting…</span></div>
    </div>
    <div v-else-if="state.kind === 'error'">
      <div class="mt-2">{{ problem?.detail }}</div>
      <div v-if="status === 403" class="mt-1">This account is not allowed to see this payment.</div>
      <v-btn class="mt-3" variant="outlined" @click="load()">Retry</v-btn>
    </div>
    <div v-else-if="state.kind === 'empty'">
      <div class="mt-2">No payment data.</div>
    </div>
    <v-btn class="mt-3 mr-2" to="/" variant="outlined">Home</v-btn>
    <v-btn
      v-if="payment && payment.status === 'pending' && canPay"
      class="mt-3"
      color="primary"
      variant="flat"
      @click="proceed()"
      :loading="acting"
    >
      Pay now
    </v-btn>
  </v-alert>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  ApiError,
  cancelPayment,
  getPaymentConditional,
  proceedPayment,
  type Payment,
  type Problem,
} from '@/lib/api'
import formatBalance from '@/lib/formatPrice'
import { useSessionStore } from '@/stores/session'

type State =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'error' }
  | { kind: 'content' }

const route = useRoute()
const session = useSessionStore()
const state = ref<State>({ kind: 'loading' })
const payment = ref<Payment | null>(null)
const problem = ref<Problem | null>(null)
const status = ref<number | null>(null)
const etag = ref<string | null>(null)
const fetchedAt = ref<Date | null>(null)
const stale = ref(false)
const acting = ref(false)
const canPay = ref(false)

function id(): string {
  return String(route.params.id ?? '')
}

async function load() {
  state.value = { kind: 'loading' }
  problem.value = null
  try {
    const r = await getPaymentConditional(id(), etag.value)
    if (!r.notModified) {
      if (!r.data) {
        state.value = { kind: 'empty' }
        return
      }
      payment.value = r.data
      etag.value = r.etag
    }
    fetchedAt.value = new Date()
    stale.value = false
    canPay.value = session.scopes.includes('payments:write')
    state.value = payment.value ? { kind: 'content' } : { kind: 'empty' }
  } catch (e) {
    if (e instanceof ApiError) {
      status.value = e.status
      problem.value = e.problem
      // A.3.2: 401 is handled globally (redirect to sign-in); 403 explained
      // in domain terms; 404 shown as not-found without leaking ownership.
      state.value = { kind: 'error' }
    } else {
      state.value = { kind: 'error' }
    }
  }
}

async function proceed() {
  if (!payment.value) return
  acting.value = true
  try {
    // Conditional write (A.8): carry last-seen ETag as If-Match.
    const r = await proceedPayment(payment.value.id, etag.value)
    payment.value = r.data
    etag.value = r.etag
    fetchedAt.value = new Date()
  } catch (e) {
    if (e instanceof ApiError && e.status === 412) {
      // Lost-update race: somebody else wrote first — refresh + explain.
      problem.value = {
        type: 'about:blank',
        title: 'Already handled',
        status: 412,
        detail: 'This payment was already handled — showing the current data.',
        instance: `/payments/${id()}`,
      }
      status.value = 412
      await load()
      state.value = { kind: 'error' }
    } else if (e instanceof ApiError) {
      problem.value = e.problem
      status.value = e.status
      state.value = { kind: 'error' }
    }
  } finally {
    acting.value = false
  }
}

async function cancel() {
  if (!payment.value) return
  acting.value = true
  try {
    const r = await cancelPayment(payment.value.id, etag.value)
    payment.value = r.data
    etag.value = r.etag
  } catch (e) {
    if (e instanceof ApiError) {
      problem.value = e.problem
      status.value = e.status
      state.value = { kind: 'error' }
    }
  } finally {
    acting.value = false
  }
}

defineExpose({ cancel })

onMounted(load)
</script>
