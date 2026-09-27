<template>
    <v-card class="p-4 flex gap-4 justify-between">
        <div v-for="(step, index) in steps" :key="index"
            :class="[colors[step.status], 'flex', 'items-center', 'gap-4']">
            <v-icon v-if="step.status === 'done'" icon="mdi-check" />
            <p v-else class="text-4xl">{{ index + 1 }}</p>
            <div>
                <p class="text-sm">Langkah {{ index + 1 }} <span v-if="step.status === 'in-process'">(aktif)</span></p>
                <h2 class="text-2xl">{{ step.step }}</h2>
            </div>
        </div>
    </v-card>
    <v-card class="p-6 flex flex-col gap-4">
        <v-row class="flex justify-between items-center">
            <h2 class="font-bold text-xl">Rincian Pembayaran</h2>
            <div class="flex bg-blue-200 text-cyan-700 px-3 py-1 rounded-2xl">
                <p>Nota Baru</p>
            </div>
        </v-row>
        <v-col class="flex flex-col">
            <v-row class="flex justify-between items-center">
                <p>Subtotal Laundry (4.8kg x Rp {{ formatBalance(11000) }})</p>
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
        <v-row class="flex justify-between items-center p-4 bg-blue-100 rounded-xl">
            <v-col>
                <p>TOTAL PEMBAYARAN</p>
                <p class="font-light">Termasuk PPN & Biaya Layanan</p>
            </v-col>
            <p class="font-bold text-4xl text-cyan-700">Rp {{ formatBalance(54800) }}</p>
        </v-row>
    </v-card>
    <v-card class="p-6 flex flex-col gap-4">
        <h2 class="font-bold text-xl">Metode Pembayaran</h2>
        <div class="flex flex-col gap-2">
            <div v-for="method in paymentMethods" class="flex justify-between items-center p-4 bg-blue-100 rounded-xl">
                <v-row class="items-center">
                    <v-icon :icon="'mdi-' + method.icon" />
                    <v-col>
                        <p class="font-bold">{{ method.name }}</p>
                        <p class="font-light">{{ method.desc }}</p>
                    </v-col>
                </v-row>
            </div>
        </div>

    </v-card>
    <v-col class="flex flex-col items-center gap-2">
        <v-btn class="bg-cyan-700 text-cyan-50" block prepend-icon="mdi-lock-outline" size="x-large" text="Bayar" />
        <span class="flex gap-1 items-center">
            <v-icon icon="mdi-shield-check-outline" class="text-green-700" size="medium" />
            <p class="text-sm">Garansi 100% Pakaian Bersih, Rapi & Ganti Rugi Kerusakan</p>
        </span>
    </v-col>

</template>

<script setup lang="ts">
import formatBalance from '@/lib/formatPrice';

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

</script>

<style scoped></style>