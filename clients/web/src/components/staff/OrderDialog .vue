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
                        <h2 class="font-bold text-2xl">Update Pesanan
                        </h2>
                        <p>Update status pesanan pelanggan</p>
                    </div>
                </div>
                <v-col class="flex flex-col p-8 gap-6">
                    <h3 class="font-bold text-2xl">#{{ order.id.toUpperCase() }}</h3>
                    <v-row class="flex justify-between items-center">
                        <p class="font-bold">Status</p>
                        <div class="flex bg-green-200 text-green-800 px-3 py-1 rounded-2xl">
                            <v-icon icon="mdi-circle-small" />
                            <p>{{ order.status }}</p>
                        </div>
                    </v-row>
                    <v-divider />
                    <v-col>
                        <v-row class="flex justify-between items-center">
                            <p>Paket</p>
                            <p>{{ package.name }}</p>
                        </v-row>
                        <v-row class="flex justify-between items-center">
                            <p>Alamat</p>
                            <p>{{ order.pickupAddress }}</p>
                        </v-row>
                        <v-row class="flex justify-between items-center">
                            <p>Subtotal</p>
                            <p>
                                {{ order.weightGrams && package ? `Rp ${order.weightGrams * package / 1000}` : '--.---'
                                }}
                            </p>
                        </v-row>
                    </v-col>
                    <v-divider />

                    <v-row v-if="order.status === 'picked_up'" class="flex justify-between items-center">
                        <p class="font-bold">Berat</p>
                        <div class="bg-blue-200 rounded-xl px-4 flex gap-4 items-center w-sm">
                            <v-locale-provider locale="de">
                                <v-number-input control-variant="hidden" :min="1" placeholder="10.000" variant="solo"
                                    inset hide-details single-line :precision="0" grouping="auto" autofocus clearable
                                    v-model="inputWeight" />
                            </v-locale-provider>
                            <p>gram</p>
                        </div>
                    </v-row>

                    <div class="flex flex-row-reverse justify-between">
                        <div class="flex gap-4">
                            <v-btn text="Batal" @click="isActive.value = false" variant="text" />
                            <v-btn prepend-icon="mdi-check" class="bg-cyan-700 text-cyan-50"
                                text="Update Status Pesanan" :loading="isUpdatingOrder"
                                @click="handleUpdateOrder().then(() => { isActive.value = false })"></v-btn>
                        </div>
                    </div>
                </v-col>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import type { Order, Package } from '@/lib/api';
import formatBalance from '@/lib/formatPrice';
import { ref } from 'vue';

defineProps<{
    order: Order,
    package: Package
}>();

const isOpen = defineModel<boolean>({ default: false })
const isUpdatingOrder = ref(false);

const inputWeight = ref();

async function handleUpdateOrder() {
    isUpdatingOrder.value = true;

    try {
        // Update order status here
        await new Promise((resolve) => setTimeout(resolve, 3000));

    } catch (error) {

    } finally {
        isUpdatingOrder.value = false;
        inputWeight.value = undefined;
    }
}

</script>

<style scoped></style>