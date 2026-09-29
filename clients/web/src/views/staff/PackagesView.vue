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
                        DAFTAR PAKET LAUNDRY
                    </span>
                    <h1 class="font-bold text-4xl">Manajemen Paket Laundry</h1>
                    <p>Kelola jenis layanan, harga per kilo/satuan, dan detail paket
                        untuk mempermudah kasir dan kenyamanan pelanggan.</p>
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
                        <p class="font-light">Total Paket</p>
                        <p class="font-bold text-3xl">{{ filtered.length }}</p>
                    </div>
                </div>
            </v-card>
        </div>
        <v-card class="p-4 flex items-center">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="heading" width="100rem"
                class="bg-transparent" />
            <v-text-field v-else v-model="search" prepend-inner-icon="mdi-magnify" placeholder="Cari paket..."
                variant="outlined" clearable single-line hide-details />
        </v-card>

        <catalogue-empty v-if="viewState.kind === 'empty'" :search="search" is-staff
            @new-package="openPackageDialog('new')" />
        <template v-else>
            <!-- 403-as-UX (A.3.2): signed in but without packages:write the list
                     is read-only. Say so plainly instead of hiding every affordance
                     with no explanation; signing in again changes nothing. -->
            <v-alert v-if="!canWrite && session.isSignedIn" type="info" variant="tonal" density="compact" class="mb-2">
                Akun ini hanya bisa melihat paket — pengelolaan (tambah/ubah/hapus) butuh hak staff.
            </v-alert>
            <v-card class="p-6 flex flex-col gap-2">
                <p v-if="store.stale" class="text-amber-700 text-sm">Data per {{
                    store.fetchedAt?.toLocaleTimeString() }} — menyambung ulang… {{ store.staleNote }}</p>
                <div class="flex flex-col gap-4">
                    <div v-for="n in 3" v-if="viewState.kind === 'loading'" :key="n" class="flex justify-between">
                        <v-skeleton-loader type="sentences" width="20rem" class="bg-transparent" />
                        <v-skeleton-loader type="heading" width="10rem" class="bg-transparent" />
                    </div>
                    <div v-else class="flex justify-between" v-for="(servicePackage) in filtered"
                        :key="servicePackage.id">
                        <div>
                            <h2 class="font-bold">{{ servicePackage.name }}</h2>
                            <p class="font-light">{{ servicePackage.description }}</p>
                        </div>
                        <div class="flex items-center">
                            <p class="font-light">
                                <span class="font-bold text-xl">Rp {{ formatBalance(servicePackage.price)
                                }}</span>/kg
                            </p>
                            <!-- Write controls are UX only (A.2.2): hidden without packages:write,
                                     still refused 403 by the service if forced via console (A.9). -->
                            <v-btn v-if="canWrite" icon="mdi-pencil-outline" variant="text"
                                @click="openPackageDialog('edit', servicePackage.id)" />
                        </div>
                    </div>
                </div>

                <div class="flex justify-end">
                    <v-btn v-if="canWrite" class="bg-cyan-700 text-cyan-50" prepend-icon="mdi-plus"
                        text="Tambah Paket Baru" :disabled="viewState.kind === 'loading'"
                        @click="openPackageDialog('new')" />
                </div>
            </v-card>
        </template>
        <package-dialog v-model="isPackageDialogOpen" :type="packageDialogType" :package-id="editingId" @saved="load" />
    </v-col>
</template>

<script setup lang="ts">
import CatalogueEmpty from '@/components/CatalogueEmpty.vue';
import PackageDialog from '@/components/staff/PackageDialog.vue';
import StaffError from '@/components/staff/StaffError.vue';
import { ApiError } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { usePackageStore } from '@/stores/packageStore';
import { useSessionStore } from '@/stores/session';
import { computed, onMounted, onUnmounted, ref } from 'vue';

const store = usePackageStore();
const session = useSessionStore();
const search = ref('');
const isPackageDialogOpen = ref(false);
const packageDialogType = ref<'new' | 'edit'>('new');
const editingId = ref<string | null>(null);

// Scope watch (A.2.2/A.3): staff write UI only with packages:write.
const canWrite = computed(() => session.scopes.includes('packages:write'));

function openPackageDialog(type: 'new' | 'edit', id?: string) {
    packageDialogType.value = type;
    editingId.value = id ?? null;
    isPackageDialogOpen.value = true;
}

const viewState = ref<{ kind: 'loading' | 'empty' | 'error' | 'content' }>({ kind: 'loading' });

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
    if (!store.loaded) viewState.value = { kind: 'loading' };
    try {
        await store.fetchPackages();
        viewState.value = { kind: store.getPackages.length === 0 ? 'empty' : 'content' };
    } catch (e) {
        if (e instanceof ApiError && store.loaded && store.getPackages.length > 0) {
            viewState.value = { kind: 'content' };
        } else {
            viewState.value = { kind: 'error' };
        }
    }
}

onMounted(async () => {
    await load();
    timer = setInterval(load, pollInterval());
});

onUnmounted(() => {
    if (timer) clearInterval(timer);
});
</script>

<style scoped></style>
