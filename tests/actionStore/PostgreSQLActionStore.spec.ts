import {PostgreSQLActionStore} from '../../src/server/actionStore/PostgreSQLActionStore';
import {describeActionStoreSuite} from './actionStoreSuite';

const testUrl = process.env.ACTION_STORE_POSTGRES_TEST_URL;

if (testUrl === undefined || testUrl === '') {
  // The durable PostgreSQL adapter is exercised through the same contract, but
  // only against an explicitly provided disposable database. Without it the
  // test is skipped, never faked as a pass.
  describe('PostgreSQLActionStore', () => {
    it.skip('requires ACTION_STORE_POSTGRES_TEST_URL to run the PostgreSQL contract', () => {
      // Set ACTION_STORE_POSTGRES_TEST_URL to a disposable PostgreSQL database to run it.
    });
  });
} else {
  describeActionStoreSuite({
    name: 'PostgreSQLActionStore',
    createStore: () => new PostgreSQLActionStore({connectionString: testUrl}),
  });
}
