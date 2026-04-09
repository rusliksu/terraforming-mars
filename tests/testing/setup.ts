import {globalInitialize} from '../../src/server/globalInitialize';
import './testEnvironment';

declare global {
  // eslint-disable-next-line no-var
  var __TM_TEST_GLOBAL_INITIALIZED__: boolean | undefined;
}

if (globalThis.__TM_TEST_GLOBAL_INITIALIZED__ !== true) {
  globalInitialize();
  globalThis.__TM_TEST_GLOBAL_INITIALIZED__ = true;
}
