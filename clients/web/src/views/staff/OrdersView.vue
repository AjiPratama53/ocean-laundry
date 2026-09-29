<template>
    <staff-error v-if="viewState?.kind === 'error'" />
    <template v-else>
        <div class="flex justify-between gap-32">
            <div class="flex flex-col">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text, heading, subtitle" width="30rem"
                    class="bg-transparent" />
                <template v-else>
                    <span class="text-cyan-700">
                        <v-icon icon="mdi-circle-small" />
                        DAFTAR PESANAN
                    </span>
                    <h1 class="font-bold text-4xl">Tracking Pesanan Laundry</h1>
                    <p>Kelola pesanan pelanggan.</p>
                </template>
            </div>
            <v-card class="p-4 flex">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="avatar, sentences" width="10rem"
                    class=" bg-transparent" />
                <div v-else class="flex items-center gap-2">
                    <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                        <v-icon class="text-cyan-600" icon="mdi-archive-outline" />
                    </div>
                    <div class="flex flex-col">
                        <p class="font-light">Total Pesanan</p>
                        <p class="font-bold text-3xl">{{ orders.getOrdersNumber }}</p>
                    </div>
                </div>
            </v-card>
        </div>
        <v-card class="p-4 flex items-center">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="heading" width="100rem"
                class="bg-transparent" />
            <v-text-field v-else v-model="search" prepend-inner-icon="mdi-magnify" placeholder="Cari paket..."
                variant="outlined" clearable single-line hide-details />
        </v-card>

        <order-empty v-if="viewState?.kind === 'empty'" :search />
        <v-card v-else class="p-6 flex flex-col gap-2">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'"
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
                    <tr v-for="(order, index) in orders.getOrders" :key="order.id">
                        <td>{{ index + 1 }}</td>
                        <td>{{ packages.getPackageById(order.packageId)?.name }}</td>
                        <td>{{ order.pickupAddress }}</td>
                        <td>{{ order.status }}</td>
                        <td>
                            <v-btn class="bg-cyan-700 text-cyan-50" text="Update" @click="handleUpdate(order.id)" />
                        </td>
                    </tr>
                </tbody>
            </v-table>
            <v-pagination v-if="viewState?.kind === 'content'" :length="4" rounded></v-pagination>
        </v-card>
        <order-dialog v-model="isOrderDialogOpen" :order="selectedOrder" :package="selectedPackage" />
    </template>
</template>

<script setup lang="ts">
import OrderEmpty from '@/components/OrderEmpty.vue';
import OrderDialog from '@/components/staff/OrderDialog .vue';
import StaffError from '@/components/staff/StaffError.vue';
import type { Order, Package } from '@/lib/api';
import type { ViewState } from '@/lib/viewState';
import { useOrderStore } from '@/stores/orderStore';
import { usePackageStore } from '@/stores/packageStore';
import { onMounted, ref, type Ref } from 'vue';

const orders = useOrderStore();
const packages = usePackageStore();
const search = ref('');
const isOrderDialogOpen = ref(false);

const viewState: Ref<ViewState<Order> | null> = ref(null);

const selectedOrder: Ref<Order | undefined> = ref(undefined);
const selectedPackage: Ref<Package | undefined> = ref(undefined);

function handleUpdate(id: string) {
    const order = orders.getOrderById(id);
    if (!order) return;
    selectedOrder.value = order;

    const selectedPackageForOrder = packages.getPackageById(order.packageId);
    if (!selectedPackageForOrder) return;
    selectedPackage.value = selectedPackageForOrder;

    isOrderDialogOpen.value = true;
}

onMounted(() => {
    viewState.value = { kind: 'loading' };
    try {
        // Fetch data here
        setTimeout(() => {
            viewState.value = { kind: 'content', }
        }, 3000);
    } catch (error) {
        viewState.value = { kind: 'error' }
    }
})

</script>

<style scoped></style>