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
    <v-card class="p-6">
        <v-col>
            <v-row class="flex items-center justify-between">
                <p>PAKET YANG DIPILIH</p>
                <v-btn variant="text" prepend-icon="mdi-pencil-outline" text="Ubah Paket" class="text-cyan-700" />
            </v-row>
            <v-row class="bg-blue-100 p-4 flex items-center justify-between rounded-xl">
                <v-col>
                    <h3 class="font-medium text-2xl">{{ selectedPackage?.name }}</h3>
                    <p>{{ selectedPackage?.description }}</p>
                </v-col>
                <v-col class="flex flex-col items-end">
                    <h4 class="font-medium text-2xl text-cyan-700">Rp {{ formatBalance(selectedPackage?.price) }}</h4>
                    <p>/kg</p>
                </v-col>
            </v-row>
        </v-col>
    </v-card>
    <v-card class="p-6">
        <v-col>
            <v-row class="flex items-center justify-between">
                <div class="flex gap-2">
                    <v-icon icon="mdi-map-marker-outline" />
                    <h3 class="font-bold text-xl">Alamat Penjemputan & Pengantaran</h3>
                </div>
                <v-btn variant="text" prepend-icon="mdi-plus-circle-outline" text="Tambah Alamat Baru"
                    class="text-cyan-700" />
            </v-row>
            <v-row class="flex gap-4">
                <v-card class="flex flex-col p-4 gap-4" v-for="(address, index) in addresses" :key="index">
                    <v-row class="flex justify-between items-center">
                        <p class="font-bold">{{ address.title }}</p>
                        <v-btn variant="text" prepend-icon="mdi-pencil-outline" text="Ubah Alamat"
                            class="text-cyan-700" />
                    </v-row>
                    <v-col class="max-w-2/3">
                        <p>{{ address.address }}</p>
                    </v-col>
                    <v-row class="flex text-gray-500 gap-1">
                        <v-icon icon="mdi-phone-outline" />
                        <p>{{ address.phone }}</p>
                        <v-icon icon="mdi-circle-small" />
                        <p>{{ address.recipient }}</p>
                    </v-row>
                </v-card>
            </v-row>
            <v-row class="flex justify-between p-4 bg-green-100 rounded-xl text-green-700 items-center">
                <v-row class="flex gap-4 items-center">
                    <v-icon icon="mdi-atv" size="x-large" />
                    <div>
                        <p class="font-bold">Driver Ocean Express</p>
                        <p class="text-sm">Penjemputan & Pengantaran langsung ke pintu Anda (Min. 3kg)</p>
                    </div>
                </v-row>
                <v-icon icon="mdi-check-decagram-outline" />
            </v-row>
        </v-col>
    </v-card>
    <v-col class="flex flex-col items-center gap-2">
        <v-btn class="bg-cyan-700 text-cyan-50" block prepend-icon="mdi-lock-outline" size="x-large"
            text="Konfirmasi & Buat Pesanan" />
        <span class="flex gap-1 items-center">
            <v-icon icon="mdi-shield-check-outline" class="text-green-700" size="medium" />
            <p class="text-sm">Garansi 100% Pakaian Bersih, Rapi & Ganti Rugi Kerusakan</p>
        </span>
    </v-col>
</template>

<script setup lang="ts">
import formatBalance from '@/lib/formatPrice';
import { usePackageStore } from '@/stores/packageStore';

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
    { step: 'Konfirmasi Alamat & Pickup', status: 'in-process' },
    { step: 'Pembayaran & Selesai', status: 'waiting' }
]

const packages = usePackageStore();
const selectedPackage = packages.getPackageById("pkg_002");

interface Address {
    title: string,
    address: string,
    postalCode?: number
    phone: string,
    recipient: string
}

const addresses: Address[] = [
    {
        title: 'Rumah',
        address: 'Jl. Senopati No. 42, RT 02 / RW 05, Selong, Kebayoran Baru, Jakarta Selatan',
        postalCode: 12110,
        phone: '+62 812-3456-7890',
        recipient: 'Siti Aminah'
    },
    {
        title: 'Kantor',
        address: 'Treasury Tower Lt. 18, Kawasan SCBD Sudirman Kav. 52-53, Jakarta Selatan',
        phone: '+62 811-9876-5432',
        recipient: 'Resepsionis / Siti'
    }
]
</script>

<style scoped></style>