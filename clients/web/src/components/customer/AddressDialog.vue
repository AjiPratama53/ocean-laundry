<template>
    <v-dialog v-model="isOpen" max-width="80%">
        <!-- <template v-slot:activator="{ props: activatorProps }">
            <v-btn v-bind="activatorProps" color="surface-variant" text="Open Dialog" variant="flat"></v-btn>
        </template> -->

        <template v-slot:default="{ isActive }">
            <v-card>
                <div class="flex gap-4 px-8 py-6 bg-blue-100 items-center">
                    <div class="p-2 rounded-2xl bg-cyan-700 text-cyan-50">
                        <v-icon icon="mdi-checkbox-marked-circle-plus-outline" />
                    </div>
                    <div>
                        <h2 class="font-bold text-2xl">{{ type === 'new' ? 'Tambah Alamat Baru' : 'Ubah Alamat' }}
                        </h2>
                        <p>{{ type === 'new' ?
                            'Lengkapi data alamat untuk menambah alamat baru' :
                            'Ubah data alamat'
                        }}</p>
                    </div>
                </div>
                <div class="flex flex-col p-8 gap-6">
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Nama Alamat</h3>
                        <v-text-field placeholder="contoh: Rumah, Kantor" variant="solo" clearable single-line
                            hide-details v-model="inputAddress.title" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Alamat</h3>
                        <v-text-field placeholder="Jl. XXXX No. XX, RT XX / RW XX, Kelurahan, Kecamatan, Kab/Kota"
                            variant="solo" clearable single-line hide-details v-model="inputAddress.address" />
                    </div>
                    <v-row class="flex justify-between">
                        <div class="flex-1 flex flex-col gap-1">
                            <h3 class="font-bold">No. Telepon</h3>
                            <v-text-field placeholder="0812-3456-7890" variant="solo" clearable single-line hide-details
                                v-model="inputAddress.phone" />
                        </div>
                        <div class="flex-1 flex flex-col gap-1">
                            <h3 class="font-bold">Penerima</h3>
                            <v-text-field placeholder="contoh: Resepsionis, Satpam, Nama penerima" variant="solo"
                                clearable single-line hide-details v-model="inputAddress.recipient" />
                        </div>
                    </v-row>
                    <div class="flex flex-row-reverse justify-between">
                        <div class="flex gap-4">
                            <v-btn text="Batal" @click="isActive.value = false" variant="text" />
                            <v-btn prepend-icon="mdi-check" class="bg-cyan-700 text-cyan-50"
                                :text="type === 'new' ? 'Tambah Alamat' : 'Simpan Perubahan'"
                                :loading="isPostingAddress"
                                @click="handleNewAddress().then(() => { isActive.value = false })"></v-btn>
                        </div>
                        <v-btn v-if="type === 'edit'" class="bg-red-300 text-red-800"
                            prepend-icon="mdi-trash-can-outline" text="Hapus Alamat"
                            @click="handleDeleteAddress().then(() => { isActive.value = false })"
                            :loading="isPostingAddress" />
                    </div>
                </div>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import type { Address } from '@/views/customer/OrderNewView.vue';
import { onMounted, ref } from 'vue';

const props = defineProps<{
    type: 'new' | 'edit',
    selectedAddress: Address | undefined
}>()

const isOpen = defineModel<boolean>({ default: false })
const isPostingAddress = ref(false);

const inputAddress = ref<Address>(props.selectedAddress ?? {
    id: `adr_${globalThis.crypto.randomUUID()}`,
    title: '',
    address: '',
    phone: '',
    recipient: ''
})

async function handleNewAddress() {
    isPostingAddress.value = true;

    try {
        // Post/patch address here
        await new Promise((resolve) => setTimeout(resolve, 3000));

    } catch (error) {

    } finally {
        isPostingAddress.value = false;
    }
}

async function handleDeleteAddress() {
    isPostingAddress.value = true;

    try {
        // Delete address here
        await new Promise((resolve) => setTimeout(resolve, 3000));

    } catch (error) {

    } finally {
        isPostingAddress.value = false;
    }
}

onMounted(() => {
    if (props.selectedAddress) {
        inputAddress.value = props.selectedAddress;
    }
})

</script>

<style scoped></style>