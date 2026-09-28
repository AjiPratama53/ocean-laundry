<template>
    <v-card class="p-8 gap-4 flex flex-col items-center">
        <v-row class="flex justify-between items-center w-full">
            <v-row class="inline-flex w-fit flex-none gap-1 items-center bg-red-200 text-red-700 py-1 px-4 rounded-2xl">
                <v-icon icon="mdi-alert-circle-outline" />
                <p>{{ error }}</p>
            </v-row>
            <p>Cluster: JKT-SEL-NODE-04</p>
        </v-row>
        <v-col class="flex flex-col items-center w-2/3 gap-2">
            <img src="@/assets/staff_error.svg" alt="Connection error">
            <h2 class="font-bold text-2xl">Gagal Memuat Data Katalog &
                Operasional</h2>
            <p>Sistem mengalami kendala saat menghubungkan ke database server pusat
                dan gateway telemetri mesin IoT Cabang Utama Jakarta Selatan. Pekerjaan
                cucian di mesin tetap berjalan secara mandiri dan aman.</p>
        </v-col>
        <v-col class="flex flex-col items-center w-2/3 gap-2">
            <v-btn class="bg-cyan-700 text-cyan-50" prepend-icon="mdi-refresh"
                text="Coba Hubungkan Ulang (Retry Connection)" size="large" />
            <v-btn class="bg-cyan-50 text-cyan-700" prepend-icon="mdi-archive-outline"
                text="Buka Mode Offline (Cache Lokal)" variant="text" />
            <v-btn class="text-cyan-700" prepend-icon="mdi-message-text-outline" text="Laporkan via WhatsApp Helpdesk"
                variant="text" />
        </v-col>
    </v-card>

</template>

<script setup lang="ts">
import { ref } from 'vue';
import { VBtn } from 'vuetify/components';

const error = ref('HTTP 503 — Service Unavailable / Gateway Timeout');
</script>

<style scoped></style>