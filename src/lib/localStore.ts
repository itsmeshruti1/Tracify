import { createSampleIncidents } from '../data/sampleData';
import type { Incident } from '../types/incident';
import { MAX_RECORDS } from './analytics';

export class LocalStore {
  private connection?: Promise<IDBDatabase>;
  // Keep the original database key so the Tracify rename preserves saved reports and media.
  constructor(private name = 'accidentsense-v2') {}
  private open() {
    return this.connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(this.name, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('incidents', { keyPath: 'record.id' });
        request.result.createObjectStore('meta');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Browser storage could not open. Enable site storage and retry.'));
      request.onblocked = () => reject(new Error('Close other Tracify tabs and retry.'));
    });
  }
  async initialize() {
    const database = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction(['incidents', 'meta'], 'readwrite');
      const request = tx.objectStore('meta').get('initialized');
      request.onsuccess = () => {
        if (!request.result) {
          createSampleIncidents().forEach(record => tx.objectStore('incidents').add({ record, attachment: null }));
          tx.objectStore('meta').put(true, 'initialized');
        }
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error('Could not initialize browser storage.'));
    });
  }
  async list(): Promise<Incident[]> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction('incidents').objectStore('incidents').getAll();
      request.onsuccess = () => resolve(request.result.map(entry => entry.record));
      request.onerror = () => reject(new Error('Could not read saved reports.'));
    });
  }
  async save(records: Incident[], attachment?: Blob) {
    const database = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction('incidents', 'readwrite');
      let reason = 'Save failed: duplicate ID or browser storage full. Nothing in this batch was saved.';
      const count = tx.objectStore('incidents').count();
      count.onsuccess = () => {
        if (count.result + records.length > MAX_RECORDS) {
          reason = `Workspace limit: ${MAX_RECORDS} incidents. Nothing in this batch was saved.`; tx.abort(); return;
        }
        records.forEach((record, i) => tx.objectStore('incidents').add({ record, attachment: i === 0 ? attachment ?? null : null }));
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error(reason));
    });
  }
  async attachment(id: string): Promise<Blob | null> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const request = database.transaction('incidents').objectStore('incidents').get(id);
      request.onsuccess = () => resolve(request.result?.attachment ?? null);
      request.onerror = () => reject(new Error('Attachment could not be loaded.'));
    });
  }
  async remove(id: string) {
    const database = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = database.transaction('incidents', 'readwrite');
      tx.objectStore('incidents').delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error('Could not delete report.'));
    });
  }
  async close() { (await this.connection)?.close(); this.connection = undefined; }
}
export const localStore = new LocalStore();
