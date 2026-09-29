<template>
    <v-card class="p-8 gap-4 flex flex-col items-center">
        <img src="@/assets/order_empty.svg" alt="No order">
        <h2 class="font-bold text-2xl">Belum ada pesanan untuk dikonfirmasi</h2>
        <p v-if="isCustomer">
            Pilih layanan laundry terlebih dahulu untuk membuat pesanan baru.
        </p>
        <v-btn v-if="isCustomer" class="bg-cyan-700 text-cyan-50" size="large" text="Pilih Paket Layanan" />
    </v-card>

</template>

<script setup lang="ts">
defineProps<{
    isCustomer: boolean
}>();
</script>

<style scoped></style>