<template>
    <staff-error v-if="viewState.kind === 'error'" :problem="store.lastError" :status="store.lastStatus"
        @retry="load" />
    <v-col v-else class="flex flex-col gap-4">
        <div class="flex justify-between gap-32">
            <div class="flex flex-col">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text, heading, subtitle" width="30rem"
                    class="bg-transparent" />
                <template v-else>
                    <span class="text-cyan-700">
                        <v-icon icon="mdi-circle-small" />
                        DAFTAR PESANAN
                    </span>
                    <h1 class="font-bold text-4xl">{{ heading }}</h1>
                    <p>{{ subheading }}</p>
                </template>
            </div>
            <v-card class="p-4 flex">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="avatar, sentences" width="10rem"
                    class=" bg-transparent" />
                <div v-else class="flex items-center gap-2">
                    <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                        <v-icon class="text-cyan-600" icon="mdi-archive-outline" />
                    </div>
                    <div class="flex flex-col">
                        <p class="font-light">Total Pesanan</p>
                        <p class="font-bold text-3xl">{{ store.getOrdersNumber }}</p>
                    </div>
                </div>
            </v-card>
        </div>
        <v-card class="p-4 flex items-center gap-2">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="heading" width="100rem"
                class="bg-transparent" />
            <template v-else>
                <v-text-field v-model="search" prepend-inner-icon="mdi-magnify" placeholder="Cari paket..."
                    variant="outlined" clearable single-line hide-details class="flex-1" />
                <!-- Status filter maps to GET /orders?status=… (one URL per queue, A.2.1) -->
                <v-select v-model="statusFilter" :items="statusOptions" label="Status" variant="outlined"
                    density="compact" hide-details clearable class="max-w-56" @update:model-value="onStatusChange" />
            </template>
        </v-card>

        <order-empty v-if="viewState.kind === 'empty'" :can-order="canOrder" />
        <v-card v-else class="p-6 flex flex-col gap-2">
            <p v-if="store.stale" class="text-amber-700 text-sm">Menampilkan data per {{
                store.fetchedAt?.toLocaleTimeString()
                }}. Menyambung ulang… {{ store.staleNote }}</p>
            <v-skeleton-loader v-if="viewState.kind === 'loading'"
                type="table-thead, table-row, table-row, table-row" />
            <v-table v-else>
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Paket</th>
                        <th>Alamat</th>
                        <th>Status</th>
                        <th>Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(order, index) in filtered" :key="order.id">
                        <td>{{ index + 1 }}</td>
                        <td>{{ packages.getPackageById(order.packageId)?.name ?? order.packageId }}</td>
                        <td>{{ order.pickupAddress }}</td>
                        <td>{{ order.status }}</td>
                        <td class="flex gap-2 items-center">
                            <!-- Setiap order dapat dilacak via halaman detail
                                      deep-linkable /orders/:id (A.2.1) untuk semua role;
                                      staff/courier tetap kerja via dialog Update. -->
                            <v-btn variant="outlined" text="Detail" :to="detailTo(order.id)" />
                            <!-- Staff/courier transitions are scope-gated UX only (A.2.2) -->
                            <!-- <v-btn v-if="canFulfil" class="bg-cyan-700 text-cyan-50" text="Update"
                                @click="handleUpdate(order.id)" /> -->
                        </td>
                    </tr>
                </tbody>
            </v-table>
        </v-card>
        <order-dialog v-if="selectedOrder" v-model="isOrderDialogOpen" :order="selectedOrder" :package="selectedPackage"
            @done="load" />
    </v-col>
</template>

<script setup lang="ts">
import OrderEmpty from '@/components/OrderEmpty.vue';
import OrderDialog from '@/components/staff/OrderDialog.vue';
import StaffError from '@/components/staff/StaffError.vue';
import { ApiError, type Order, type OrderStatus, type Package } from '@/lib/api';
import { useOrderStore } from '@/stores/orderStore';
import { usePackageStore } from '@/stores/packageStore';
import { useSessionStore } from '@/stores/session';
import { computed, onMounted, onUnmounted, ref, watch, type Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const store = useOrderStore();
const packages = usePackageStore();
const session = useSessionStore();
const route = useRoute();
const router = useRouter();

const search = ref('');
const statusFilter = ref<OrderStatus | null>((route.query.status as OrderStatus) || null);
const isOrderDialogOpen = ref(false);
const viewState = ref<{ kind: 'loading' | 'empty' | 'error' | 'content' }>({ kind: 'loading' });

const selectedOrder: Ref<Order | undefined> = ref(undefined);
const selectedPackage: Ref<Package | undefined | null> = ref(undefined);

// Scope checks (UX only): empty-state order CTA needs orders:write
// (same guard as /catalogue); fulfil UI needs fulfil/delivery scopes.
const canFulfil = computed(() =>
    session.scopes.includes('orders:fulfil') || session.scopes.includes('deliveries:write'),
);
const canOrder = computed(() => session.scopes.includes('orders:write'));

const statusOptions: Array<{ title: string; value: OrderStatus }> = [
    { title: 'Placed', value: 'placed' },
    { title: 'Picked up', value: 'picked_up' },
    { title: 'Weighed', value: 'weighed' },
    { title: 'Awaiting payment', value: 'awaiting_payment' },
    { title: 'Washing', value: 'washing' },
    { title: 'Ready', value: 'ready' },
    { title: 'Delivering', value: 'delivering' },
    { title: 'Completed', value: 'completed' },
    { title: 'Cancelled', value: 'cancelled' },
];

const heading = computed(() => {
    if (route.path.startsWith('/pickups')) return 'Penjemputan';
    if (route.path.startsWith('/deliveries')) return 'Pengantaran';
    if (route.path.startsWith('/completions')) return 'Penyelesaian';
    if (statusFilter.value === 'picked_up') return 'Perlu Ditimbang';
    return 'Daftar Pesanan';
});

const subheading = computed(() => {
    if (route.path.startsWith('/pickups') || route.path.startsWith('/deliveries') || route.path.startsWith('/completions'))
        return 'Kelola penjemputan & pengantaran.';
    return 'Lacak dan kelola pesanan.';
});

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return store.getOrders;
    return store.getOrders.filter((o) =>
        o.id.toLowerCase().includes(q) || o.pickupAddress.toLowerCase().includes(q),
    );
});

/** Detail is always the shared deep-link /orders/:id (one URL per workflow). */
function detailTo(id: string): string {
    return `/orders/${id}`;
}

function currentStatus(): OrderStatus | undefined {
    if (route.path === '/pickups') return 'placed';
    if (route.path === '/deliveries') return 'ready';
    if (route.path === '/completions') return 'delivering';
    return statusFilter.value ?? undefined;
}

function onStatusChange() {
    router.replace({
        path: route.path,
        query: { ...route.query, status: statusFilter.value ?? undefined },
    }).catch(() => { });
    void load();
}

function pollInterval(): number {
    const v = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 10000);
    return Number.isFinite(v) && v > 0 ? v : 10000;
}

let timer: ReturnType<typeof setInterval> | null = null;

async function load() {
    if (!store.loaded) viewState.value = { kind: 'loading' };
    try {
        await store.fetchOrders({ status: currentStatus(), limit: 20 });
        // Package names for the table (one extra read per screen at most).
        if (!packages.loaded) await packages.fetchPackages().catch(() => { });
        viewState.value = { kind: store.getOrders.length === 0 ? 'empty' : 'content' };
    } catch (e) {
        if (e instanceof ApiError && store.loaded && store.getOrders.length > 0) {
            viewState.value = { kind: 'content' };
        } else {
            viewState.value = { kind: 'error' };
        }
    }
}

function handleUpdate(id: string) {
    const order = store.getOrderById(id);
    if (!order) return;
    selectedOrder.value = order;
    selectedPackage.value = packages.getPackageById(order.packageId) ?? null;
    isOrderDialogOpen.value = true;
}

watch(() => route.query.status, (s) => {
    statusFilter.value = (s as OrderStatus) || null;
    void load();
});

watch(() => route.path, (p) => {
    // Dedicated courier queues reuse this component across routes: keep the
    // status dropdown in sync with the queue (generic /orders keeps the
    // user's manual filter untouched).
    if (p === '/pickups') statusFilter.value = 'placed';
    else if (p === '/deliveries') statusFilter.value = 'ready';
    else if (p === '/completions') statusFilter.value = 'delivering';
    void load();
});

onMounted(async () => {
    if (route.path === '/pickups') statusFilter.value = 'placed';
    if (route.path === '/deliveries') statusFilter.value = 'ready';
    if (route.path === '/completions') statusFilter.value = 'delivering';
    await load();
    timer = setInterval(load, pollInterval());
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<style scoped></style>
