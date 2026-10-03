<template>
  <div class="map-card">
    <div class="map-card-thumb">
      <MapThumbnail v-if="decoded !== undefined" :definition="decoded" :width="thumbnailWidth" :height="thumbnailHeight"/>
      <div v-else class="map-thumbnail map-thumbnail--error" :style="{width: thumbnailWidth + 'px', height: thumbnailHeight + 'px'}" v-i18n>Can't preview this map</div>
    </div>

    <div class="map-card-body">
      <div class="map-card-title">{{ name }}</div>
      <div class="map-card-tags">
        <span class="map-library-tag" :class="'map-library-tag--' + entry.origin">{{ entry.origin }}</span>
        <span v-if="entry.origin === 'fanmade'" class="map-library-tag" :class="'map-library-tag--' + entry.status">{{ entry.status }}</span>
      </div>
      <p v-if="entry.description" class="map-card-description">{{ entry.description }}</p>
      <p v-if="entry.submittedBy" class="map-card-submitter">
        <span v-i18n>Submitted by</span>: {{ entry.submittedBy }}
      </p>

      <div v-if="!previewOnly" class="map-card-actions">
        <button type="button" class="btn btn-primary" @click="play" v-i18n>Play this map</button>
        <button type="button" class="btn" @click="openInEditor" v-i18n>Open in editor</button>
        <button type="button" class="btn" @click="copyCode" v-i18n>{{ copyButtonLabel }}</button>
        <template v-if="isAdmin">
          <button v-if="entry.origin === 'fanmade' && entry.status === 'submitted'" type="button" class="btn" @click="$emit('approve', entry.id)" v-i18n>
            Approve
          </button>
          <button v-if="entry.origin === 'fanmade'" type="button" class="btn btn-error" @click="$emit('delete', entry.id)" v-i18n>Delete</button>
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import MapThumbnail from '@/client/components/maplibrary/MapThumbnail.vue';
import {MapLibraryEntry} from '@/common/boards/MapLibraryEntry';
import {CustomBoardDefinition} from '@/common/boards/CustomBoardDefinition';
import {decodeCustomBoard} from '@/common/boards/customBoardCodec';
import {boardNameForOfficialMapLibraryId} from '@/common/boards/officialMapLibraryLookup';
import {paths} from '@/common/app/paths';

type DataModel = {
  copied: boolean;
};

// Sized well above MapThumbnail's own default -- the map itself is the point of a library card.
const THUMBNAIL_WIDTH = 500;
const THUMBNAIL_HEIGHT = 410;
// MapLibrary.vue's "List" layout (now the default): one card per row, so the thumbnail can go
// a lot bigger. Same aspect ratio as the grid size above (500:410), scaled down 20% from an
// earlier, too-large 900x738.
const LARGE_THUMBNAIL_WIDTH = 720;
const LARGE_THUMBNAIL_HEIGHT = 590;

export default defineComponent({
  name: 'MapLibraryRow',
  components: {MapThumbnail},
  props: {
    entry: {type: Object as PropType<MapLibraryEntry>, required: true},
    isAdmin: {type: Boolean, default: false},
    // MapLibrary.vue's "List" layout -- render a notably bigger thumbnail.
    large: {type: Boolean, default: false},
    // MapSubmitForm.vue's "here's how it'll look" preview: this entry isn't real yet (no id,
    // not actually submitted), so Play/Open in editor/Copy code/Approve/Delete would all be
    // either meaningless or, worse, a way to accidentally navigate away mid-submission.
    previewOnly: {type: Boolean, default: false},
  },
  emits: ['approve', 'delete'],
  data(): DataModel {
    return {copied: false};
  },
  computed: {
    thumbnailWidth(): number {
      return this.large ? LARGE_THUMBNAIL_WIDTH : THUMBNAIL_WIDTH;
    },
    thumbnailHeight(): number {
      return this.large ? LARGE_THUMBNAIL_HEIGHT : THUMBNAIL_HEIGHT;
    },
    decoded(): CustomBoardDefinition | undefined {
      try {
        return decodeCustomBoard(this.entry.code);
      } catch (e) {
        return undefined;
      }
    },
    name(): string {
      return this.decoded?.name ?? this.entry.id;
    },
    copyButtonLabel(): string {
      return this.copied ? 'Copied!' : 'Copy code';
    },
  },
  methods: {
    play(): void {
      // A built-in board (official OR a fan board with its own bespoke class, e.g. Hollandia)
      // deep-links to its real BoardName for gameplay, regardless of its official/fanmade
      // library tag -- the tag is cosmetic labeling only. Only a genuine community submission
      // (an arbitrary CustomBoardDefinition with no matching real board) falls through to the
      // generic customBoardCode replay below.
      const boardName = boardNameForOfficialMapLibraryId(this.entry.id);
      if (boardName !== undefined) {
        window.location.href = `${paths.NEW_GAME}?board=${encodeURIComponent(boardName)}`;
        return;
      }
      // Reproduces MapEditor.vue's play() hand-off verbatim -- CreateGameForm.vue's
      // adoptCustomBoardFromEditor()/applyCustomBoardCode() already handle the rest.
      try {
        window.localStorage?.setItem('customBoardCode', this.entry.code);
      } catch (e) {
        // localStorage may be unavailable; fall through to the query param.
      }
      window.location.href = `${paths.NEW_GAME}?customBoard=1`;
    },
    // Every entry -- official, built-in fan board, or a genuine community submission alike --
    // opens the same way: there's no representation of a board other than its
    // CustomBoardDefinition code for the editor to load, so this is uniform regardless of origin
    // (unlike play(), which prefers a built-in board's real BoardName for actual gameplay).
    openInEditor(): void {
      try {
        window.localStorage?.setItem('mapEditorLoadCode', this.entry.code);
      } catch (e) {
        // localStorage may be unavailable; nothing more we can do here.
      }
      window.location.href = `${paths.MAP_EDITOR}?loadCode=1`;
    },
    async copyCode(): Promise<void> {
      try {
        await navigator.clipboard?.writeText(this.entry.code);
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, 1500);
      } catch (e) {
        // Clipboard access may be unavailable/denied; nothing more we can do here.
      }
    },
  },
});
</script>

<style scoped lang="less">
.map-card {
  display: flex;
  flex-direction: column;
  border: 1px solid #444;
  border-radius: 8px;
  overflow: hidden;
  background: #201d2b;
  color: #ddd;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}
.map-card-thumb {
  display: flex;
  justify-content: center;
  padding: 10px;
  background: #15131f;
}
.map-thumbnail--error {
  // width/height are set inline (MapLibraryRow.vue's thumbnailWidth/thumbnailHeight) so this
  // fallback box always matches the real MapThumbnail's size, in both grid and list layouts.
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: 11px;
  color: #999;
  background: #15131f;
  border-radius: 4px;
  flex: 0 0 auto;
  padding: 8px;
}
.map-card-body {
  flex: 1;
  min-width: 0;
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.map-card-title {
  font-weight: bold;
  font-size: 15px;
  color: #fff;
}
.map-card-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.map-library-tag {
  font-size: 10px;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 3px;
  background: #444;
  &--official { background: #2e7d32; }
  &--fanmade { background: #455a64; }
  &--submitted { background: #b8860b; }
  &--approved { background: #2e7d32; }
}
.map-card-description {
  margin: 0;
  font-size: 12px;
  color: #cfc9e6;
}
.map-card-submitter {
  margin: 0;
  font-size: 11px;
  color: #999;
}
.map-card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 6px;
}
</style>
