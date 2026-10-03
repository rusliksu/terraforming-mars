<template>
  <div class="map-library">
    <div class="map-library-header">
      <h1 v-i18n>Map library</h1>
      <div class="map-library-header-links">
        <a v-if="isAdmin" class="btn" :href="`${paths.GAMES_OVERVIEW}?serverId=${serverId}`" v-i18n>Games overview</a>
        <a v-if="isAdmin" class="btn" :href="`${paths.CARD_LIBRARY}?serverId=${serverId}`" v-i18n>Card library</a>
        <a class="btn btn-primary" :href="paths.MAP_EDITOR" v-i18n>Open map editor</a>
      </div>
    </div>

    <div class="map-library-toolbar">
      <fieldset class="map-library-filters">
        <legend v-i18n>Show</legend>
        <label><input type="checkbox" v-model="originFilter.official"> <span v-i18n>Official</span></label>
        <label><input type="checkbox" v-model="originFilter.fanmade"> <span v-i18n>Fan-made</span></label>
        <label v-if="originFilter.fanmade" class="map-library-subfilter">
          <input type="checkbox" v-model="statusFilter.submitted"> <span v-i18n>Submitted</span>
        </label>
        <label v-if="originFilter.fanmade" class="map-library-subfilter">
          <input type="checkbox" v-model="statusFilter.approved"> <span v-i18n>Approved</span>
        </label>
      </fieldset>

      <label class="map-library-sort">
        <span v-i18n>Sort by</span>
        <select v-model="sortBy">
          <option value="oldest" v-i18n>Oldest</option>
          <option value="newest" v-i18n>Newest</option>
          <option value="name" v-i18n>Name</option>
        </select>
      </label>

      <fieldset class="map-library-layout">
        <legend v-i18n>Layout</legend>
        <label><input type="radio" name="map-library-layout" value="grid" v-model="layout"> <span v-i18n>Grid</span></label>
        <label><input type="radio" name="map-library-layout" value="list" v-model="layout"> <span v-i18n>List (larger)</span></label>
      </fieldset>

      <button type="button" class="btn" @click="showSubmitForm = !showSubmitForm" v-i18n>
        {{ showSubmitForm ? 'Cancel' : 'Submit a map' }}
      </button>
    </div>

    <MapSubmitForm v-if="showSubmitForm" @submitted="onSubmitted"/>

    <p v-if="loading" v-i18n>Loading…</p>
    <p v-else-if="error" class="map-library-error">{{ error }}</p>
    <p v-else-if="sortedEntries.length === 0" v-i18n>No maps match these filters.</p>
    <div v-else class="map-library-grid" :class="{'map-library-grid--list': layout === 'list'}">
      <MapLibraryRow
        v-for="entry in sortedEntries"
        :key="entry.id"
        :entry="entry"
        :is-admin="isAdmin"
        :large="layout === 'list'"
        @approve="approve"
        @delete="remove"
      />
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent} from 'vue';
import MapLibraryRow from '@/client/components/maplibrary/MapLibraryRow.vue';
import MapSubmitForm from '@/client/components/maplibrary/MapSubmitForm.vue';
import {MapLibraryEntry, MapLibraryEntryId} from '@/common/boards/MapLibraryEntry';
import {CustomBoardDefinition} from '@/common/boards/CustomBoardDefinition';
import {decodeCustomBoard} from '@/common/boards/customBoardCodec';
import {paths} from '@/common/app/paths';
import {setDocumentTitle} from '@/client/utils/documentTitle';

type SortBy = 'oldest' | 'newest' | 'name';
type Layout = 'grid' | 'list';

type DataModel = {
  entries: Array<MapLibraryEntry>;
  loading: boolean;
  error: string;
  showSubmitForm: boolean;
  originFilter: {official: boolean, fanmade: boolean};
  statusFilter: {submitted: boolean, approved: boolean};
  sortBy: SortBy;
  layout: Layout;
};

const LAYOUT_STORAGE_KEY = 'mapLibraryLayout';

function loadStoredLayout(): Layout {
  try {
    return window.localStorage?.getItem(LAYOUT_STORAGE_KEY) === 'grid' ? 'grid' : 'list';
  } catch (e) {
    return 'list';
  }
}

export default defineComponent({
  name: 'MapLibrary',
  components: {MapLibraryRow, MapSubmitForm},
  data(): DataModel {
    return {
      entries: [],
      loading: true,
      error: '',
      showSubmitForm: false,
      originFilter: {official: true, fanmade: true},
      statusFilter: {submitted: true, approved: true},
      sortBy: 'oldest',
      layout: loadStoredLayout(),
    };
  },
  mounted() {
    setDocumentTitle('Map library');
    this.fetchEntries();
  },
  watch: {
    layout(newValue: Layout): void {
      try {
        window.localStorage?.setItem(LAYOUT_STORAGE_KEY, newValue);
      } catch (e) {
        // localStorage may be unavailable; the toggle still works for this page view.
      }
    },
  },
  computed: {
    paths: () => paths,
    serverId(): string {
      return (new URL(location.href)).searchParams.get('serverId') || '';
    },
    isAdmin(): boolean {
      return this.serverId !== '';
    },
    decodedById(): Map<MapLibraryEntryId, CustomBoardDefinition | undefined> {
      const map = new Map<MapLibraryEntryId, CustomBoardDefinition | undefined>();
      for (const entry of this.entries) {
        try {
          map.set(entry.id, decodeCustomBoard(entry.code));
        } catch (e) {
          map.set(entry.id, undefined);
        }
      }
      return map;
    },
    filteredEntries(): Array<MapLibraryEntry> {
      return this.entries.filter((entry) => {
        if (entry.origin === 'official') {
          return this.originFilter.official;
        }
        if (!this.originFilter.fanmade) {
          return false;
        }
        return entry.status === 'submitted' ? this.statusFilter.submitted : this.statusFilter.approved;
      });
    },
    sortedEntries(): Array<MapLibraryEntry> {
      const list = [...this.filteredEntries];
      if (this.sortBy === 'name') {
        list.sort((a, b) => {
          const nameA = this.decodedById.get(a.id)?.name ?? '';
          const nameB = this.decodedById.get(b.id)?.name ?? '';
          return nameA.localeCompare(nameB);
        });
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
        const response = await fetch(paths.API_MAP_LIBRARY);
        if (!response.ok) {
          throw new Error('bad response');
        }
        this.entries = await response.json();
      } catch (e) {
        this.error = 'Could not load the map library.';
      } finally {
        this.loading = false;
      }
    },
    onSubmitted(entry: MapLibraryEntry): void {
      this.entries = [entry, ...this.entries];
      this.showSubmitForm = false;
    },
    approve(id: MapLibraryEntryId): void {
      this.review(id, 'approve');
    },
    remove(id: MapLibraryEntryId): void {
      if (!window.confirm('Delete this map? This cannot be undone.')) {
        return;
      }
      this.review(id, 'delete');
    },
    async review(id: MapLibraryEntryId, action: 'approve' | 'delete'): Promise<void> {
      try {
        const response = await fetch(`${paths.API_MAP_LIBRARY_REVIEW}?serverId=${this.serverId}`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({id, action}),
        });
        if (!response.ok) {
          alert('That action failed.');
          return;
        }
        if (action === 'delete') {
          this.entries = this.entries.filter((entry) => entry.id !== id);
        } else {
          const entry = this.entries.find((entry) => entry.id === id);
          if (entry !== undefined) {
            entry.status = 'approved';
          }
        }
      } catch (e) {
        alert('Error performing that action.');
      }
    },
  },
});
</script>

<style scoped lang="less">
.map-library {
  padding: 20px;
  color: #ddd;
  max-width: 1600px;
  margin: 0 auto;

  h1 { color: #fff; margin: 0; }
}
.map-library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.map-library-header-links {
  display: flex;
  gap: 8px;
}
.map-library-toolbar {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.map-library-filters, .map-library-layout {
  border: 1px solid #444;
  border-radius: 4px;
  padding: 6px 10px;
  legend { padding: 0 4px; }
  label { display: inline-flex; align-items: center; gap: 4px; margin-right: 10px; font-size: 13px; }
}
.map-library-subfilter { margin-left: 8px; opacity: 0.85; }
.map-library-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}
.map-library-error { color: #e74c3c; }
// 2-3 cards per row, reflowing to fewer on narrower viewports.
.map-library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(520px, 1fr));
  gap: 16px;
  align-items: stretch;
}
// One big card per row instead, so each map (and its thumbnail, rendered notably larger by
// MapLibraryRow's `large` prop) has the full width to itself.
.map-library-grid--list {
  grid-template-columns: 1fr;
}
</style>
