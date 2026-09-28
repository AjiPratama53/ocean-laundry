<template>
    <order-empty v-if="viewState?.kind === 'empty'" />
    <customer-error v-else-if="viewState?.kind === 'error'" />
    <template v-else>
        <v-row class="flex justify-between items-center">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text, heading, subtitle" width="30rem"
                class="bg-transparent" />
            <v-col v-else>
                <p class="text-cyan-700">
                    <span>
                        <v-icon icon="mdi-circle-small" />
                    </span>
                    PELACAKAN REAL-TIME
                </p>
                <h1 class="font-bold text-4xl">Order #OrderID</h1>
            </v-col>
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="actions" width="30rem"
                class=" bg-transparent" />
            <v-row v-else class="flex gap-2 justify-end">
                <v-btn prepend-icon="mdi-refresh" text="Refresh" />
                <v-btn prepend-icon="mdi-invoice-text-outline" text="Unduh Nota E-Receipt" />
            </v-row>
        </v-row>
        <v-card class="p-6 flex justify-between items-center">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text" width="10rem" class=" bg-transparent" />
            <h2 v-else class="font-bold text-xl">Status</h2>
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="heading" width="10rem"
                class=" bg-transparent" />
            <div v-else class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
                <v-icon icon="mdi-circle-small" />
                <p>{{ orderStatusKey[order.status] }}</p>
            </div>
        </v-card>
        <v-card class="p-6 flex flex-col gap-4">
            <v-row class="flex justify-between items-center">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text" width="15rem"
                    class=" bg-transparent" />
                <h2 v-else class="font-bold text-xl">Ringkasan Pesanan</h2>
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="heading" width="15rem"
                    class=" bg-transparent" />

                <div v-else class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
                    <p>{{ paymentStatusKey['paid'] }}</p>
                </div>
            </v-row>
            <v-divider />
            <v-row class="flex justify-between items-center">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text" width="10rem"
                    class=" bg-transparent" />
                <p v-else>Paket:</p>
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text" width="15rem"
                    class=" bg-transparent" />
                <p v-else class="font-bold">{{ selectedPackage.name }}</p>
            </v-row>
            <v-divider />
            <v-col class="flex flex-col">
                <v-row v-if="viewState?.kind === 'loading'" class="flex justify-between items-center">
                    <v-skeleton-loader type="paragraph" width="15rem" class=" bg-transparent" />
                    <v-skeleton-loader type="paragraph" width="10rem" class=" bg-transparent" />
                </v-row>
                <template v-else>
                    <v-row class="flex justify-between items-center">
                        <p>Cuci Komplit ({{ (order.weightGrams ?? 0) / 1000 }} x Rp {{
                            formatBalance(selectedPackage.price)
                            }})
                        </p>
                        <p>Rp {{ formatBalance(order.totalAmount) }}</p>
                    </v-row>
                    <v-row class="flex justify-between items-center">
                        <p>Proteksi Higienis Steril</p>
                        <p>Rp {{ formatBalance(2000) }}</p>
                    </v-row>
                    <v-row class="flex justify-between items-center">
                        <p class="text-green-700">Ongkir Antar-Jemput</p>
                        <p>Rp {{ formatBalance(5000) }}</p>
                    </v-row>
                </template>
            </v-col>
            <v-divider />
            <v-row class="flex justify-between items-center">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="sentences" width="10rem"
                    class=" bg-transparent" />
                <v-col v-else>
                    <p>TOTAL PEMBAYARAN</p>
                    <p class="text-green-700">Terverifikasi Otomatis</p>
                </v-col>
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="heading" width="15rem" />
                <p v-else class="font-bold text-2xl text-cyan-700">Rp {{ formatBalance(order.totalAmount) }}</p>
            </v-row>
        </v-card>
        <template v-if="viewState?.kind === 'content'">

            <v-card class="p-6 flex flex-col gap-4 bg-blue-100">
                <span class="flex gap-2 text-cyan-700 items-center">
                    <v-icon icon="mdi-shield-check-outline" />
                    <h3 class="font-bold text-lg">Jaminan Kualitas Ocean Laundry</h3>
                </span>
                <span v-for="assurance in qualityAssurances" class="flex gap-2 items-center">
                    <v-icon icon="mdi-check-circle-outline text-green-700" />
                    <p>{{ assurance }}</p>
                </span>
            </v-card>
            <v-card class="p-6 flex justify-between items-center">
                <v-row class="items-center">
                    <v-icon class="text-cyan-700" icon="mdi-headset bg-blue-100 px-4 py-6 rounded-2xl" />
                    <v-col>
                        <p class="font-bold">Ada Keluhan / Request?</p>
                        <p class="font-light">Layanan CS Siaga 08:00 - 21:00</p>
                    </v-col>
                </v-row>
                <v-btn class="bg-blue-100 text-cyan-700" text="Pusat Bantuan" size="large" />
            </v-card>
        </template>
    </template>

</template>

<script setup lang="ts">
import CustomerError from '@/components/customer/CustomerError.vue';
import OrderEmpty from '@/components/customer/OrderEmpty.vue';
import type { Order, Package } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import type { ViewState } from '@/lib/viewState';
import { type Ref, ref, onMounted } from 'vue';

const qualityAssurances: string[] = [
    '100% Bersih, Segar, & Bebas Kuman',
    '1 Mesin Khusus 1 Pelanggan (Tidak Dicampur)',
    'Garansi Ganti Rugi Rusak atau Hilang hingga 5x Lipat'
]

const order: Ref<Order> = ref(
    {
        id: "ord_001",
        customerId: "cus_001",
        courierId: null,
        packageId: "pkg_001",
        pickupAddress: "Jl. Kaliurang No. 10",
        status: "awaiting_payment",
        weightGrams: 2000,
        totalAmount: 10000,
        createdAt: "2026-09-11 07:49:13.153895+00",
        updatedAt: null
    }
)
const selectedPackage: Ref<Package> = ref({
    id: "pkg_002",
    name: "Express Wash",
    description: "Cuci lipat 1 hari",
    price: 6000,
});

const orderStatusKey = {
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

const paymentStatusKey = {
    'pending': 'Pending',
    'paid': 'Lunas',
    'failed': 'Gagal'
}

const viewState: Ref<ViewState<Package> | null> = ref(null);

onMounted(() => viewState.value = { kind: 'loading' })
</script>

<style scoped></style>