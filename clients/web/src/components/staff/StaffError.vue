<template>
    <v-card class="p-8 gap-4 flex flex-col items-center">
        <v-row class="flex justify-between items-center w-full">
            <v-row class="inline-flex w-fit flex-none gap-1 items-center bg-red-200 text-red-700 py-1 px-4 rounded-2xl">
                <v-icon icon="mdi-alert-circle-outline" />
                <p>{{ label }}</p>
            </v-row>
            <p>Cluster: JKT-SEL-NODE-04</p>
        </v-row>
        <v-col class="flex flex-col items-center w-2/3 gap-2">
            <img src="@/assets/staff_error.svg" alt="Connection error">
            <h2 class="font-bold text-2xl">{{ title }}</h2>
            <p class="text-center">{{ detail }}</p>
        </v-col>
        <v-col class="flex flex-col items-center w-2/3 gap-2">
            <v-btn class="bg-cyan-700 text-cyan-50" prepend-icon="mdi-refresh"
                text="Coba Hubungkan Ulang (Retry Connection)" size="large" @click="$emit('retry')" />
            <v-btn class="bg-cyan-50 text-cyan-700" prepend-icon="mdi-archive-outline"
                text="Buka Mode Offline (Cache Lokal)" variant="text" />
            <v-btn class="text-cyan-700" prepend-icon="mdi-message-text-outline" text="Laporkan via WhatsApp Helpdesk"
                variant="text" />
        </v-col>
    </v-card>

</template>

<script setup lang="ts">
import type { Problem } from '@/lib/api';
import { computed } from 'vue';

const props = defineProps<{
    problem?: Problem | null;
    status?: number | null;
}>();

defineEmits(['retry']);

const label = computed(() => {
    if (props.status != null) return `HTTP ${props.status}`;
    return 'HTTP 503 — Service Unavailable / Gateway Timeout';
});

const title = computed(() => {
    if (props.status === 401) return 'Sesi berakhir — silakan masuk lagi';
    if (props.status === 403) return 'Akun ini tidak diizinkan (403)';
    if (props.status === 404) return 'Tidak ditemukan (404)';
    if (props.status === 412) return 'Sudah ditangani rekan (412)';
    return 'Gagal Memuat Data Katalog & Operasional';
});

const detail = computed(() => {
    if (props.status === 403)
        return 'Token valid tetapi scope tidak cukup. Masuk lagi sebagai orang yang sama tidak mengubah apa pun.';
    if (props.problem?.detail) return props.problem.detail;
    return 'Sistem mengalami kendala saat menghubungkan ke server pusat. Pekerjaan cucian di mesin tetap berjalan secara mandiri dan aman.';
});
</script>

<style scoped></style>
