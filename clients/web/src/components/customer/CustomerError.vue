<template>
    <v-card class="p-8 gap-4 flex flex-col items-center">
        <img src="@/assets/customer_error.svg" alt="Error">
        <h2 class="font-bold text-2xl">{{ title }}</h2>
        <p class="text-center">{{ detail }}</p>
        <v-btn class="bg-cyan-700 text-cyan-50" size="large" text="Coba lagi" @click="$emit('retry')" />
        <a class="text-cyan-700" href="https://www.google.com">Hubungi Customer Service</a>
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

// A.3.2 + A.6.4: 401/403/404 are three different situations, in domain terms.
const title = computed(() => {
    if (props.status === 401) return 'Sesi berakhir — silakan masuk lagi';
    if (props.status === 403) return 'Akun ini tidak diizinkan';
    if (props.status === 404) return 'Tidak ditemukan';
    return 'Gagal Memuat Halaman';
});

const detail = computed(() => {
    if (props.problem?.detail) {
        if (props.status === 403)
            return 'Akun Anda tidak memiliki hak untuk melihat ini. Masuk lagi sebagai akun yang sama tidak akan mengubah apa pun.';
        if (props.status === 404)
            return 'Data tidak ada — atau tidak terlihat oleh akun ini.';
        return props.problem.detail;
    }
    return 'Sepertinya ada gangguan koneksi. Coba muat ulang halaman ini, atau hubungi tim kami jika masalah berlanjut.';
});
</script>

<style scoped></style>
