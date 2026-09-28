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
                        <v-text-field placeholder="contoh: Cuci Komplit Premium Wangi Lavender" variant="solo" clearable
                            single-line hide-details />
                    </div>
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Deskripsi Paket</h3>
                        <v-text-field placeholder="Sebutkan detail kelebihan paket, jenis deterjen ramah lingkungan, setrika uap, lipat rapi, 
dsb..." variant="solo" clearable hide-details />
                    </div>
                    <div class="flex flex-col gap-1">
                        <h3 class="font-bold">Harga Paket</h3>
                        <div class="bg-blue-200 rounded-xl px-4 flex gap-4 items-center">
                            <p>Rp</p>
                            <v-locale-provider locale="de">

                                <v-number-input control-variant="hidden" :min="0" placeholder="10.000" variant="solo"
                                    inset hide-details single-line :precision="0" grouping="auto" />
                            </v-locale-provider>
                            <p>/kg</p>
                        </div>
                    </div>
                    <div class="flex flex-row-reverse justify-between">
                        <div class="flex gap-4">
                            <v-btn text="Batal" @click="isActive.value = false" variant="text" />
                            <v-btn prepend-icon="mdi-check" class="bg-cyan-700 text-cyan-50"
                                :text="type === 'new' ? 'Tambah Paket' : 'Simpan Perubahan'"
                                @click="isActive.value = false"></v-btn>
                        </div>
                        <!-- <v-btn v-if="type === 'edit'" class="bg-red-300 text-red-800"
                            prepend-icon="mdi-trash-can-outline" text="Hapus Paket" @click="isActive.value = false" /> -->
                        <delete-dialog v-if="type === 'edit'" title="Hapus Paket" button-text="Hapus Paket"
                            :action="() => { isOpen = false }" />
                    </div>
                </div>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import DeleteDialog from './DeleteDialog.vue';

defineProps<{
    type: 'new' | 'edit'
}>()
const isOpen = defineModel<boolean>({ default: false })
</script>

<style scoped></style>