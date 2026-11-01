import {disableAutoUnmount, enableAutoUnmount} from '@vue/test-utils';
import {resetViewportForTest} from '@/client/utils/viewport';

// The suite runs with `isolate: false`, so the jsdom environment outlives each
// spec file. Unmounting every wrapper stops one spec's teardown from leaking
// timers, listeners or detached nodes into the next.
//
// This file re-runs per spec file, but test-utils keeps `isEnabled` in module
// state that the shared environment preserves, so enabling twice throws without
// the reset.
disableAutoUnmount();
enableAutoUnmount(afterEach);

// The viewport meta tag is page state shared by every spec in the worker: an
// owner left registered by one spec would change the layout the next one sees.
beforeEach(() => resetViewportForTest());
