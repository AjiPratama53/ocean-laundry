<template>
    <v-dialog v-model="isOpen" max-width="500" :persistent="isLoading">
        <template v-slot:activator="slotProps">
            <slot v-if="$slots.activator || buttonText" name="activator" v-bind="slotProps">
                <v-btn v-bind="slotProps.props" class="bg-red-300 text-red-800"
                    prepend-icon="mdi-trash-can-outline">
                    {{ buttonText ?? confirmText }}
                </v-btn>
            </slot>
        </template>

        <template v-slot:default="{ isActive }">
            <v-card :title="title">
                <v-card-text>
                    {{ message }}
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>

                    <v-btn-group>

                        <v-btn :text="confirmText" :loading="isLoading" :disabled="isLoading"
                            @click="handleConfirm(isActive)" class="bg-red-300 text-red-800" />
                        <v-btn :text="cancelText" :disabled="isLoading" @click="isActive.value = false" />
                    </v-btn-group>
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'

/**
 * Generic confirmation dialog for critical processes (hapus paket,
 * batalkan order, ...). UX only — the service remains the enforcer.
 *
 * Two modes:
 * - Activator mode: pass `buttonText` (or an `activator` slot) and the
 *   dialog renders its own trigger button (e.g. "Hapus Paket" inside
 *   PackageDialog).
 * - Controlled mode: bind `v-model` from the parent and render a custom
 *   trigger button elsewhere (e.g. big "Batalkan Pesanan" in
 *   OrderDetailView); omit `buttonText`/`activator` so no built-in
 *   trigger is rendered.
 *
 * `action` owns domain error mapping (412/403/404 → form message) and
 * must resolve once the outcome is handled (dialog closes + `done`
 * emitted). If it rejects, the dialog stays open and `error` is emitted.
 */
const props = withDefaults(defineProps<{
    action: () => Promise<unknown> | unknown;
    title: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    buttonText?: string;
}>(), {
    message: 'Apakah Anda yakin ingin melanjutkan?',
    confirmText: 'Hapus',
    cancelText: 'Batal',
    buttonText: undefined,
})

const emit = defineEmits<{
    done: [];
    error: [e: unknown];
}>()

const isOpen = defineModel<boolean>({ default: false })

const isLoading = ref(false)

async function handleConfirm(isActive: { value: boolean }) {
    isLoading.value = true
    try {
        await props.action()
        emit('done')
        isActive.value = false
    } catch (e) {
        emit('error', e)
    } finally {
        isLoading.value = false
    }
}
</script>
