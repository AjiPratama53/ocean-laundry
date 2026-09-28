<template>
    <div class="flex justify-between gap-32">
        <div class="flex flex-col">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text, heading, subtitle" width="30rem"
                class="bg-transparent" />
            <template v-else>
                <span class="text-cyan-700">
                    <v-icon icon="mdi-circle-small" />
                    DAFTAR PAKET LAUNDRY
                </span>
                <h1 class="font-bold text-4xl">Manajemen Paket Laundry</h1>
                <p>Kelola jenis layanan, harga per kilo/satuan, dan detail paket
                    untuk mempermudah kasir dan kenyamanan pelanggan.</p>
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
                    <p class="font-light">Total Paket</p>
                    <p class="font-bold text-3xl">{{ packages.getPackagesNumber }}</p>
                </div>
            </div>
        </v-card>
    </div>
    <v-card class="p-4 flex items-center">
        <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="heading" width="100rem" class="bg-transparent" />
        <v-text-field v-else prepend-inner-icon="mdi-magnify" placeholder="Cari paket..." variant="outlined" clearable
            single-line hide-details />
    </v-card>
    <v-card class="p-6 flex flex-col gap-2">
        <div class="flex flex-col gap-4">
            <div v-for="n in 3" v-if="viewState?.kind === 'loading'" class="flex justify-between">
                <v-skeleton-loader type="sentences" width="20rem" class="bg-transparent" />
                <v-skeleton-loader type="heading" width="10rem" class="bg-transparent" />
            </div>
            <div v-else class="flex justify-between" v-for="(servicePackage) in packages.getPackages"
                :key="servicePackage.id">
                <div>
                    <h2 class="font-bold">{{ servicePackage.name }}</h2>
                    <p class="font-light">{{ servicePackage.description }}</p>
                </div>
                <div class="flex items-center">
                    <p class="font-light">
                        <span class="font-bold text-xl">Rp {{ formatBalance(servicePackage.price) }}</span>/kg
                    </p>
                    <v-btn icon="mdi-pencil-outline" variant="text" @click="openPackageDialog('edit')" />
                </div>
            </div>
        </div>
        <div class="flex justify-end">
            <v-btn class="bg-cyan-700 text-cyan-50" :prepend-icon="viewState?.kind === 'content' ? 'mdi-plus' : ''"
                :text="viewState?.kind === 'content' ? 'Tambah Paket Baru' : ''"
                :disabled="viewState?.kind === 'loading'" @click="openPackageDialog('new')" />
        </div>
    </v-card>
    <package-dialog v-model="isPackageDialogOpen" :type="packageDialogType" />
</template>

<script setup lang="ts">
import PackageDialog from '@/components/staff/PackageDialog.vue';
import type { Package } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import type { ViewState } from '@/lib/viewState';
import { usePackageStore } from '@/stores/packageStore';
import { onMounted, ref, type Ref } from 'vue';

const packages = usePackageStore();
const isPackageDialogOpen = ref(false);
const packageDialogType = ref<'new' | 'edit'>('new');

function openPackageDialog(type: 'new' | 'edit') {
    packageDialogType.value = type;
    isPackageDialogOpen.value = true;
}

const viewState: Ref<ViewState<Package> | null> = ref(null);

onMounted(() => viewState.value = { kind: 'loading' })

</script>

<style scoped></style>