<template>
    <customer-error v-if="viewState.kind === 'error'" :problem="loadProblem" :status="loadStatus" @retry="init" />

    <v-col v-else class="flex flex-col gap-4">
        <v-card class="p-4 flex gap-4 justify-between">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" v-for="step in steps" :key="step.step" width="16rem"
                type="avatar, heading" />
            <div v-else v-for="(step, index) in steps" :key="index"
                :class="[colors[step.status], 'flex', 'items-center', 'gap-4']">
                <v-icon v-if="step.status === 'done'" icon="mdi-check" />
                <p v-else class="text-4xl">{{ index + 1 }}</p>
                <div>
                    <p class="text-sm">Langkah {{ index + 1 }} <span v-if="step.status === 'in-process'">(aktif)</span>
                    </p>
                    <h2 class="text-2xl">{{ step.step }}</h2>
                </div>
            </div>
        </v-card>
        <v-card class="p-6">
            <v-skeleton-loader v-if="viewState.kind === 'loading'" type="text, image" />
            <v-col v-else>
                <v-row class="flex items-center justify-between">
                    <p>PAKET YANG DIPILIH</p>
                    <v-btn variant="text" prepend-icon="mdi-pencil-outline" text="Ubah Paket" class="text-cyan-700"
                        to="/catalogue" />
                </v-row>
                <v-row class="bg-blue-100 p-4 flex items-center justify-between rounded-xl">
                    <v-col>
                        <h3 class="font-medium text-2xl">{{ selectedPackage?.name ?? '—' }}</h3>
                        <p>{{ selectedPackage?.description }}</p>
                    </v-col>
                    <v-col class="flex flex-col items-end">
                        <h4 class="font-medium text-2xl text-cyan-700">Rp {{ formatBalance(selectedPackage?.price)
                            }}
                        </h4>
                        <p>/kg</p>
                    </v-col>
                </v-row>
                <p v-if="fieldErrors.packageId" class="text-red-700 text-sm mt-2">{{ fieldErrors.packageId[0] }}</p>
            </v-col>
        </v-card>
        <v-card class="p-6">
            <v-col>
                <v-skeleton-loader v-if="viewState.kind === 'loading'" type="sentences" width="30rem" />
                <v-row v-else class="flex items-center justify-between">
                    <div class="flex gap-2">
                        <v-icon icon="mdi-map-marker-outline" />
                        <h3 class="font-bold text-xl">Alamat Penjemputan & Pengantaran</h3>
                    </div>
                    <v-btn variant="text" prepend-icon="mdi-plus-circle-outline" text="Tambah Alamat Baru"
                        class="text-cyan-700" @click="openAddressDialog('new')" />
                </v-row>
                <v-text-field v-if="viewState.kind === 'content'" v-model="pickupAddress" class="mt-4"
                    label="Alamat penjemputan" variant="outlined" :error-messages="fieldErrors.pickupAddress"
                    @update:model-value="clearField('pickupAddress')" />
                <v-row class="flex gap-4">
                    <v-card class="flex-1" v-if="viewState.kind === 'loading'" v-for="item in 2" :key="item">
                        <v-skeleton-loader type="heading, paragraph, text" width="30rem" />
                    </v-card>

                    <v-card v-else class="flex flex-col p-4 gap-4 cursor-pointer transition-all rounded-xl"
                        v-for="(address, index) in addresses" :key="index"
                        :class="`flex-1 ${selectedAddress === address ? 'border-2 border-cyan-700 bg-cyan-50' : 'border border-transparent'}`"
                        @click="selectAddress(address)">
                        <v-row class="flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                <p class="font-bold">{{ address.title }}</p>
                                <v-icon v-if="selectedAddress === address" icon="mdi-check-circle" class="text-cyan-700"
                                    size="small" />
                            </div>
                            <v-btn variant="text" prepend-icon="mdi-pencil-outline" text="Ubah Alamat"
                                class="text-cyan-700" @click.stop="openAddressDialog('edit')"
                                :disabled="selectedAddress !== address" />
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
                <v-row v-if="viewState.kind === 'content'"
                    class="flex justify-between p-4 bg-green-100 rounded-xl text-green-700 items-center">
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
            <!-- A.6.3: disabled while in flight; Idempotency-Key carried always. -->
            <v-btn class="bg-cyan-700 text-cyan-50" block
                :prepend-icon="viewState.kind === 'content' ? 'mdi-lock-outline' : ''" size="x-large"
                :text="viewState.kind === 'content' ? 'Konfirmasi & Buat Pesanan' : ''"
                :disabled="viewState.kind !== 'content' || isPostingOrder" :loading="isPostingOrder"
                @click="handleNewOrder" />
            <v-alert v-if="formError" type="error" variant="tonal" density="compact" class="w-full">{{ formError
                }}</v-alert>
            <span v-if="viewState.kind === 'content'" class=" flex gap-1 items-center">
                <v-icon icon="mdi-shield-check-outline" class="text-green-700" size="medium" />
                <p class=" text-sm">Garansi 100% Pakaian Bersih, Rapi & Ganti Rugi
                    Kerusakan</p>
            </span>
        </v-col>
        <address-dialog v-model="isAddressDialogOpen" :type="addressDialogType" :selected-address="selectedAddress" />
    </v-col>
</template>

<script setup lang="ts">
import AddressDialog from '@/components/customer/AddressDialog.vue';
import CustomerError from '@/components/customer/CustomerError.vue';
import { ApiError, getPackageConditional, newIdempotencyKey, type Package, type Problem } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { useOrderStore } from '@/stores/orderStore';
import { usePackageStore } from '@/stores/packageStore';
import { useSessionStore } from '@/stores/session';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

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

const route = useRoute();
const router = useRouter();
const packages = usePackageStore();
const orders = useOrderStore();
const session = useSessionStore();

const selectedPackage = ref<Package | null>(null);
const pickupAddress = ref('');
const fieldErrors = ref<Record<string, string[]>>({});
const formError = ref<string | null>(null);
const loadProblem = ref<Problem | null>(null);
const loadStatus = ref<number | null>(null);
// One idempotency key per user intent (A.6.3): stable across retries of
// the same submit, fresh for each new submit.
const idempotencyKey = ref(newIdempotencyKey());

export interface Address {
    id: string,
    title: string,
    address: string,
    phone: string,
    recipient: string
}

const addresses = ref<Address[]>([
    {
        id: 'adr_001',
        title: 'Rumah',
        address: 'Jl. Senopati No. 42, RT 02 / RW 05, Selong, Kebayoran Baru, Jakarta Selatan',
        phone: '0812-3456-7890',
        recipient: 'Siti Aminah'
    },
    {
        id: 'adr_002',
        title: 'Kantor',
        address: 'Treasury Tower Lt. 18, Kawasan SCBD Sudirman Kav. 52-53, Jakarta Selatan',
        phone: '0811-9876-5432',
        recipient: 'Resepsionis / Siti'
    }
])

const selectedAddress = ref<Address | undefined>(addresses.value[0]);

function selectAddress(address: Address) {
    selectedAddress.value = address;
    pickupAddress.value = address.address;
}

const viewState = ref<{ kind: 'loading' | 'error' | 'content' }>({ kind: 'loading' });
const isPostingOrder = ref(false);

const isAddressDialogOpen = ref(false);
const addressDialogType = ref<'new' | 'edit'>('new');

function clearField(f: string) {
    delete fieldErrors.value[f];
    formError.value = null;
}

function applyInvalidParams(e: ApiError) {
    const list = e.problem['invalid-params'];
    if (Array.isArray(list) && list.length) {
        for (const item of list) {
            const n = String((item as { name?: string }).name ?? '');
            const reason = String((item as { reason?: string }).reason ?? 'Tidak valid.');
            const field = /package/i.test(n) ? 'packageId' : /address|pickup/i.test(n) ? 'pickupAddress' : n || 'form';
            fieldErrors.value[field] = [...(fieldErrors.value[field] ?? []), reason];
        }
        return true;
    }
    return false;
}

async function init() {
    viewState.value = { kind: 'loading' };
    loadProblem.value = null;
    loadStatus.value = null;
    try {
        const packageId = String(route.query.packageId ?? '');
        const cached = packageId ? packages.getPackageById(packageId) : undefined;
        if (cached) {
            selectedPackage.value = cached;
        } else if (packageId) {
            const r = await getPackageConditional(packageId, null);
            if (!r.notModified && r.data) {
                selectedPackage.value = r.data;
            } else {
                throw new ApiError(404, {
                    type: 'about:blank', title: 'Not found', status: 404,
                    detail: 'Paket tidak ditemukan.', instance: `/packages/${packageId}`,
                });
            }
        } else {
            if (!packages.loaded) await packages.fetchPackages();
            selectedPackage.value = packages.getPackages[0] ?? null;
        }
        if (selectedAddress.value) pickupAddress.value = selectedAddress.value.address;
        viewState.value = { kind: 'content' };
    } catch (e) {
        if (e instanceof ApiError) {
            loadStatus.value = e.status;
            loadProblem.value = e.problem;
        }
        viewState.value = { kind: 'error' };
    }
}

async function handleNewOrder() {
    fieldErrors.value = {};
    formError.value = null;
    if (!selectedPackage.value) fieldErrors.value.packageId = ['Pilih paket dulu dari katalog.'];
    if (!pickupAddress.value.trim()) fieldErrors.value.pickupAddress = ['Alamat penjemputan wajib diisi.'];
    if (Object.keys(fieldErrors.value).length) return;

    isPostingOrder.value = true;
    try {
        const order = await orders.placeOrder(
            {
                customerId: session.subject,
                packageId: selectedPackage.value!.id,
                pickupAddress: pickupAddress.value.trim(),
            },
            idempotencyKey.value,
        );
        // Deep-linkable result (A.2.1): land on the new order's own URL.
        await router.push(`/orders/${order.id}`);
    } catch (e) {
        if (e instanceof ApiError && (e.status === 400 || e.status === 422)) {
            // A.6.1: invalid fields land on their fields, in domain terms.
            if (!applyInvalidParams(e)) formError.value = e.problem.detail;
        } else if (e instanceof ApiError && e.status === 409) {
            formError.value = 'Pesanan dengan kunci ini sudah dibuat — periksa daftar pesanan (idempotency).';
        } else if (e instanceof ApiError && e.status === 403) {
            formError.value = 'Akun ini tidak diizinkan membuat pesanan.';
        } else if (e instanceof ApiError) {
            formError.value = e.problem.detail;
        } else {
            formError.value = 'Gagal membuat pesanan. Coba lagi.';
        }
        // Fresh key for the next distinct attempt; retries of the same
        // intent keep the old key (handled by not regenerating on retry
        // button — here the user edits then resubmits, so rotate).
        idempotencyKey.value = newIdempotencyKey();
    } finally {
        isPostingOrder.value = false;
    }
}

function openAddressDialog(type: 'new' | 'edit') {
    addressDialogType.value = type;
    if (type === 'new') {
        selectedAddress.value = undefined;
    }
    isAddressDialogOpen.value = true;
}

onMounted(init);
</script>

<style scoped></style>
