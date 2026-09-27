<template>
    <div class="flex flex-col gap-8">
        <div class="flex justify-between gap-32">
            <div class="flex flex-col gap-1">
                <p class="text-cyan-700">
                    <span>
                        <v-icon icon="mdi-circle-small" />
                    </span>
                    DAFTAR PAKET LAUNDRY
                </p>
                <h1 class="font-bold text-4xl">Manajemen Paket Laundry</h1>
                <p>Kelola jenis layanan, harga per kilo/satuan, dan detail paket
                    untuk mempermudah kasir dan kenyamanan pelanggan.</p>
            </div>
            <v-card class="p-4 flex">
                <div class="flex items-center gap-2">
                    <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                        <v-icon class="text-cyan-600" icon="mdi-archive-outline" />
                    </div>
                    <div class="flex flex-col">
                        <p class="font-light">Total Paket</p>
                        <p class="font-bold text-3xl">{{ packages.getPackagesNumber }}</p>
                    </div>
                </div>
            </v-card>
        </div>
        <v-card class="p-4 flex items-center">
            <v-text-field prepend-inner-icon="mdi-magnify" placeholder="Cari paket..." variant="outlined" clearable
                single-line hide-details />
        </v-card>
        <v-card class="p-6 flex flex-col gap-2">
            <div class="flex flex-col gap-4">
                <div class="flex justify-between" v-for="(servicePackage) in packages.getPackages"
                    :key="servicePackage.id">
                    <div>
                        <h2 class="font-bold">{{ servicePackage.name }}</h2>
                        <p>{{ servicePackage.description }}</p>
                    </div>
                    <div class="flex items-center">
                        <p class="font-light">
                            <span class="font-bold text-xl">Rp {{ formatPrice(servicePackage.price) }}</span>/kg
                        </p>
                        <v-btn icon="mdi-pencil-outline" variant="text" />
                    </div>
                </div>
            </div>
            <div class="flex justify-end">
                <v-btn class="bg-cyan-700 text-cyan-50" prepend-icon="mdi-plus" text="Tambah Paket baru" />
            </div>
        </v-card>
    </div>
    <package-dialog type="edit" />
</template>

<script setup lang="ts">
import PackageDialog from '@/components/staff/PackageDialog.vue';
import { usePackageStore } from '@/stores/packageStore';

const formatPrice = (price: number) => new Intl.NumberFormat('id-ID').format(price);

const packages = usePackageStore();

</script>

<style scoped></style>