import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalStore } from '../src/lib/localStore';
import { createSampleIncidents } from '../src/data/sampleData';

test('local reports and media survive reconnection, failed duplicate batches are atomic', async () => {
  const name = `test-${crypto.randomUUID()}`; const store = new LocalStore(name);
  await store.initialize(); const initial = await store.list();
  assert.equal(initial.length, createSampleIncidents().length);
  const report = { ...initial[0], id: 'community-test' };
  await store.save([report], new Blob(['persistent evidence'], { type: 'image/png' }));
  await store.close(); const reopened = new LocalStore(name);
  await reopened.initialize(); assert.equal((await reopened.list()).length, initial.length + 1);
  assert.equal(await (await reopened.attachment(report.id))!.text(), 'persistent evidence');
  await assert.rejects(() => reopened.save([{ ...report, id: 'should-rollback' }, report]));
  assert.ok(!(await reopened.list()).some(p => p.id === 'should-rollback'));
  await assert.rejects(() => reopened.save(Array.from({ length: 2000 }, (_, i) => ({ ...report, id: `capacity-${i}` }))), /Workspace limit/);
  assert.equal((await reopened.list()).length, initial.length + 1);
  await reopened.remove(report.id); assert.equal(await reopened.attachment(report.id), null);
  // Removing a sample must not cause initialization to repopulate it.
  await reopened.remove(initial[0].id); await reopened.initialize();
  assert.ok(!(await reopened.list()).some(p => p.id === initial[0].id));
  await reopened.close(); indexedDB.deleteDatabase(name);
});
