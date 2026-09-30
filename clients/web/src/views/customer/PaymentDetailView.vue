<template>
    <!-- loading -->
    <v-col v-if="state.kind === 'loading'" class="flex flex-col gap-4">
        <v-row class="flex justify-between items-center">
            <v-skeleton-loader type="text, heading, subtitle" width="30rem" class="bg-transparent" />
        </v-row>
        <v-card class="p-6">
            <v-skeleton-loader type="table-thead, table-row, table-row, table-row" />
        </v-card>
    </v-col>

    <!-- empty / not found (404 — does not exist, or not yours; same face, A.3.2) -->
    <v-col v-else-if="state.kind === 'empty'" class="flex flex-col items-center justify-center gap-4 py-24">
        <v-icon icon="mdi-receipt-text-remove-outline" size="80" class="text-gray-300" />
        <h1 class="font-bold text-2xl text-gray-500">Pembayaran tidak ditemukan</h1>
        <p class="text-gray-400">Nota ini tidak ada atau tidak dapat diakses dengan akun ini.</p>
        <v-btn variant="outlined" to="/customer/catalogue" text="Kembali ke Katalog" />
    </v-col>

    <!-- error (403, 5xx, network) — explain in domain terms, never send to sign-in for 403 (A.3.2) -->
    <customer-error
        v-else-if="state.kind === 'error'"
        :problem="problem"
        :status="status"
        @retry="load"
    />

    <!-- content -->
    <v-col v-else class="flex flex-col gap-4">
        <v-row class="flex justify-between items-center">
            <v-col>
                <p class="text-cyan-700">
                    <v-icon icon="mdi-circle-small" />
                    NOTA PEMBAYARAN
                </p>
                <h1 class="font-bold text-4xl">Payment #{{ payment?.id.slice(0, 8) }}</h1>
                <p v-if="stale" class="text-amber-700 text-sm">
                    Data per {{ fetchedAt?.toLocaleTimeString() }} — menyambung ulang…
                </p>
            </v-col>
            <v-btn prepend-icon="mdi-refresh" text="Refresh" @click="load" :loading="acting" />
        </v-row>

        <!-- Status badge -->
        <v-card class="p-6 flex justify-between items-center">
            <h2 class="font-bold text-xl">Status Pembayaran</h2>
            <div :class="statusClass">
                <v-icon icon="mdi-circle-small" />
                <p>{{ statusLabel }}</p>
            </div>
        </v-card>

        <!-- Detail rows -->
        <v-card class="p-6 flex flex-col gap-4">
            <h2 class="font-bold text-xl">Rincian Nota</h2>
            <v-divider />
            <v-row class="flex justify-between items-center">
                <p>ID Pembayaran</p>
                <p class="font-mono text-sm">{{ payment?.id }}</p>
            </v-row>
            <v-divider />
            <v-row class="flex justify-between items-center">
                <p>ID Order</p>
                <v-btn
                    variant="text"
                    class="text-cyan-700 font-mono text-sm"
                    :to="`/customer/orders/${payment?.orderId}`"
                    :text="payment?.orderId ?? '—'"
                />
            </v-row>
            <v-divider />
            <v-row class="flex justify-between items-center p-4 bg-blue-100 rounded-xl">
                <div>
                    <p>TOTAL DIBAYAR</p>
                    <p class="font-light">Termasuk PPN &amp; Biaya Layanan</p>
                </div>
                <p class="font-bold text-4xl text-cyan-700">Rp {{ formatBalance(payment?.amount) }}</p>
            </v-row>
            <v-divider />
            <v-row class="flex justify-between items-center">
                <p>Dibuat pada</p>
                <p>{{ payment?.createdAt ? new Date(payment.createdAt).toLocaleString('id-ID') : '—' }}</p>
            </v-row>
        </v-card>

        <!-- 412 / action note -->
        <v-alert v-if="actionNote" type="warning" variant="tonal" density="compact">{{ actionNote }}</v-alert>

        <!-- Proceed button — only for pending payments with payments:write scope (UX; service still enforces, A.9) -->
        <v-col v-if="payment?.status === 'pending' && canProceed" class="flex flex-col items-center gap-2">
            <v-btn
                class="bg-cyan-700 text-cyan-50"
                block
                size="x-large"
                prepend-icon="mdi-lock-outline"
                text="Konfirmasi Pembayaran"
                :loading="acting"
                :disabled="acting"
                @click="proceed"
            />
            <span class="flex gap-1 items-center">
                <v-icon icon="mdi-shield-check-outline" class="text-green-700" size="medium" />
                <p class="text-sm">Garansi 100% Pakaian Bersih, Rapi &amp; Ganti Rugi Kerusakan</p>
            </span>
        </v-col>

        <!-- Back link -->
        <v-btn variant="text" prepend-icon="mdi-arrow-left" text="Kembali ke pesanan"
            :to="payment?.orderId ? `/customer/orders/${payment.orderId}` : '/customer/catalogue'" />
    </v-col>
</template>

<script setup lang="ts">
import CustomerError from '@/components/customer/CustomerError.vue'
import {
    ApiError,
    getPaymentConditional,
    proceedPayment,
    type Payment,
    type Problem,
} from '@/lib/api'
import formatBalance from '@/lib/formatPrice'
import { useSessionStore } from '@/stores/session'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

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
const actionNote = ref<string | null>(null)

const canProceed = computed(() => session.scopes.includes('payments:write'))

const statusLabel = computed(() => {
    switch (payment.value?.status) {
        case 'pending': return 'Menunggu Konfirmasi'
        case 'paid': return 'Lunas'
        case 'failed': return 'Gagal'
        default: return payment.value?.status ?? '—'
    }
})

const statusClass = computed(() => {
    switch (payment.value?.status) {
        case 'paid': return 'flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl'
        case 'failed': return 'flex bg-red-200 text-red-800 px-3 py-1 rounded-2xl'
        default: return 'flex bg-yellow-100 text-yellow-800 px-3 py-1 rounded-2xl'
    }
})

function id(): string {
    return String(route.params.id ?? '')
}

async function load() {
    state.value = { kind: 'loading' }
    problem.value = null
    status.value = null
    actionNote.value = null
    try {
        const r = await getPaymentConditional(id(), etag.value)
        if (r.notModified) {
            // 304 — data unchanged, clear stale (A.7.3)
            stale.value = false
            if (!payment.value) {
                state.value = { kind: 'empty' }
                return
            }
        } else {
            if (!r.data) {
                state.value = { kind: 'empty' }
                return
            }
            payment.value = r.data
            etag.value = r.etag
        }
        fetchedAt.value = new Date()
        stale.value = false
        state.value = { kind: 'content' }
    } catch (e) {
        if (e instanceof ApiError) {
            status.value = e.status
            problem.value = e.problem
            // A.3.2: 404 = not found (or not yours — never distinguished, A.3.2)
            if (e.status === 404) {
                state.value = { kind: 'empty' }
                return
            }
            if (payment.value) {
                // Holding data while refresh fails → stale content (A.5)
                stale.value = true
                state.value = { kind: 'content' }
            } else {
                state.value = { kind: 'error' }
            }
        } else {
            state.value = { kind: 'error' }
        }
    }
}

/** Conditional write (A.8): carry last-seen ETag as If-Match. */
async function proceed() {
    if (!payment.value) return
    acting.value = true
    actionNote.value = null
    try {
        const r = await proceedPayment(payment.value.id, etag.value)
        payment.value = r.data
        etag.value = r.etag
        fetchedAt.value = new Date()
    } catch (e) {
        if (e instanceof ApiError && e.status === 412) {
            // A.8.2: somebody else wrote first — refresh + explain in domain terms.
            actionNote.value = 'Pembayaran ini sudah diproses pihak lain — menampilkan data terbaru.'
            await load()
        } else if (e instanceof ApiError && e.status === 403) {
            actionNote.value = 'Akun ini tidak diizinkan mengonfirmasi pembayaran ini.'
        } else if (e instanceof ApiError) {
            actionNote.value = e.problem.detail
        } else {
            actionNote.value = 'Gagal mengonfirmasi. Coba lagi.'
        }
    } finally {
        acting.value = false
    }
}

onMounted(load)
</script>

<style scoped></style>
