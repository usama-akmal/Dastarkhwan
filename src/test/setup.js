/**
 * Test setup: give Dexie an IndexedDB implementation and reset it between files.
 *
 * `fake-indexeddb/auto` installs `indexedDB`, `IDBKeyRange` and friends onto
 * globalThis, which is everything `Dexie` needs to run outside a browser.
 */
import 'fake-indexeddb/auto';
