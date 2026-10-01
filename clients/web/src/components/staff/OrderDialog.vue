<template>
    <v-dialog v-model="isOpen" max-width="80%">
        <template v-slot:default="{ isActive }">
            <v-card v-if="order">
                <div class="flex gap-4 px-8 py-6 bg-blue-100 items-center">
                    <div class="p-2 rounded-2xl bg-cyan-700 text-cyan-50">
                        <v-icon icon="mdi-checkbox-marked-circle-plus-outline" />
                    </div>
                    <div>
                        <h2 class="font-bold text-2xl">Update Pesanan
                        </h2>
                        <p>Update status pesanan pelanggan</p>
                    </div>
                </div>
                <v-col class="flex flex-col p-8 gap-6">
                    <h3 class="font-bold text-2xl">#{{ order.id }}</h3>
                    <v-row class="flex justify-between items-center">
                        <p class="font-bold">Status</p>
                        <div class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
                            <v-icon icon="mdi-circle-small" />
                            <p>{{ order.status }}</p>
                        </div>
                    </v-row>
                    <v-divider />
                    <v-col>
                        <v-row v-if="package" class="flex justify-between items-center">
                            <p>Paket</p>
                            <p>{{ package.name }}</p>
                        </v-row>
                        <v-row class="flex justify-between items-center">
                            <p>Alamat</p>
                            <p>{{ order.pickupAddress }}</p>
                        </v-row>
                        <v-row v-if="package" class="flex justify-between items-center">
                            <p>Subtotal</p>
                            <p>
                                {{ order.weightGrams ? `Rp ${formatBalance(order.weightGrams * package.price
                                    / 1000)}` :
                                    '--.---'
                                }}
                            </p>
                        </v-row>
                    </v-col>
                    <v-divider />

                    <!-- Next action depends on current status + held scope (UX only). -->
                    <v-row v-if="needsWeight" class="flex justify-between items-center">
                        <p class="font-bold">Berat</p>
                        <div class="bg-blue-200 rounded-xl px-4 flex gap-4 items-center w-sm">
                            <v-locale-provider locale="de">
                                <v-number-input control-variant="hidden" :min="1" placeholder="10000" variant="solo"
                                    inset hide-details single-line :precision="0" grouping="auto" autofocus clearable
                                    v-model="inputWeight" :error-messages="weightError ? [weightError] : []" />
                            </v-locale-provider>
                            <p>gram</p>
                        </div>
                    </v-row>
                    <v-row v-else class="flex justify-between items-center">
                        <p class="font-bold">Aksi berikutnya</p>
                        <p>{{ nextActionLabel }}</p>
                    </v-row>

                    <v-alert v-if="formError" type="warning" variant="tonal" density="compact">{{ formError }}</v-alert>

                    <div class="flex flex-row-reverse justify-between">
                        <div class="flex gap-4">
                            <v-btn text="Batal" @click="isActive.value = false" variant="text" />
                            <v-btn v-if="canAct" prepend-icon="mdi-check" class="bg-cyan-700 text-cyan-50"
                                :text="nextActionLabel" :loading="isUpdatingOrder" :disabled="isUpdatingOrder"
                                @click="handleUpdateOrder().then((ok) => { if (ok) isActive.value = false })" />
                        </div>
                    </div>
                </v-col>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import { ApiError } from '@/lib/api';
import type { Order, Package } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { useOrderStore } from '@/stores/orderStore';
import { useSessionStore } from '@/stores/session';
import { computed, ref } from 'vue';

const props = defineProps<{
    order: Order | undefined,
    package: Package | undefined | null
}>();

const emit = defineEmits(['done']);
const isOpen = defineModel<boolean>({ default: false })
const isUpdatingOrder = ref(false);
const inputWeight = ref<number | undefined>(undefined);
const weightError = ref<string | null>(null);
const formError = ref<string | null>(null);
const etag = ref<string | null>(null);

const store = useOrderStore();
const session = useSessionStore();

const needsWeight = computed(() => props.order?.status === 'picked_up');

const nextActionLabel = computed(() => {
    switch (props.order?.status) {
        case 'placed': return 'Pickup (kurir)';
        case 'picked_up': return 'Timbang (staff)';
        case 'weighed': return 'Cuci (staff)';
        case 'awaiting_payment': return 'Cuci (staff)';
        case 'washing': return 'Tandai siap';
        case 'ready': return 'Antar (kurir)';
        case 'delivering': return 'Selesaikan';
        default: return 'Update Status Pesanan';
    }
});

// Scope-gated UX (A.2.2): buttons hidden without the scope; service still
// refuses 403/404 if forced from the console (A.9). Mirrors the service
// transitions exactly (same map as OrderDetailView): pickup/delivery/
// complete need deliveries:write; weigh/wash/ready need orders:fulfil.
// Terminal statuses (completed/cancelled/…) have no next action, so the
// default is false — orders:write (cancel) must never open this dialog.
const canAct = computed(() => {
    const s = new Set(session.scopes);
    switch (props.order?.status) {
        case 'placed': return s.has('deliveries:write');
        case 'picked_up':
        // case 'weighed':
        // case 'awaiting_payment':
        case 'washing': return s.has('orders:fulfil');
        case 'ready':
        case 'delivering': return s.has('deliveries:write');
        default: return false;
    }
});

async function refreshEtag() {
    if (!props.order) return;
    try {
        const r = await store.fetchOrder(props.order.id, etag.value);
        if (!r.notModified && r.data) {
            store.upsert(r.data);
            etag.value = r.etag;
        }
    } catch {
        /* keep last etag; write surfaces 404/403 properly */
    }
}

async function handleUpdateOrder(): Promise<boolean> {
    if (!props.order) return false;
    weightError.value = null;
    formError.value = null;
    if (needsWeight.value && (!inputWeight.value || inputWeight.value < 1)) {
        // Client validation is UX (A.6.2); 400 invalid-params lands here too.
        weightError.value = 'Berat wajib diisi (minimal 1 gram).';
        return false;
    }
    await refreshEtag();
    isUpdatingOrder.value = true;
    try {
        const id = props.order.id;
        const statusBefore = props.order.status;
        switch (statusBefore) {
            case 'placed': await store.pickup(id, etag.value); break;
            case 'picked_up': await store.weigh(id, inputWeight.value!, etag.value); break;
            case 'weighed':
            case 'awaiting_payment': await store.wash(id, etag.value); break;
            case 'washing': await store.ready(id, etag.value); break;
            case 'ready': await store.deliver(id, etag.value); break;
            case 'delivering': await store.complete(id, etag.value); break;
            default:
                formError.value = 'Tidak ada aksi untuk status ini.';
                return false;
        }
        emit('done');
        return true;
    } catch (e) {
        if (e instanceof ApiError && e.status === 412) {
            // A.8.2: somebody else wrote first — refresh the individual order,
            // then retry once if the status hasn't changed (auto-retry). If the
            // status *did* change, show the domain message and keep the dialog open.
            const fresh = await store.fetchOrder(props.order.id, null).catch(() => null);
            if (fresh && !fresh.notModified && fresh.data) {
                store.upsert(fresh.data);
                etag.value = fresh.etag;
            }
            // Auto-retry: if the order is still in the same status, try once more.
            if (fresh && !fresh.notModified && fresh.data && fresh.data.status === props.order.status) {
                try {
                    const id = props.order.id;
                    switch (props.order.status) {
                        case 'placed': await store.pickup(id, etag.value); break;
                        case 'picked_up': await store.weigh(id, inputWeight.value!, etag.value); break;
                        case 'weighed':
                        case 'awaiting_payment': await store.wash(id, etag.value); break;
                        case 'washing': await store.ready(id, etag.value); break;
                        case 'ready': await store.deliver(id, etag.value); break;
                        case 'delivering': await store.complete(id, etag.value); break;
                    }
                    emit('done');
                    return true;
                } catch (retryErr) {
                    if (retryErr instanceof ApiError && retryErr.status === 412) {
                        // Still conflicting — fall through to the message below.
                    } else {
                        throw retryErr;
                    }
                }
            }
            formError.value = 'Pesanan ini sudah ditangani rekan — data terbaru dimuat. Periksa status baru sebelum mengulang.';
            emit('done');
        } else if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
            const first = e.problem['invalid-params']?.[0];
            if (first && /weight/i.test(String(first.name))) weightError.value = String(first.reason);
            else formError.value = e.problem.detail;
        } else if (e instanceof ApiError && e.status === 403) {
            formError.value = 'Akun ini tidak diizinkan melakukan aksi ini.';
        } else if (e instanceof ApiError && e.status === 404) {
            formError.value = 'Pesanan tidak ditemukan.';
        } else if (e instanceof ApiError && e.status === 409) {
            formError.value = 'Status pesanan sudah berubah — muat ulang daftar.';
            await store.fetchOrders().catch(() => { });
        } else if (e instanceof ApiError) {
            formError.value = e.problem.detail;
        }
        return false;
    } finally {
        isUpdatingOrder.value = false;
        inputWeight.value = undefined;
    }
}
</script>

<style scoped></style>
