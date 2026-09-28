<template>
    <div class="flex justify-between items-center gap-32">
        <div class="flex flex-col">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text, heading, subtitle" width="30rem"
                class="bg-transparent" />
            <template v-else>
                <span class="text-cyan-700">
                    <v-icon icon="mdi-circle-small" />
                    KATALOG PERAWATAN PAKAIAN MODERN
                </span>
                <h1 class="font-bold text-4xl">Katalog Layanan & Paket Ocean Laundry</h1>
                <p>Temukan paket OceanLaundry yang diinginkan dengan perawatan pakaian higienis, deterjen
                    ramah lingkungan, serta layanan antar-jemput gratis.</p>
            </template>
        </div>
        <v-card class="p-4 flex gap-4">
            <div class="flex items-center gap-2">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="sentences" width="10em" />
                <template v-else>
                    <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                        <v-icon class="text-blue-600" icon="mdi-check-decagram-outline" />
                    </div>
                    <div class="flex flex-col">
                        <p class="font-bold">100% Higienis</p>
                        <p class="font-light">Standar Medis UV-C</p>
                    </div>
                </template>
            </div>
            <div class="flex items-center  gap-2">
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="sentences" width="10em" />
                <template v-else>
                    <div class="bg-blue-50 h-2/3 p-1 flex items-center">
                        <v-icon class="text-green-600" icon="mdi-truck" color="blue-darken-2" />
                    </div>
                    <div class="flex flex-col">
                        <p class="font-bold">Gratis Antar-Jemput</p>
                        <p class="font-light">Min. Order 3 Kg</p>
                    </div>
                </template>

            </div>
        </v-card>
    </div>
    <v-card class="p-4 flex gap-8 items-center justify-between">
        <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="heading" width="50em" />
        <v-text-field v-else prepend-inner-icon="mdi-magnify" placeholder="Cari paket..." variant="outlined" clearable
            single-line hide-details v-model.lazy.trim="search" />
        <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text" width="15em" />
        <p v-else>Menampilkan <span class="font-bold">{{ packages.getPackagesNumber }}</span> paket</p>
    </v-card>

    <catalogue-empty v-if="viewState?.kind === 'empty'" :search />
    <customer-error v-else-if="viewState?.kind === 'error'" />
    <div v-else class="grid grid-cols-3 gap-6">
        <v-skeleton-loader v-if="viewState?.kind === 'loading'" v-for="n in 3" type="heading, paragraph, button"
            class="p-6" />
        <v-card v-else class="p-6 border-t-8 border-blue-400" v-for="servicePackage in packages.getPackages"
            :key="servicePackage.id" v-slot:text>
            <div class="flex flex-col gap-4">
                <h2 class="font-bold text-3xl">{{ servicePackage.name }}</h2>
                <div class="flex items-center justify-between bg-blue-100 p-2 rounded-lg">
                    <p>Tarif Layanan</p>
                    <span class="inline-flex items-end">
                        <p class="font-bold text-3xl text-cyan-700">Rp {{ formatBalance(servicePackage.price) }}</p>
                        <p>/kg</p>
                    </span>
                </div>
                <span>
                    <p class="font-light">
                        <v-icon class="text-green-700" icon="mdi-check-circle-outline" />
                        {{ servicePackage.description }}
                    </p>
                </span>
                <v-btn class="bg-cyan-700 text-blue-50" text="Pilih Paket & Pesan" block size="x-large"
                    append-icon="mdi-cart-plus" />
            </div>
        </v-card>
    </div>
</template>

<script setup lang="ts">
import CatalogueEmpty from '@/components/CatalogueEmpty.vue';
import CustomerError from '@/components/customer/CustomerError.vue';
import type { Package } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import type { ViewState } from '@/lib/viewState';
import { usePackageStore } from '@/stores/packageStore';
import { onMounted, ref, type Ref } from 'vue';

const packages = usePackageStore();
const search = ref('');
const viewState: Ref<ViewState<Package> | null> = ref(null);

onMounted(() => viewState.value = { kind: 'loading' })

</script>

<style scoped></style>