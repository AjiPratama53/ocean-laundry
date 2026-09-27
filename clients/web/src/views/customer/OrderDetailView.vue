<template>
    <v-row class="flex justify-between items-center">
        <v-col>
            <p class="text-cyan-700">
                <span>
                    <v-icon icon="mdi-circle-small" />
                </span>
                PELACAKAN REAL-TIME
            </p>
            <h1 class="font-bold text-4xl">Order #OrderID</h1>
        </v-col>
        <v-row class="flex gap-2 justify-end">
            <v-btn prepend-icon="mdi-refresh" text="Refresh" />
            <v-btn prepend-icon="mdi-invoice-text-outline" text="Unduh Nota E-Receipt" />
        </v-row>
    </v-row>
    <v-card class="p-6 flex justify-between items-center">
        <h2 class="font-bold text-xl">Status</h2>
        <div class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
            <v-icon icon="mdi-circle-small" />
            <p>Sedang Dicuci</p>
        </div>
    </v-card>
    <v-card class="p-6 flex flex-col gap-4">
        <v-row class="flex justify-between items-center">
            <h2 class="font-bold text-xl">Ringkasan Pesanan</h2>
            <div class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
                <p>Lunas</p>
            </div>
        </v-row>
        <v-divider />
        <v-row class="flex justify-between items-center">
            <p>Paket:</p>
            <p class="font-bold">Cuci Lipat Kilat 1 Hari</p>
        </v-row>
        <v-divider />
        <v-col class="flex flex-col">
            <v-row class="flex justify-between items-center">
                <p>Cuci Komplit (4.8kg x Rp {{ formatBalance(11000) }})</p>
                <p>Rp {{ formatBalance(52800) }}</p>
            </v-row>
            <v-row class="flex justify-between items-center">
                <p>Proteksi Higienis Steril</p>
                <p>Rp {{ formatBalance(2000) }}</p>
            </v-row>
            <v-row class="flex justify-between items-center">
                <p class="text-green-700">Ongkir Antar-Jemput</p>
                <p>Rp {{ formatBalance(5000) }}</p>
            </v-row>
        </v-col>
        <v-divider />
        <v-row class="flex justify-between items-center">
            <v-col>
                <p>TOTAL PEMBAYARAN</p>
                <p class="text-green-700">Terverifikasi Otomatis</p>
            </v-col>
            <p class="font-bold text-2xl text-cyan-700">Rp {{ formatBalance(54800) }}</p>
        </v-row>
    </v-card>
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

<script setup lang="ts">
import formatBalance from '@/lib/formatPrice';

const qualityAssurances: string[] = [
    '100% Bersih, Segar, & Bebas Kuman',
    '1 Mesin Khusus 1 Pelanggan (Tidak Dicampur)',
    'Garansi Ganti Rugi Rusak atau Hilang hingga 5x Lipat'
]

</script>

<style scoped></style>