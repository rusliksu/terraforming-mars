<template>
  <div class="card-library">
    <div class="card-library-header">
      <h1 v-i18n>Card library</h1>
      <div class="card-library-header-links">
        <a v-if="isAdmin" class="btn" :href="`${paths.GAMES_OVERVIEW}?serverId=${serverId}`" v-i18n>Games overview</a>
        <a v-if="isAdmin" class="btn" :href="`${paths.MAP_LIBRARY}?serverId=${serverId}`" v-i18n>Map library</a>
        <a class="btn btn-primary" :href="paths.CUSTOM_CARD_MAKER" v-i18n>Open card maker</a>
      </div>
    </div>

    <div class="card-library-toolbar">
      <fieldset class="card-library-filters">
        <legend v-i18n>Show</legend>
        <label><input type="checkbox" v-model="statusFilter.submitted"> <span v-i18n>Submitted</span></label>
        <label><input type="checkbox" v-model="statusFilter.approved"> <span v-i18n>Approved</span></label>
      </fieldset>

      <label class="card-library-sort">
        <span v-i18n>Sort by</span>
        <select v-model="sortBy">
          <option value="oldest" v-i18n>Oldest</option>
          <option value="newest" v-i18n>Newest</option>
          <option value="name" v-i18n>Name</option>
        </select>
      </label>
    </div>

    <p v-if="loading" v-i18n>Loading…</p>
    <p v-else-if="error" class="card-library-error">{{ error }}</p>
    <p v-else-if="sortedEntries.length === 0" v-i18n>No custom cards match these filters.</p>
    <div v-else class="card-library-grid">
      <CardLibraryRow
        v-for="entry in sortedEntries"
        :key="entry.id"
        :entry="entry"
        :is-admin="isAdmin"
        @approve="approve"
        @delete="remove"
        @set-behavior="setBehavior"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import CardLibraryRow from '@/client/components/cardlibrary/CardLibraryRow.vue';
import {CustomCardLibraryEntry, CustomCardEntryId} from '@/common/cards/CustomCardLibraryEntry';
import {paths} from '@/common/app/paths';
import {setDocumentTitle} from '@/client/utils/documentTitle';

type SortBy = 'oldest' | 'newest' | 'name';

type DataModel = {
  entries: Array<CustomCardLibraryEntry>;
  loading: boolean;
  error: string;
  statusFilter: {submitted: boolean, approved: boolean};
  sortBy: SortBy;
};

export default defineComponent({
  name: 'CardLibrary',
  components: {CardLibraryRow},
  data(): DataModel {
    return {
      entries: [],
      loading: true,
      error: '',
      statusFilter: {submitted: true, approved: true},
      sortBy: 'oldest',
    };
  },
  mounted() {
    setDocumentTitle('Card library');
    this.fetchEntries();
  },
  computed: {
    paths: () => paths,
    serverId(): string {
      return (new URL(location.href)).searchParams.get('serverId') || '';
    },
    isAdmin(): boolean {
      return this.serverId !== '';
    },
    filteredEntries(): Array<CustomCardLibraryEntry> {
      return this.entries.filter((entry) => {
        return entry.status === 'submitted' ? this.statusFilter.submitted : this.statusFilter.approved;
      });
    },
    sortedEntries(): Array<CustomCardLibraryEntry> {
      const list = [...this.filteredEntries];
      if (this.sortBy === 'name') {
        list.sort((a, b) => a.definition.cardName.localeCompare(b.definition.cardName));
      } else if (this.sortBy === 'oldest') {
        list.sort((a, b) => a.createdAt - b.createdAt);
      } else {
        list.sort((a, b) => b.createdAt - a.createdAt);
      }
      return list;
    },
  },
  methods: {
    async fetchEntries(): Promise<void> {
      this.loading = true;
      this.error = '';
      try {
        const response = await fetch(paths.API_CUSTOM_CARD_LIBRARY);
        if (!response.ok) {
          throw new Error('bad response');
        }
        this.entries = await response.json();
      } catch (e) {
        this.error = 'Could not load the card library.';
      } finally {
        this.loading = false;
      }
    },
    approve(id: CustomCardEntryId): void {
      this.review(id, 'approve');
    },
    remove(id: CustomCardEntryId): void {
      if (!window.confirm('Delete this custom card? This cannot be undone.')) {
        return;
      }
      this.review(id, 'delete');
    },
    setBehavior(id: CustomCardEntryId, behavior: unknown): void {
      this.review(id, 'set-behavior', behavior);
    },
    async review(id: CustomCardEntryId, action: 'approve' | 'delete' | 'set-behavior', behavior?: unknown): Promise<void> {
      try {
        const response = await fetch(`${paths.API_CUSTOM_CARD_LIBRARY_REVIEW}?serverId=${this.serverId}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id, action, behavior}),
        });
        if (!response.ok) {
          alert('That action failed.');
          return;
        }
        if (action === 'delete') {
          this.entries = this.entries.filter((entry) => entry.id !== id);
        } else {
          // 'approve' and 'set-behavior' both return the up-to-date entry set server-side is
          // cheap to just re-fetch rather than hand-patch (set-behavior also recomputes
          // shareCode, which this page has no local way to derive).
          await this.fetchEntries();
        }
      } catch (e) {
        alert('Error performing that action.');
      }
    },
  },
});
</script>

<style scoped lang="less">
.card-library {
  padding: 20px;
  color: #ddd;
  max-width: 1600px;
  margin: 0 auto;

  h1 { color: #fff; margin: 0; }
}
.card-library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.card-library-header-links {
  display: flex;
  gap: 8px;
}
.card-library-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.card-library-filters {
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px;
  legend { padding: 0 4px; }
  label { display: inline-flex; align-items: center; gap: 4px; margin-right: 10px; font-size: 13px; }
}
.card-library-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.card-library-error { color: #e74c3c; }
.card-library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 16px;
  align-items: stretch;
}
</style>
