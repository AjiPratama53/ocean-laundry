<template>
    <v-container>
        <h1>Orders</h1>
        <v-list lines="three">
            <v-list-item v-for="(order) in orders.getOrders" :key="order.id" :title="order.createdAt.toString()"
                :subtitle="`Status: ${order.status}`"></v-list-item>
        </v-list>
    </v-container>
</template>

<script setup lang="ts">
import { useOrderStore } from '@/stores/orderStore';

const orders = useOrderStore();
</script>

<style scoped></style>