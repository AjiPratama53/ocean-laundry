<template>
    <v-col class="flex flex-col gap-4">

        <div class="flex justify-between items-center gap-32">
            <div class="flex flex-col">
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text, heading, subtitle" width="30rem"
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
                    <v-skeleton-loader v-if="viewState.kind === 'loading'" type="sentences" width="10em" />
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
                    <v-skeleton-loader v-if="viewState.kind === 'loading'" type="sentences" width="10em" />
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
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="heading" width="50em" />
            <v-text-field v-else prepend-inner-icon="mdi-magnify" placeholder="Cari paket..." variant="outlined"
                clearable single-line hide-details v-model.lazy.trim="search" />
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text" width="15em" />
            <p v-else>Menampilkan <span class="font-bold">{{ filtered.length }}</span> paket
                <span v-if="store.stale" class="text-amber-700 text-sm">(data per {{
                    store.fetchedAt?.toLocaleTimeString() }} —
                    menyambung ulang…)</span>
            </p>
        </v-card>

        <!-- A.5 four states: loading / empty / error / content -->
        <div v-if="viewState.kind === 'loading'" class="grid grid-cols-3 gap-6">
            <v-skeleton-loader v-for="n in 3" :key="n" type="heading, paragraph, button" class="p-6" />
        </div>
        <catalogue-empty v-else-if="viewState.kind === 'empty'" :search="search" :is-staff="false" />
        <customer-error v-else-if="viewState.kind === 'error'" :problem="store.lastError" :status="store.lastStatus"
            @retry="load" />
        <div v-else class="grid grid-cols-3 gap-6">
            <v-card class="p-6 border-t-8 border-blue-400" v-for="servicePackage in filtered" :key="servicePackage.id"
                v-slot:text>
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

                    <!-- One URL per workflow (A.2.1): order form deep-links the package -->
                    <v-btn class="bg-cyan-700 text-blue-50" text="Pilih Paket & Pesan" block size="x-large"
                        append-icon="mdi-cart-plus" :to="`/customer/orders/new?packageId=${servicePackage.id}`" />
                </div>
            </v-card>
        </div>
    </v-col>
</template>

<script setup lang="ts">
import CatalogueEmpty from '@/components/CatalogueEmpty.vue';
import CustomerError from '@/components/customer/CustomerError.vue';
import { ApiError } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { usePackageStore } from '@/stores/packageStore';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const store = usePackageStore();
const search = ref('');

type ViewKind = 'loading' | 'empty' | 'error' | 'content';
const viewState = ref<{ kind: ViewKind }>({ kind: 'loading' });

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    const all = store.getPackages;
    if (!q) return all;
    return all.filter((p) =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
});

function pollInterval(): number {
    const v = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 10000);
    return Number.isFinite(v) && v > 0 ? v : 10000;
}

let timer: ReturnType<typeof setInterval> | null = null;

async function load() {
    // First paint: skeleton (A.5 loading). Keep old data visible on polls.
    if (!store.loaded) viewState.value = { kind: 'loading' };
    try {
        await store.fetchPackages();
        viewState.value = { kind: store.getPackages.length === 0 ? 'empty' : 'content' };
    } catch (e) {
        if (e instanceof ApiError && store.loaded && store.getPackages.length > 0) {
            // Background refresh failed while holding data -> content + stale.
            viewState.value = { kind: 'content' };
        } else {
            viewState.value = { kind: 'error' };
        }
    }
}

onMounted(async () => {
    await load();
    // Conditional read polling (A.7): unchanged data answers 304, no body.
    timer = setInterval(load, pollInterval());
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<style scoped></style>
