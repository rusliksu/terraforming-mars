<template>
  <div class="map-submit-form">
    <label class="map-submit-field">
      <span v-i18n>Map code</span>
      <textarea rows="3" v-model="codeInput" @input="validate" placeholder="Paste a TMB3… code from the map editor" class="map-submit-code"></textarea>
    </label>
    <div v-if="codeError" class="map-submit-error">{{ codeError }}</div>
    <template v-else-if="decoded !== undefined">
      <div class="map-submit-preview-label" v-i18n>This is how it'll look in the Map Library:</div>
      <MapLibraryRow :entry="previewEntry" :is-admin="false" :preview-only="true"/>
      <div v-if="warnings.length" class="map-submit-warnings">
        <div v-for="(w, i) in warnings" :key="i">⚠ {{ w }}</div>
      </div>
    </template>

    <label class="map-submit-field">
      <span v-i18n>Description</span>
      <textarea rows="2" v-model="description" :maxlength="MAX_MAP_LIBRARY_DESCRIPTION_LENGTH" class="map-submit-description"></textarea>
    </label>
    <label class="map-submit-field">
      <span v-i18n>Submitted by</span>
      <input type="text" v-model="submittedBy" :maxlength="MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH">
    </label>

    <div v-if="submitError" class="map-submit-error">{{ submitError }}</div>
    <button type="button" class="btn btn-primary" :disabled="decoded === undefined || submitting" @click="submit" v-i18n>
      Submit map
    </button>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import MapLibraryRow from '@/client/components/maplibrary/MapLibraryRow.vue';
import {CustomBoardDefinition} from '@/common/boards/CustomBoardDefinition';
import {decodeCustomBoard, validateCustomBoard} from '@/common/boards/customBoardCodec';
import {MAX_MAP_LIBRARY_DESCRIPTION_LENGTH, MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH, MapLibraryEntry} from '@/common/boards/MapLibraryEntry';
import {paths} from '@/common/app/paths';

type DataModel = {
  codeInput: string;
  codeError: string;
  decoded: CustomBoardDefinition | undefined;
  description: string;
  submittedBy: string;
  submitting: boolean;
  submitError: string;
};

export default defineComponent({
  name: 'MapSubmitForm',
  components: {MapLibraryRow},
  emits: ['submitted'],
  data(): DataModel {
    return {
      codeInput: '',
      codeError: '',
      decoded: undefined,
      description: '',
      submittedBy: '',
      submitting: false,
      submitError: '',
    };
  },
  computed: {
    MAX_MAP_LIBRARY_DESCRIPTION_LENGTH: () => MAX_MAP_LIBRARY_DESCRIPTION_LENGTH,
    MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH: () => MAX_MAP_LIBRARY_SUBMITTED_BY_LENGTH,
    warnings(): Array<string> {
      return this.decoded === undefined ? [] : validateCustomBoard(this.decoded);
    },
    // Not a real library row -- there's no id yet, and it isn't approved -- but it round-trips
    // through the same MapLibraryRow used on the real list, so this preview can never drift from
    // what the entry will actually look like once submitted.
    previewEntry(): MapLibraryEntry {
      return {
        id: 'm-preview',
        code: this.codeInput.trim(),
        description: this.description,
        submittedBy: this.submittedBy,
        origin: 'fanmade',
        status: 'submitted',
        createdAt: Date.now(),
      };
    },
  },
  methods: {
    validate(): void {
      const code = this.codeInput.trim();
      this.submitError = '';
      if (code === '') {
        this.decoded = undefined;
        this.codeError = '';
        return;
      }
      try {
        this.decoded = decodeCustomBoard(code);
        this.codeError = '';
      } catch (e) {
        this.decoded = undefined;
        this.codeError = e instanceof Error ? e.message : String(e);
      }
    },
    async submit(): Promise<void> {
      if (this.decoded === undefined) {
        return;
      }
      this.submitting = true;
      this.submitError = '';
      try {
        const response = await fetch(paths.API_MAP_LIBRARY, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            code: this.codeInput.trim(),
            description: this.description,
            submittedBy: this.submittedBy,
          }),
        });
        if (response.status === 429) {
          this.submitError = 'You are submitting maps too quickly. Try again later.';
          return;
        }
        if (!response.ok) {
          const body = await response.text();
          this.submitError = body || 'That map could not be submitted.';
          return;
        }
        const result = await response.json() as {entry: MapLibraryEntry};
        this.$emit('submitted', result.entry);
        this.codeInput = '';
        this.decoded = undefined;
        this.description = '';
        this.submittedBy = '';
      } catch (e) {
        this.submitError = 'Error submitting that map.';
      } finally {
        this.submitting = false;
      }
    },
  },
});
</script>

<style scoped lang="less">
.map-submit-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  // Wide enough for MapLibraryRow's real (non-large) 500px-wide card preview plus its padding.
  max-width: 560px;
  color: #ddd;
}
.map-submit-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  textarea, input { font-family: inherit; }
  .map-submit-code { font-family: monospace; font-size: 11px; }
}
.map-submit-error { color: #e74c3c; font-size: 12px; }
.map-submit-warnings { color: #f1c40f; font-size: 11px; }
.map-submit-preview-label {
  font-size: 12px;
  color: #999;
}
</style>
