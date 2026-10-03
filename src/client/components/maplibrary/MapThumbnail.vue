<template>
  <div class="map-thumbnail" :style="{width: width + 'px', height: height + 'px'}">
    <div class="map-thumbnail-inner" :style="innerStyle">
      <div
        v-for="space in spaces"
        :key="space.id"
        class="map-thumbnail-hex"
        :class="hexClass(space)"
        :style="hexStyle(space)"
      >
        <span class="map-thumbnail-hex-bonuses" v-if="space.bonus.length">
          <i
            v-for="(b, i) in space.bonus"
            :key="i"
            class="map-thumbnail-hex-bonus"
            :class="'board-space-bonus--' + spaceBonusCss(b)"
          ></i>
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import {defineComponent, PropType} from 'vue';
import {CustomBoardDefinition, CustomSpaceDef, customSpacePixel, hexRowLayout} from '@/common/boards/CustomBoardDefinition';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {SpaceType} from '@/common/boards/SpaceType';
import {spaceBonusCss} from '@/client/utils/spaceBonusIcon';

// Cheap, non-interactive preview reusing MapEditor.vue's own hex-grid math, the real board
// sprites (board.less), and its Mars-backdrop technique (a full <Board> is too heavy to mount
// once per row in a list). The whole grid -- hexes, bonus icons, and backdrop alike -- is built
// at natural (1:1) pixel size, then shrunk to fit the thumbnail box with a single CSS
// `transform: scale()`, so everything scales down together.
// Same painted-diamond mapping MapEditor.vue's gridStyle uses: the region of
// mars-without-venus.png (620x600) that lines up with the standard hex bounding box.
const MARS_IMAGE = {left: 99, top: 119, width: 438, height: 379, naturalWidth: 620, naturalHeight: 600};

export default defineComponent({
  name: 'MapThumbnail',
  props: {
    definition: {type: Object as PropType<CustomBoardDefinition>, required: true},
    // Rendered box size in pixels; the hex grid + backdrop scale down to fit it.
    width: {type: Number, default: 160},
    height: {type: Number, default: 130},
  },
  computed: {
    spaces(): Array<CustomSpaceDef> {
      return this.definition.spaces;
    },
    maxY(): number {
      return Math.max(this.definition.rows - 1, 0);
    },
    // The full bounding hexagon (including void cells), matching how MapEditor.vue frames and
    // backdrops its own grid -- carved-out voids shouldn't shift the Mars backdrop's alignment.
    bounds(): {minLeft: number, minTop: number, maxLeft: number, maxTop: number} {
      let minLeft = Infinity;
      let minTop = Infinity;
      let maxLeft = -Infinity;
      let maxTop = -Infinity;
      for (const row of hexRowLayout(this.definition.rows)) {
        for (let i = 0; i < row.width; i++) {
          const p = customSpacePixel(row.xOffset + i, row.y, this.maxY);
          minLeft = Math.min(minLeft, p.left);
          minTop = Math.min(minTop, p.top);
          maxLeft = Math.max(maxLeft, p.left);
          maxTop = Math.max(maxTop, p.top);
        }
      }
      return {minLeft, minTop, maxLeft, maxTop};
    },
    // Scale/position of the full (unpadded) Mars image against the *tight* hex diamond -- the
    // same alignment MapEditor.vue's gridStyle uses with no margin at all. Shared by margins()
    // and backdropStyle() so "how big is the full image at this board's scale" only lives once.
    imagePlacement(): {sx: number, sy: number, bgXTight: number, bgYTight: number, fullWidth: number, fullHeight: number} {
      const {minLeft, minTop, maxLeft, maxTop} = this.bounds;
      const sx = ((maxLeft - minLeft) + 46) / MARS_IMAGE.width;
      const sy = ((maxTop - minTop) + 51) / MARS_IMAGE.height;
      return {
        sx,
        sy,
        bgXTight: minLeft - MARS_IMAGE.left * sx,
        bgYTight: minTop - MARS_IMAGE.top * sy,
        fullWidth: MARS_IMAGE.naturalWidth * sx,
        fullHeight: MARS_IMAGE.naturalHeight * sy,
      };
    },
    // How far the full Mars image (heat/oxygen/temperature tracks and all) extends beyond the
    // tight hex diamond on each side -- computed exactly from the image's own geometry rather
    // than a guessed pixel constant, so the thumbnail always shows the whole board: nothing
    // cropped, and no margin wasted on blank space past the image's real edge. The scale-to-fit
    // transform below (see `scale`) then shrinks that whole box uniformly to fit the thumbnail.
    margins(): {left: number, top: number, right: number, bottom: number} {
      const {bgXTight, bgYTight, fullWidth, fullHeight} = this.imagePlacement;
      const {maxLeft, maxTop} = this.bounds;
      return {
        left: Math.max(0, -bgXTight),
        top: Math.max(0, -bgYTight),
        right: Math.max(0, (bgXTight + fullWidth) - (maxLeft + 90)),
        bottom: Math.max(0, (bgYTight + fullHeight) - (maxTop + 90)),
      };
    },
    naturalSize(): {width: number, height: number} {
      return {
        width: this.bounds.maxLeft + 90 + this.margins.left + this.margins.right,
        height: this.bounds.maxTop + 90 + this.margins.top + this.margins.bottom,
      };
    },
    scale(): number {
      if (this.naturalSize.width === 0 || this.naturalSize.height === 0) {
        return 1;
      }
      return Math.min(this.width / this.naturalSize.width, this.height / this.naturalSize.height);
    },
    backdropStyle(): Record<string, string> {
      const {sx, sy, bgXTight, bgYTight} = this.imagePlacement;
      const bgX = (bgXTight + this.margins.left).toFixed(1);
      const bgY = (bgYTight + this.margins.top).toFixed(1);
      return {
        background:
          'linear-gradient(rgba(21, 19, 31, 0.45), rgba(21, 19, 31, 0.45)) local, ' +
          `url("/assets/board/mars-without-venus.png") local no-repeat ${bgX}px ${bgY}px / ${(MARS_IMAGE.naturalWidth * sx).toFixed(1)}px ${(MARS_IMAGE.naturalHeight * sy).toFixed(1)}px, ` +
          '#15131f',
      };
    },
    innerStyle(): Record<string, string> {
      return {
        width: `${this.naturalSize.width}px`,
        height: `${this.naturalSize.height}px`,
        transform: `scale(${this.scale})`,
        ...this.backdropStyle,
      };
    },
  },
  methods: {
    spaceBonusCss(bonus: SpaceBonus): string {
      return spaceBonusCss(bonus);
    },
    hexStyle(space: CustomSpaceDef): Record<string, string> {
      const p = customSpacePixel(space.x, space.y, this.maxY);
      return {left: `${p.left + this.margins.left}px`, top: `${p.top + this.margins.top}px`};
    },
    hexClass(space: CustomSpaceDef): Record<string, boolean> {
      const isCove = space.spaceType === SpaceType.COVE;
      const volcanicLand = space.volcanic === true && !isCove && space.spaceType !== SpaceType.OCEAN;
      return {
        'board-space-type-ocean': space.spaceType === SpaceType.OCEAN && space.volcanic !== true,
        'board-space-type-volcanic-cove': isCove && space.volcanic === true,
        'board-space-type-cove': isCove && space.volcanic !== true,
        'board-space-type-deflection-zone': space.spaceType === SpaceType.DEFLECTION_ZONE,
        'board-space-type-land': (space.spaceType === SpaceType.LAND && space.volcanic !== true) || volcanicLand,
        'board-space-type-land-volcanic': volcanicLand,
        'map-thumbnail-hex--restricted': space.spaceType === SpaceType.RESTRICTED,
        'map-thumbnail-hex--reserved': space.reserved === true,
      };
    },
  },
});
</script>

<style scoped lang="less">
.map-thumbnail {
  overflow: hidden;
  position: relative;
  background: #15131f;
  border-radius: 4px;
  flex: 0 0 auto;
  // The scaled hex diamond rarely matches the box's own aspect ratio exactly -- center it so
  // the leftover space lands evenly on every side instead of piling up at the right/bottom
  // edge (flexbox centers the *unscaled* layout box, so .map-thumbnail-inner's transform-origin
  // below must stay at its center for the shrink to happen around that already-centered point).
  display: flex;
  align-items: center;
  justify-content: center;
}
.map-thumbnail-inner {
  position: relative;
  transform-origin: center;
}
.map-thumbnail-hex {
  position: absolute;
  width: 46px;
  height: 51px;
  background-repeat: no-repeat;
  background-size: 46px 51px;
  clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%);

  &--restricted { background-color: rgba(70, 70, 78, 0.85); }
  &--reserved { background-color: rgba(241, 196, 15, 0.55); }
}
.map-thumbnail-hex-bonuses {
  display: flex;
  flex-wrap: wrap;
  place-content: center;
  align-items: center;
  gap: 1px;
  width: 100%;
  height: 100%;
}
.map-thumbnail-hex-bonus {
  display: inline-block;
  width: 13px;
  height: 13px;
  background-repeat: no-repeat !important;
  background-position: center !important;
  background-size: contain !important;

  // The multi-layer/custom-sized bonus icons (Hellas's ocean tile + cost-badge combo, the
  // temperature bonuses, colony) break under the uniform small-icon rules above: a single
  // `background-size`/`background-position` value applies to *every* layer, so ocean's two
  // stacked images both collapse onto the same centered/contain-fit spot, overlapping into a
  // garbled blob instead of tile-icon-plus-cost-badge side by side. They already fit
  // comfortably within the 46x51 native hex on their own, so render them at their real
  // board.less size instead of forcing the 13x13 box (see board.less for these exact values).
  &.board-space-bonus--bonusocean {
    width: 35px !important;
    height: 24px !important;
    background-position: left, 23px !important;
    background-size: 21px, 12px !important;
  }
  &.board-space-bonus--bonustemperature,
  &.board-space-bonus--bonustemperature4mc,
  &.board-space-bonus--colony {
    width: 36px !important;
    height: 21px !important;
    background-position: center !important;
    background-size: 32px 21px !important;
  }
}
</style>
