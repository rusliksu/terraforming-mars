import {globalConfig as baseGlobalConfig} from '../getLocalVue';

// Keep the owner's local transport real; individual filter boundaries can remain shallow.
export const creationTransport = {InputPortal: false, PresentationHost: false, Teleport: false};
export const globalConfig = {...baseGlobalConfig, global: {...baseGlobalConfig.global, stubs: creationTransport}};
