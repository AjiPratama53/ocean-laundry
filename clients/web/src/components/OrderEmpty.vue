<template>
    <v-card class="p-8 gap-4 flex flex-col items-center">
        <img src="@/assets/order_empty.svg" alt="No order">
        <h2 class="font-bold text-2xl">Belum ada pesanan untuk dikonfirmasi</h2>
        <p v-if="canOrder">
            Pilih layanan laundry terlebih dahulu untuk membuat pesanan baru.
        </p>
        <v-btn v-if="canOrder" class="bg-cyan-700 text-cyan-50" size="large" text="Pilih Paket Layanan" to="/catalogue" />
    </v-card>

</template>

<script setup lang="ts">
/** canOrder mirrors the /catalogue guard (orders:write): show the
 * "create order" CTA only to tokens that may open it. */
defineProps<{
    canOrder: boolean
}>();
</script>

<style scoped></style>