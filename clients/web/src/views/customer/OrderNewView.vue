<template>
    <customer-error v-if="viewState?.kind === 'error'" />

    <template v-else>
        <v-card class="p-4 flex gap-4 justify-between">
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" v-for="step in steps" width="16rem"
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
            <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="text, image" />
            <v-col v-else>
                <v-row class="flex items-center justify-between">
                    <p>PAKET YANG DIPILIH</p>

                    <!-- route to catalogue view -->
                    <v-btn variant="text" prepend-icon="mdi-pencil-outline" text="Ubah Paket" class="text-cyan-700" />
                </v-row>
                <v-row class="bg-blue-100 p-4 flex items-center justify-between rounded-xl">
                    <v-col>
                        <h3 class="font-medium text-2xl">{{ selectedPackage?.name }}</h3>
                        <p>{{ selectedPackage?.description }}</p>
                    </v-col>
                    <v-col class="flex flex-col items-end">
                        <h4 class="font-medium text-2xl text-cyan-700">Rp {{ formatBalance(selectedPackage?.price) }}
                        </h4>
                        <p>/kg</p>
                    </v-col>
                </v-row>
            </v-col>
        </v-card>
        <v-card class="p-6">
            <v-col>
                <v-skeleton-loader v-if="viewState?.kind === 'loading'" type="sentences" width="30rem" />
                <v-row v-else class="flex items-center justify-between">
                    <div class="flex gap-2">
                        <v-icon icon="mdi-map-marker-outline" />
                        <h3 class="font-bold text-xl">Alamat Penjemputan & Pengantaran</h3>
                    </div>
                    <v-btn variant="text" prepend-icon="mdi-plus-circle-outline" text="Tambah Alamat Baru"
                        class="text-cyan-700" @click="openAddressDialog('new')" />
                </v-row>
                <v-row class="flex gap-4">
                    <v-card v-if="viewState?.kind === 'loading'" v-for="item in 2">
                        <v-skeleton-loader type="heading, paragraph, text" width="30rem" />
                    </v-card>

                    <v-card v-else class="flex flex-col p-4 gap-4 cursor-pointer transition-all rounded-xl"
                        v-for="(address, index) in addresses" :key="index"
                        :class="selectedAddress?.title === address.title ? 'border-2 border-cyan-700 bg-cyan-50' : 'border border-transparent'"
                        @click="selectAddress(address)">
                        <v-row class="flex justify-between items-center">
                            <div class="flex items-center gap-2">
                                <p class="font-bold">{{ address.title }}</p>
                                <v-icon v-if="selectedAddress?.title === address.title" icon="mdi-check-circle"
                                    class="text-cyan-700" size="small" />
                            </div>
                            <v-btn variant="text" prepend-icon="mdi-pencil-outline" text="Ubah Alamat"
                                class="text-cyan-700" @click.stop @click="openAddressDialog('edit')"
                                :disabled="address !== selectedAddress" />
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
                <v-row v-if="viewState?.kind === 'content'"
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
            <v-btn class="bg-cyan-700 text-cyan-50" block
                :prepend-icon="viewState?.kind === 'content' ? 'mdi-lock-outline' : ''" size="x-large"
                :text="viewState?.kind === 'content' ? 'Konfirmasi & Buat Pesanan' : ''"
                :disabled="viewState?.kind !== 'content'" :loading="isPostingOrder" @click="handleNewOrder" />
            <span v-if="viewState?.kind === 'content'"" class=" flex gap-1 items-center">
                <v-icon icon="mdi-shield-check-outline" class="text-green-700" size="medium" />
                <p class=" text-sm">Garansi 100% Pakaian Bersih, Rapi & Ganti Rugi
                    Kerusakan</p>
            </span>
        </v-col>
        <address-dialog v-model="isAddressDialogOpen" :type="addressDialogType" />
    </template>
</template>

<script setup lang="ts">
import AddressDialog from '@/components/customer/AddressDialog.vue';
import CustomerError from '@/components/customer/CustomerError.vue';
import type { Package } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import type { ViewState } from '@/lib/viewState';
import { usePackageStore } from '@/stores/packageStore';
import { type Ref, ref, onMounted, watch } from 'vue';

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

export interface Address {
    title: string,
    address: string,
    postalCode?: number
    phone: string,
    recipient: string
}

const addresses = ref<Address[]>([
    {
        title: 'Rumah',
        address: 'Jl. Senopati No. 42, RT 02 / RW 05, Selong, Kebayoran Baru, Jakarta Selatan',
        postalCode: 12110,
        phone: '0812-3456-7890',
        recipient: 'Siti Aminah'
    },
    {
        title: 'Kantor',
        address: 'Treasury Tower Lt. 18, Kawasan SCBD Sudirman Kav. 52-53, Jakarta Selatan',
        phone: '0811-9876-5432',
        recipient: 'Resepsionis / Siti'
    }
])

const selectedAddress: Ref<Address | null> = ref(addresses.value[0] ?? null);

function selectAddress(address: Address) {
    selectedAddress.value = address;
}

const viewState: Ref<ViewState<Package> | null> = ref(null);
const isPostingOrder = ref(false);

const isAddressDialogOpen = ref(false);
const addressDialogType = ref<'new' | 'edit'>('new');

async function handleNewOrder() {
    isPostingOrder.value = true;

    try {
        // Post new order here
        await setTimeout(() => {
            isPostingOrder.value = false;
        }, 3000);
    } catch (error) {

    } finally {
    }
}

function openAddressDialog(type: 'new' | 'edit') {
    addressDialogType.value = type;
    isAddressDialogOpen.value = true;
}

onMounted(() => {
    viewState.value = { kind: 'loading' };
    try {
        // Fetch data here
        setTimeout(() => {
            viewState.value = { kind: 'content', }
        }, 3000);
    } catch (error) {
        viewState.value = { kind: 'error' }
    }
})
</script>

<style scoped></style>