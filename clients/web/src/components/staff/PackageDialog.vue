<template>
    <v-dialog v-model="isOpen" max-width="80%">
        <template v-slot:default="{ isActive }">
            <v-card>
                <div class="flex gap-4 px-8 py-6 bg-blue-100 items-center">
                    <div class="p-2 rounded-2xl bg-cyan-700 text-cyan-50">
                        <v-icon icon="mdi-checkbox-marked-circle-plus-outline" />
                    </div>
                    <div>
                        <h2 class="font-bold text-2xl">{{ type === 'new' ? 'Tambah Paket Baru' : 'Edit Paket' }}
                        </h2>
                        <p>{{ type === 'new' ?
                            'Lengkapi data paket untuk menambah katalog operasional POS' :
                            'Ubah data paket'
                            }}</p>
                    </div>
                </div>
                <div class="flex flex-col p-8 gap-6">
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Nama Paket</h3>
                        <v-text-field v-model="name" placeholder="contoh: Cuci Komplit Premium Wangi Lavender"
                            variant="solo" clearable single-line :error-messages="fieldErrors.packageName"
                            @update:model-value="clearField('packageName')" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Deskripsi Paket</h3>
                        <v-text-field v-model="desc" placeholder="Sebutkan detail kelebihan paket..." variant="solo"
                            clearable :error-messages="fieldErrors.packageDesc"
                            @update:model-value="clearField('packageDesc')" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Harga Paket</h3>
                        <div class="bg-blue-200 rounded-xl px-4 flex gap-4 items-center">
                            <p>Rp</p>
                            <v-locale-provider locale="de">
                                <v-number-input v-model="price" control-variant="hidden" :min="0" placeholder="10.000"
                                    variant="solo" inset single-line :precision="0" grouping="auto"
                                    :error="!!fieldErrors.packagePrice" hide-details />
                            </v-locale-provider>
                            <p>/kg</p>
                        </div>
                        <p v-if="fieldErrors.packagePrice" class="text-red-700 text-sm">{{ fieldErrors.packagePrice[0]
                            }}</p>
                    </div>
                    <!-- Form-level refusal (422 whole-form, 409, 412, 403) in domain terms (A.6.4). -->
                    <v-alert v-if="formError" type="error" variant="tonal" density="compact">{{ formError }}</v-alert>
                    <div class="flex flex-row-reverse justify-between">
                        <div class="flex gap-4">
                            <v-btn text="Batal" @click="isActive.value = false" variant="text" />
                            <v-btn prepend-icon="mdi-check" class="bg-cyan-700 text-cyan-50"
                                :text="type === 'new' ? 'Tambah Paket' : 'Simpan Perubahan'" :loading="isPostingPackage"
                                :disabled="isPostingPackage"
                                @click="handleSave().then((ok) => { if (ok) isActive.value = false })" />
                        </div>
                        <delete-dialog v-if="type === 'edit'" title="Hapus Paket" button-text="Hapus Paket"
                            message="Hapus paket ini?" confirm-text="Hapus" :action="handleDelete" />
                    </div>
                </div>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import { ApiError, getPackageConditional } from '@/lib/api';
import { usePackageStore } from '@/stores/packageStore';
import { ref, watch } from 'vue';
import DeleteDialog from './DeleteDialog.vue';

const props = defineProps<{
    type: 'new' | 'edit';
    packageId?: string | null;
}>();

const emit = defineEmits(['saved']);
const isOpen = defineModel<boolean>({ default: false });
const isPostingPackage = ref(false);

const store = usePackageStore();
const name = ref('');
const desc = ref('');
const price = ref<number | undefined>(undefined);
const etag = ref<string | null>(null);
const fieldErrors = ref<Record<string, string[]>>({});
const formError = ref<string | null>(null);

function clearField(f: string) {
    delete fieldErrors.value[f];
    formError.value = null;
}

/** Map RFC 9457 invalid-params onto the fields (A.6.1) — never a lone banner. */
function applyInvalidParams(e: ApiError) {
    const list = e.problem['invalid-params'];
    if (Array.isArray(list) && list.length) {
        for (const item of list) {
            const key = String((item as { name?: string }).name ?? '');
            const reason = String((item as { reason?: string }).reason ?? 'Tidak valid.');
            // Contract names: packageName/packageDesc/packagePrice.
            const field = key.includes('packageName') || key === 'name' ? 'packageName'
                : key.includes('packageDesc') || key === 'description' ? 'packageDesc'
                    : key.includes('packagePrice') || key === 'price' ? 'packagePrice' : key;
            fieldErrors.value[field] = [...(fieldErrors.value[field] ?? []), reason];
        }
        return true;
    }
    return false;
}

async function loadForEdit() {
    fieldErrors.value = {};
    formError.value = null;
    if (props.type !== 'edit' || !props.packageId) {
        name.value = '';
        desc.value = '';
        price.value = undefined;
        etag.value = null;
        return;
    }
    const cached = store.getPackageById(props.packageId);
    if (cached) {
        name.value = cached.name;
        desc.value = cached.description;
        price.value = cached.price;
    }
    try {
        const r = await getPackageConditional(props.packageId, null);
        if (!r.notModified && r.data) {
            name.value = r.data.name;
            desc.value = r.data.description;
            price.value = r.data.price;
            etag.value = r.etag;
        }
    } catch {
        /* keep cached values; save carries If-Match and surfaces 412 */
    }
}

watch(() => [isOpen.value, props.packageId, props.type], () => {
    if (isOpen.value) void loadForEdit();
});

async function handleSave(): Promise<boolean> {
    fieldErrors.value = {};
    formError.value = null;
    // Client validation is UX only (A.6.2); service enforces.
    if (!name.value.trim()) fieldErrors.value.packageName = ['Nama paket wajib diisi.'];
    if (!desc.value.trim()) fieldErrors.value.packageDesc = ['Deskripsi paket wajib diisi.'];
    if (price.value == null || price.value < 0) fieldErrors.value.packagePrice = ['Harga harus 0 atau lebih.'];
    if (Object.keys(fieldErrors.value).length) return false;

    isPostingPackage.value = true;
    try {
        if (props.type === 'new') {
            await store.addPackage({
                packageName: name.value.trim(),
                packageDesc: desc.value.trim(),
                packagePrice: price.value ?? 0,
            });
        } else if (props.packageId) {
            // A.8.1: every concurrent write carries If-Match. If the edit
            // dialog opened from cache (GET failed), refresh first so the
            // PATCH still carries the current ETag instead of none.
            if (etag.value == null) {
                try {
                    const r = await getPackageConditional(props.packageId, null);
                    if (!r.notModified && r.data) etag.value = r.etag;
                } catch {
                    /* save proceeds; service answers 404/403 properly */
                }
            }
            await store.editPackage(
                props.packageId,
                {
                    packageName: name.value.trim(),
                    packageDesc: desc.value.trim(),
                    packagePrice: price.value ?? 0,
                },
                etag.value,
            );
        }
        emit('saved');
        return true;
    } catch (e) {
        if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
            if (!applyInvalidParams(e)) formError.value = e.problem.detail || 'Data belum valid — periksa lagi.';
        } else if (e instanceof ApiError && e.status === 412) {
            // A.8.2: 412 is normal — somebody else wrote first.
            await loadForEdit();
            formError.value = 'Paket ini baru saja diubah rekan — data terbaru dimuat ulang. Periksa lagi lalu simpan.';
            await store.fetchPackages().catch(() => { });
        } else if (e instanceof ApiError && e.status === 403) {
            formError.value = 'Akun ini tidak diizinkan mengubah paket.';
        } else if (e instanceof ApiError) {
            formError.value = e.problem.detail || 'Penyimpanan gagal. Coba lagi.';
        } else {
            formError.value = 'Penyimpanan gagal. Coba lagi.';
        }
        return false;
    } finally {
        isPostingPackage.value = false;
    }
}

async function handleDelete() {
    if (!props.packageId) return;
    isPostingPackage.value = true;
    formError.value = null;
    try {
        await store.removePackage(props.packageId, etag.value);
        emit('saved');
        isOpen.value = false;
    } catch (e) {
        if (e instanceof ApiError && e.status === 412) {
            formError.value = 'Paket ini baru saja diubah rekan — muat ulang lalu coba hapus lagi.';
        } else if (e instanceof ApiError && e.status === 403) {
            formError.value = 'Akun ini tidak diizinkan menghapus paket.';
        } else if (e instanceof ApiError && e.status === 404) {
            formError.value = 'Paket tidak ditemukan — mungkin sudah dihapus.';
            emit('saved');
        } else if (e instanceof ApiError) {
            formError.value = e.problem.detail;
        }
    } finally {
        isPostingPackage.value = false;
    }
}
</script>

<style scoped></style>
