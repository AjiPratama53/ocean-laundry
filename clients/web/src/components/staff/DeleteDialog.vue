<template>
    <v-dialog max-width="500">
        <template v-slot:activator="{ props: activatorProps }">
            <v-btn v-bind="activatorProps" class="bg-red-300 text-red-800" prepend-icon="mdi-trash-can-outline">
                {{ buttonText }}
            </v-btn>
        </template>

        <template v-slot:default="{ isActive }">
            <v-card :title="title">
                <v-card-text>
                    Yakin mau dihapus?
                </v-card-text>

                <v-card-actions>
                    <v-spacer></v-spacer>

                    <v-btn-group>

                        <v-btn text="Hapus" @click="action(); isActive.value = false" class="bg-red-300 text-red-800" />
                        <v-btn text="Batal" @click="isActive.value = false" />
                    </v-btn-group>
                </v-card-actions>
            </v-card>
        </template>
    </v-dialog>
</template>

<script setup lang="ts">
defineProps({
    action: {
        type: Function,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    buttonText: String,
    variant: {
        type: String as () => "text" | "tonal" | "flat" | "elevated" | "outlined" | "plain" | undefined,
        default: 'tonal'
    }
})
</script>
