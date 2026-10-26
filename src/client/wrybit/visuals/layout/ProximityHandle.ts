// v-proximity-handle on a drag handle: fades it in as the mouse approaches (handleProximity.ts)
import {Directive} from 'vue';
import {trackHandleProximity, untrackHandleProximity} from '@/client/wrybit/visuals/layout/handleProximity';

export const vProximityHandle: Directive<HTMLElement> = {
  mounted(element) {
    trackHandleProximity(element);
  },
  unmounted(element) {
    untrackHandleProximity(element);
  },
};
