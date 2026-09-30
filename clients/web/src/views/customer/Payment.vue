<template>

    <order-empty :can-order="true" v-if="viewState.kind === 'empty'" />
    <customer-error v-else-if="viewState.kind === 'error'" :problem="loadProblem" :status="loadStatus" @retry="init" />
    <v-col v-else class="flex flex-col gap-4">

        <v-card class="p-4 flex gap-4 justify-between">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" v-for="step in steps" :key="step.step" width="16rem"
                type="avatar, heading" />

            <div v-else v-for="(step, index) in steps" :key="index"
                :class="[colors[step.status], 'flex', 'items-center', 'gap-4']">
                <v-icon v-if="step.status === 'done'" icon="mdi-check" />
                <p v-else class="text-4xl">{{ index + 1 }}</p>
                <div>
                    <p class="text-sm">Langkah {{ index + 1 }} <span v-if="step.status === 'in-process'">(aktif)</span>
                    </p>
                    <h2 class="text-2xl">{{ step.step }}</h2>
                </div>
            </div>
        </v-card>
        <v-card class="p-6 flex flex-col gap-4">
            <v-row class="flex justify-between items-center">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="20rem"
                    class=" bg-transparent" />
                <h2 v-else class="font-bold text-xl">Rincian Pembayaran</h2>

                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="heading" width="10rem"
                    class=" bg-transparent" />
                <div v-else class="flex bg-blue-200 text-cyan-700 px-3 py-1 rounded-2xl">
                    <p>Order {{ order?.id.slice(0, 8) ?? '—' }}</p>
                </div>
            </v-row>
            <v-col class="flex flex-col">
                <v-row class="flex justify-between items-center" v-if="viewState.kind === 'loading'">
                    <v-skeleton-loader type="paragraph" width="15rem" class=" bg-transparent" />
                    <v-skeleton-loader type="paragraph" width="10rem" class=" bg-transparent" />
                </v-row>
                <template v-else-if="order">
                    <v-row class="flex justify-between items-center">
                        <p>Status order</p>
                        <p>{{ order.status }}</p>
                    </v-row>
                    <v-row class="flex justify-between items-center">
                        <p>Berat</p>
                        <p>{{ order.weightGrams ? `${order.weightGrams / 1000} kg` : '—' }}</p>
                    </v-row>
                </template>
            </v-col>
            <v-row class="flex justify-between items-center p-4 bg-blue-100 rounded-xl">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="sentences" width="10rem"
                    class="bg-transparent" />
                <v-col v-else>
                    <p>TOTAL PEMBAYARAN</p>
                    <p class="font-light">Termasuk PPN & Biaya Layanan</p>
                </v-col>

                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="heading" width="15rem"
                    class="bg-transparent" />
                <p v-else class="font-bold text-4xl text-cyan-700">Rp {{ formatBalance(amount) }}</p>
            </v-row>
            <!-- <v-text-field v-if="viewState.kind === 'content'" v-model.number="amount" label="Nominal (IDR)"
                    variant="outlined" type="number" :min="1" :error-messages="fieldErrors.amount"
                    @update:model-value="clearField('amount')" /> -->
        </v-card>
        <v-card class="p-6 flex flex-col gap-4">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="15rem" />
            <h2 v-else class="font-bold text-xl">Metode Pembayaran</h2>

            <div class="flex flex-col gap-2">
                <div v-for="method in paymentMethods" :key="method.name"
                    class="flex justify-between items-center p-4 rounded-xl cursor-pointer border-2 transition-colors"
                    :class="selectedPaymentMethod === method.name && viewState.kind === 'content' ?
                        'bg-cyan-100 border-cyan-700' : 'bg-blue-100 border-transparent'"
                    @click="selectedPaymentMethod = method.name">
                    <v-skeleton-loader v-if="viewState.kind === 'loading'" type="avatar, sentences" width="20rem"
                        class="bg-transparent" />
                    <v-row v-else class="items-center">
                        <v-icon :icon="'mdi-' + method.icon" />

                        <v-col>
                            <p class="font-bold">{{ method.name }}</p>
                            <p class="font-light">{{ method.desc }}</p>
                        </v-col>
                        <v-icon
                            :icon="selectedPaymentMethod === method.name ? 'mdi-radiobox-marked' : 'mdi-radiobox-blank'"
                            :class="selectedPaymentMethod === method.name ? 'text-cyan-700' : 'text-gray-500'" />
                    </v-row>
                </div>
            </div>

        </v-card>
        <v-col class="flex flex-col items-center gap-2">
            <v-btn class="bg-cyan-700 text-cyan-50" block
                :prepend-icon="viewState.kind === 'content' ? 'mdi-lock-outline' : ''" size="x-large"
                :text="viewState.kind === 'content' ? 'Bayar' : ''"
                :disabled="viewState.kind !== 'content' || isPostingPayment || !!notPayableReason"
                :loading="isPostingPayment" @click="handleNewPayment" />
            <v-alert v-if="notPayableReason && !formError" type="warning" variant="tonal" density="compact"
                class="w-full">{{
                    notPayableReason }}</v-alert>
            <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="w-full">{{ formError
            }}</v-alert>
            <span v-if="viewState.kind === 'content'" class=" flex gap-1 items-center">
                <v-icon icon="mdi-shield-check-outline" class="text-green-700" size="medium" />
                <p class=" text-sm">Garansi 100% Pakaian Bersih, Rapi & Ganti Rugi
                    Kerusakan</p>
            </span>
        </v-col>
    </v-col>
</template>

<script setup lang="ts">
import CustomerError from '@/components/customer/CustomerError.vue';
import OrderEmpty from '@/components/OrderEmpty.vue';
import { ApiError, createPayment, newIdempotencyKey, type Order, type Problem } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { useOrderStore } from '@/stores/orderStore';
import { useSessionStore } from '@/stores/session';
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface OrderStep {
    step: string,
    status: 'waiting' | 'in-process' | 'done',
}

const colors = {
    'waiting': 'text-gray-500',
    'in-process': 'text-cyan-700',
    'done': 'text-green-700',
}

const steps: OrderStep[] = [
    { step: 'Pilih Paket', status: 'done' },
    { step: 'Konfirmasi Alamat & Pickup', status: 'done' },
    { step: 'Pembayaran & Selesai', status: 'in-process' }
]

const paymentMethods: {
    icon: string,
    name: string,
    desc: string
}[] = [
        { icon: 'qrcode-scan', name: 'QRIS / Instant E-Wallet', desc: 'GoPay, OVO, ShopeePay, BCA QR' },
        { icon: 'bank-outline', name: 'Virtual Account BCA / Mandiri', desc: 'Verifikasi otomatis 24 Jam' },
        { icon: 'cash-multiple', name: 'Bayar di Tempat (COD)', desc: 'Serahkan uang tunai ke driver penjemput' }
    ]

const route = useRoute();
const router = useRouter();
const orders = useOrderStore();
const session = useSessionStore();

const viewState = ref<{ kind: 'loading' | 'empty' | 'error' | 'content' }>({ kind: 'loading' });
const isPostingPayment = ref(false);
const selectedPaymentMethod = ref(paymentMethods[0].name);
const order = ref<Order | null>(null);
const amount = ref<number>(0);
const fieldErrors = ref<Record<string, string[]>>({});
const formError = ref<string | null>(null);
const loadProblem = ref<Problem | null>(null);
const loadStatus = ref<number | null>(null);
const idempotencyKey = ref(newIdempotencyKey());

function clearField(f: string) {
    delete fieldErrors.value[f];
    formError.value = null;
}

async function init() {
    viewState.value = { kind: 'loading' };
    loadProblem.value = null;
    loadStatus.value = null;
    formError.value = null;
    try {
        const orderId = String(route.query.orderId ?? '');
        if (!orderId) {
            viewState.value = { kind: 'empty' };
            return;
        }
        // Always revalidate against the service — never trust the Pinia
        // cache alone. A cached order may be stale, belong to another
        // account (after switching users), or no longer exist; POSTing
        // its id would fail with 422 "orderId does not reference an
        // accessible order".
        const r = await orders.fetchOrder(orderId, null);
        if (!r.notModified && r.data) {
            order.value = r.data;
            orders.upsert(r.data);
        } else if (!order.value || order.value.id !== orderId) {
            const cached = orders.getOrderById(orderId);
            if (!cached) {
                viewState.value = { kind: 'empty' };
                return;
            }
            order.value = cached;
        }
        if (!order.value) {
            viewState.value = { kind: 'empty' };
            return;
        }
        // A.3: a foreign order must look identical to a missing one —
        // never leak "this belongs to someone else".

        amount.value = order.value.totalAmount ?? 0;
        viewState.value = { kind: 'content' };
    } catch (e) {
        if (e instanceof ApiError) {
            loadStatus.value = e.status;
            loadProblem.value = e.problem;
            // A.3.2: foreign order answers 404 — shown as not-found, never leaked.
            viewState.value = { kind: e.status === 404 ? 'empty' : 'error' };
        } else {
            viewState.value = { kind: 'error' };
        }
    }
}

/** Domain guard: only an awaiting_payment order with a priced total can be paid. */
const notPayableReason = computed(() => {
    if (!order.value) return null;
    if (order.value.status !== 'awaiting_payment')
        return `Order ini berstatus "${order.value.status}" — pembayaran hanya untuk order menunggu bayar.`;
    if (!amount.value || amount.value < 1)
        return 'Nominal belum ditetapkan staff (penimbangan belum selesai). Tunggu hingga ada total tagihan.';
    return null;
});

async function handleNewPayment() {
    fieldErrors.value = {};
    formError.value = null;
    if (!order.value) {
        formError.value = 'Pilih order dulu (buka dari detail order → Bayar).';
        return;
    }
    if (notPayableReason.value) {
        formError.value = notPayableReason.value;
        return;
    }
    isPostingPayment.value = true;
    try {
        // Re-fetch right before the write: the order may have changed
        // (paid, cancelled, reassigned) since the screen loaded.
        try {
            const fresh = await orders.fetchOrder(order.value.id, null);
            if (!fresh.notModified && fresh.data) {
                order.value = fresh.data;
                orders.upsert(fresh.data);
                amount.value = fresh.data.totalAmount ?? 0;
            }
        } catch (e) {
            if (e instanceof ApiError && e.status === 404) {
                formError.value = 'Order ini tidak ditemukan atau bukan milik akun ini. Muat ulang daftar pesanan.';
                return;
            }
            throw e;
        }
        if (session.subject && order.value.customerId !== session.subject) {
            formError.value = 'Order ini tidak ditemukan atau bukan milik akun ini. Muat ulang daftar pesanan.';
            return;
        }
        if (notPayableReason.value) {
            formError.value = notPayableReason.value;
            return;
        }
        // POST /payments carries Idempotency-Key (A.6.3): safe retry on
        // unstable network, no double charge.
        const r = await createPayment(
            { orderId: order.value.id, amount: amount.value },
            idempotencyKey.value,
        );
        // Land on the new payment's own deep-linkable URL (A.2.1) — the
        // nota where the customer confirms the payment (proceed → paid).
        await router.push(`/payments/${r.data.id}`);
    } catch (e) {
        if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
            // This backend 422 carries no invalid-params extension for an
            // inaccessible orderId — map it to domain terms (A.6.4).
            if (/accessible order/i.test(e.problem.detail ?? '')) {
                formError.value = 'Order ini tidak ditemukan atau bukan milik akun ini. Muat ulang daftar pesanan.';
            } else {
                const list = e.problem['invalid-params'];
                if (Array.isArray(list) && list.length) {
                    for (const item of list) {
                        const n = String((item as { name?: string }).name ?? 'amount');
                        fieldErrors.value[n] = [...(fieldErrors.value[n] ?? []), String((item as { reason?: string }).reason ?? 'Tidak valid.')];
                    }
                } else {
                    formError.value = e.problem.detail;
                }
            }
        } else if (e instanceof ApiError && e.status === 409) {
            formError.value = 'Order ini tidak dalam status menunggu bayar, atau kunci sudah dipakai (idempotency).';
        } else if (e instanceof ApiError && e.status === 403) {
            formError.value = 'Akun ini tidak diizinkan membayar order ini.';
        } else if (e instanceof ApiError) {
            formError.value = e.problem.detail;
        } else {
            formError.value = 'Pembayaran gagal. Coba lagi.';
        }
        idempotencyKey.value = newIdempotencyKey();
    } finally {
        isPostingPayment.value = false;
    }
}

watch(() => route.query.orderId, () => void init());

onMounted(init);
</script>

<style scoped></style>
