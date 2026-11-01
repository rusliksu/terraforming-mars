import {onBeforeUnmount, onMounted} from 'vue';
import {mobileLandscape, mobileLayout} from '@/client/wrybit/visuals/common/mobileLayout';
import {releaseDeviceViewport, requestDeviceViewport} from '@/client/utils/viewport';
import {observeMobileFit} from './mobileFit';

const QUERIES = ['(pointer: coarse)', '(max-width: 1399px)', '(min-width: 900px) and (orientation: landscape)'];
const VIEWPORT_OWNER = 'wrybit-shell';

/** Source breakpoints, owned by the optional shell rather than application startup. */
export function useMobileViewport(): void {
  let stop: (() => void) | undefined;
  onMounted(() => {
    const media = QUERIES.map((query) => window.matchMedia?.(query));
    const hadClass = document.documentElement.classList.contains('tm-mobile');
    let stopFit: (() => void) | undefined;
    const update = () => {
      const override = new URL(window.location.href).searchParams.get('mobile');
      const active = override === 'on' || (override !== 'off' && (media[0]?.matches === true || media[1]?.matches === true));
      mobileLayout.value = active;
      mobileLandscape.value = media[2]?.matches === true;
      document.documentElement.classList.toggle('tm-mobile', active || hadClass);
      if (active) {
        requestDeviceViewport(VIEWPORT_OWNER);
      } else {
        // Releasing here hands the classic viewport back instead of leaving the tag
        // at the device width for whatever renders next.
        releaseDeviceViewport(VIEWPORT_OWNER);
      }
      if (active && stopFit === undefined) {
        stopFit = observeMobileFit(document.body);
      } else if (!active) {
        stopFit?.();
        stopFit = undefined;
      }
    };
    media.forEach((query) => query?.addEventListener('change', update));
    window.addEventListener('resize', update);
    update();
    stop = () => {
      stopFit?.();
      media.forEach((query) => query?.removeEventListener('change', update));
      window.removeEventListener('resize', update);
      mobileLayout.value = false;
      mobileLandscape.value = false;
      document.documentElement.classList.toggle('tm-mobile', hadClass);
      releaseDeviceViewport(VIEWPORT_OWNER);
    };
  });
  onBeforeUnmount(() => stop?.());
}
