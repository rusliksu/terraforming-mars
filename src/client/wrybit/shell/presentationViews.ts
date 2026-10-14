import type {Component} from 'vue';

/** Optional presentation components; routing and actions stay in App. */
export type WrybitViews = Partial<Record<'cards', Component>>;
