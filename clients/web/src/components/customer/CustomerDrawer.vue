<template>
    <Drawer username="Customer A" role="Customer">
        <v-list-item prepend-icon="mdi-archive-outline" link title="Katalog Laundry" />
        <v-list-item prepend-icon="mdi-invoice-text-outline" link title="Pesanan Saya" />
        <v-list-item prepend-icon="mdi-washing-machine" link title="Tracking & Riwayat" />
    </Drawer>
</template>
<script setup lang="ts">
import Drawer from '../Drawer.vue';

</script>
<style scoped></style>