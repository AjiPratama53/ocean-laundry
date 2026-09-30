<template>
    <order-empty :can-order="canCancel" v-if="viewState.kind === 'empty'" />
    <customer-error v-else-if="viewState.kind === 'error'" :problem="problem" :status="status" @retry="load" />
    <v-col v-else class="flex flex-col gap-4">
        <v-row class="flex items-center justify-between">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text, heading, subtitle" width="30rem"
                class="bg-transparent" />
            <v-col v-else class="flex flex-1 flex-col">
                <p class="text-cyan-700">
                    <span>
                        <v-icon icon="mdi-circle-small" />
                    </span>
                    PELACAKAN REAL-TIME
                </p>
                <h1 class="font-bold text-4xl">Order #{{ order?.id }}</h1>
                <p v-if="stale" class="text-amber-700 text-sm">Data per {{ fetchedAt?.toLocaleTimeString() }} —
                    menyambung ulang…</p>
            </v-col>
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="button" width="30rem"
                class=" bg-transparent justify-end" />
            <v-row v-else class="flex flex-1 justify-end">
                <v-btn prepend-icon="mdi-refresh" text="Refresh" @click="load" :loading="refreshing" />
                <v-btn v-if="canPay && order?.status === 'awaiting_payment'" color="primary"
                    :to="`/payments/new?orderId=${order?.id}`" text="Bayar" />
            </v-row>
        </v-row>
        <v-card class="p-6 flex justify-between items-center">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="10rem" class=" bg-transparent" />
            <h2 v-else class="font-bold text-xl">Status</h2>
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="heading" width="10rem"
                class=" bg-transparent" />
            <div v-else class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
                <v-icon icon="mdi-circle-small" />
                <p>{{ order ? orderStatusKey[order.status] : '' }}</p>
            </div>
        </v-card>
        <v-card class="p-6 flex flex-col gap-4">
            <v-row class="flex justify-between items-center">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="15rem"
                    class=" bg-transparent" />
                <h2 v-else class="font-bold text-xl">Ringkasan Pesanan</h2>
            </v-row>
            <v-divider />
            <v-row class="flex justify-between items-center">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="10rem"
                    class=" bg-transparent" />
                <p v-else>Paket Laundry</p>
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="15rem"
                    class=" bg-transparent" />
                <p v-else class="font-bold">{{ pkg?.name ?? order?.packageId }} (Rp {{ formatBalance(pkg?.price) }}/kg)
                </p>
            </v-row>
            <v-divider />
            <v-col class="flex flex-col">
                <v-row v-if="viewState.kind === 'loading'" class="flex justify-between items-center">
                    <v-skeleton-loader type="paragraph" width="15rem" class=" bg-transparent" />
                    <v-skeleton-loader type="paragraph" width="10rem" class=" bg-transparent" />
                </v-row>
                <template v-else-if="order">
                    <v-row class="flex justify-between items-center">
                        <p>Alamat penjemputan</p>
                        <p>{{ order.pickupAddress }}</p>
                    </v-row>
                    <v-row class="flex justify-between items-center">
                        <p>Berat</p>
                        <p>{{ order.weightGrams != null ? `${order.weightGrams / 1000} kg` : '—' }}</p>
                    </v-row>
                    <v-row class="flex justify-between items-center">
                        <p class="font-bold">Total</p>
                        <p class="font-bold text-2xl text-cyan-700">
                            {{ order.totalAmount ? `Rp ${formatBalance(order.totalAmount)}` : '—' }}
                        </p>
                    </v-row>
                </template>
            </v-col>
            <v-divider />
            <!-- Scope-gated actions (UX only, A.2.2 — service enforces, see A.9):
                      cancel needs orders:write; update needs orders:fulfil
                      or deliveries:write depending on status. -->
            <v-alert v-if="actionNote" type="warning" variant="tonal" density="compact">{{ actionNote }}</v-alert>
        </v-card>
        <template v-if="viewState.kind === 'content'">
            <v-card class="p-6 flex flex-col gap-4 bg-blue-100">
                <span class="flex gap-2 text-cyan-700 items-center">
                    <v-icon icon="mdi-shield-check-outline" />
                    <h3 class="font-bold text-lg">Jaminan Kualitas Ocean Laundry</h3>
                </span>
                <span v-for="assurance in qualityAssurances" :key="assurance" class="flex gap-2 items-center">
                    <v-icon icon="mdi-check-circle-outline text-green-700" />
                    <p>{{ assurance }}</p>
                </span>
            </v-card>
            <v-row class="flex flex-col gap-2">
                <v-btn v-if="showCancel" class="bg-red-300 text-red-700" :disabled="acting" @click="isCancelOpen = true"
                    block size="x-large" text="Batalkan Pesanan" />
                <v-btn v-if="canUpdateForStatus" class="bg-cyan-700 text-cyan-50" @click="isUpdateOpen = true" block
                    size="x-large" text="Update Status" prepend-icon="mdi-check" />
                <p v-if="!showCancel && !canUpdateForStatus">
                    Tidak ada aksi yang tersedia untuk akun ini dalam status ini.</p>
            </v-row>
        </template>
        <!-- Critical action (A.6.4): cancel order asks for confirmation first,
                 same generic dialog as delete package. doCancel maps service
                 refusals (412/403/...) to domain terms in actionNote. -->
        <delete-dialog v-model="isCancelOpen" title="Batalkan Pesanan"
            message="Batalkan pesanan ini? Pesanan yang dibatalkan tidak dapat dikembalikan."
            confirm-text="Ya, Batalkan" cancel-text="Kembali" :action="doCancel" v-if="showCancel" />
        <order-dialog v-if="order && canUpdateForStatus" v-model="isUpdateOpen" :order="order ?? undefined"
            :package="pkg" @done="load" />
    </v-col>
</template>

<script setup lang="ts">
import CustomerError from '@/components/customer/CustomerError.vue';
import OrderEmpty from '@/components/OrderEmpty.vue';
import DeleteDialog from '@/components/staff/DeleteDialog.vue';
import OrderDialog from '@/components/staff/OrderDialog.vue';
import { ApiError, getPackageConditional, type Order, type OrderStatus, type Package, type Problem } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { useOrderStore } from '@/stores/orderStore';
import { useSessionStore } from '@/stores/session';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const qualityAssurances: string[] = [
    '100% Bersih, Segar, & Bebas Kuman',
    '1 Mesin Khusus 1 Pelanggan (Tidak Dicampur)',
    'Garansi Ganti Rugi Rusak atau Hilang hingga 5x Lipat'
]

const route = useRoute();
const store = useOrderStore();
const session = useSessionStore();

const viewState = ref<{ kind: 'loading' | 'empty' | 'error' | 'content' }>({ kind: 'loading' });
const order = ref<Order | null>(null);
const pkg = ref<Package | null>(null);
const etag = ref<string | null>(null);
const problem = ref<Problem | null>(null);
const status = ref<number | null>(null);
const fetchedAt = ref<Date | null>(null);
const stale = ref(false);
const refreshing = ref(false);
const acting = ref(false);
const actionNote = ref<string | null>(null);
const isCancelOpen = ref(false);
const isUpdateOpen = ref(false);

const orderStatusKey: Record<OrderStatus, string> = {
    'placed': 'Dibuat',
    'picked_up': 'Dalam Penjemputan',
    'weighed': 'Ditimbang',
    'awaiting_payment': 'Menunggu Pembayaran',
    'washing': 'Sedang Dicuci',
    'ready': 'Siap',
    'delivering': 'Dalam Pengantaran',
    'completed': 'Selesai',
    'cancelled': 'Dibatalkan'
}

// Scope-gated actions (UX only, A.2.2 — service enforces):
// cancel needs orders:write; update needs orders:fulfil (weigh/wash
// steps) or deliveries:write (pickup/delivery steps) per status —
// sama seperti OrderDialog. No role checks: the token scopes decide.
const canPay = computed(() => session.scopes.includes('payments:write'));
const canCancel = computed(() => session.scopes.includes('orders:write'));
// Mirrors POST /orders/{id}/cancel: the service only cancels 'placed' or
// 'awaiting_payment' orders (409 for anything else) — never 'picked_up'.
const showCancel = computed(() =>
    canCancel.value && order.value != null && ['placed', 'awaiting_payment'].includes(order.value.status),
);
// Mirrors the service transitions exactly: weigh/wash/ready need
// orders:fulfil; pickup/delivery/complete need deliveries:write.
const canUpdateForStatus = computed(() => {
    if (!order.value) return false;
    const s = new Set(session.scopes);
    switch (order.value.status) {
        case 'picked_up':
        case 'awaiting_payment':
        case 'washing': return s.has('orders:fulfil');
        case 'placed':
        case 'ready':
        case 'delivering': return s.has('deliveries:write');
        default: return false;
    }
});

function id(): string {
    return String(route.params.id ?? '');
}

async function load() {
    viewState.value = { kind: 'loading' };
    problem.value = null;
    status.value = null;
    actionNote.value = null;
    refreshing.value = true;
    try {
        const r = await store.fetchOrder(id(), etag.value);
        if (r.notModified && !order.value) {
            viewState.value = { kind: 'empty' };
            return;
        }
        if (!r.notModified && r.data) {
            order.value = r.data;
            etag.value = r.etag;
            store.upsert(r.data);
        }
        if (!order.value) {
            viewState.value = { kind: 'empty' };
            return;
        }
        fetchedAt.value = new Date();
        stale.value = false;
        // Package name: best-effort single read.
        try {
            const pr = await getPackageConditional(order.value.packageId, null);
            if (!pr.notModified && pr.data) pkg.value = pr.data;
        } catch {
            /* table still renders with packageId */
        }
        viewState.value = { kind: 'content' };
    } catch (e) {
        if (e instanceof ApiError) {
            status.value = e.status;
            problem.value = e.problem;
            // A.3.2: 404 = not found (or not yours — never distinguished).
            viewState.value = { kind: e.status === 404 && !order.value ? 'empty' : 'error' };
            if (order.value) {
                // Holding data while refresh fails -> content + stale (A.5).
                stale.value = true;
                viewState.value = { kind: 'content' };
            }
        } else {
            viewState.value = { kind: 'error' };
        }
    } finally {
        refreshing.value = false;
    }
}

/** Cancel with If-Match (A.8): a 412 means somebody else wrote first —
 * refresh, re-render, explain in domain terms (A.8.2). Resolves once the
 * outcome is handled so the confirmation dialog closes; the outcome
 * itself is reported via actionNote + refreshed content. */
async function doCancel() {
    if (!order.value) return;
    acting.value = true;
    actionNote.value = null;
    try {
        await store.cancel(order.value.id, etag.value);
        await load();
    } catch (e) {
        if (e instanceof ApiError && e.status === 412) {
            await load();
            actionNote.value = 'Pesanan ini sudah ditangani pihak lain — menampilkan data terbaru.';
        } else if (e instanceof ApiError) {
            actionNote.value = e.problem.detail;
        } else {
            actionNote.value = 'Pembatalan gagal. Coba lagi.';
        }
    } finally {
        acting.value = false;
    }
}

onMounted(load);

let _timer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
    function pollInterval(): number {
        const v = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 10000);
        return Number.isFinite(v) && v > 0 ? v : 10000;
    }
    // Poll with conditional GET (If-None-Match) so unchanged data returns 304 (A.7).
    _timer = setInterval(async () => {
        if (refreshing.value) return; // skip if a manual refresh is in progress
        refreshing.value = true;
        try {
            const r = await store.fetchOrder(id(), etag.value);
            if (!r.notModified && r.data) {
                order.value = r.data;
                etag.value = r.etag;
                store.upsert(r.data);
            }
            fetchedAt.value = new Date();
            stale.value = false;
            if (viewState.value.kind !== 'content') viewState.value = { kind: 'content' };
        } catch {
            // Background poll failure — keep data, mark stale (A.5)
            if (order.value) stale.value = true;
        } finally {
            refreshing.value = false;
        }
    }, pollInterval());
});

onUnmounted(() => {
    if (_timer) clearInterval(_timer);
});
</script>

<style scoped></style>
