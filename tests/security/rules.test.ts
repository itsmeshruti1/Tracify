import { readFileSync } from 'node:fs';
import { after, before, test } from 'node:test';
import { initializeTestEnvironment, assertFails, assertSucceeds, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, collection, query, limit, getDocs, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';
import { createSampleIncidents } from '../../src/data/sampleData';

let env: RulesTestEnvironment;
const token = { email: 'alice@example.test', email_verified: true };
const record = { ...createSampleIncidents()[1], id: 'valid-record', sourceKind: 'community', source: 'Community submission',
  sourceUrl: '', license: '', occurredAt: Timestamp.fromMillis(Date.now() - 3600000) };
before(async () => { env = await initializeTestEnvironment({ projectId: 'demo-tracify',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  storage: { rules: readFileSync('storage.rules', 'utf8'), host: '127.0.0.1', port: 9199 },
}); });
after(async () => { await env?.cleanup(); });

test('anonymous and unverified accounts cannot write, list or read incidents', async () => {
  for (const context of [env.unauthenticatedContext(), env.authenticatedContext('alice', { email_verified: false })]) {
    const db = context.firestore();
    await assertFails(setDoc(doc(db, 'users/alice/incidents/valid-record'), record));
    await assertFails(getDoc(doc(db, 'users/alice/incidents/valid-record')));
    await assertFails(getDocs(query(collection(db, 'users/alice/incidents'), limit(2001))));
  }
});
test('verified owner can create, read and delete; another account cannot access the record', async () => {
  const db = env.authenticatedContext('alice', token).firestore();
  const own = doc(db, 'users/alice/incidents/valid-record');
  await assertSucceeds(setDoc(own, record));
  await assertSucceeds(getDoc(own));
  await assertSucceeds(getDocs(query(collection(db, 'users/alice/incidents'), limit(2001))));
  const other = env.authenticatedContext('bob', { email_verified: true }).firestore();
  await assertFails(getDoc(doc(other, 'users/alice/incidents/valid-record')));
  await assertFails(setDoc(doc(other, 'users/alice/incidents/bob-record'), { ...record, id: 'bob-record' }));
  await assertFails(deleteDoc(doc(other, 'users/alice/incidents/valid-record')));
  await assertFails(setDoc(own, { ...record, injuries: 8 }));
  await assertSucceeds(deleteDoc(own));
});
test('server rules reject malformed or spoofed data even if client validation is bypassed', async () => {
  const db = env.authenticatedContext('alice', token).firestore();
  for (const patch of [{ lat: 91 }, { fatalities: -1 }, { injuries: 2.5 }, { injuries: 101 }, { severity: 'FATAL', fatalities: 0 },
    { verification: 'verified' }, { sourceKind: 'synthetic' }, { role: 'admin' }, { source: 'Official police report' },
    { occurredAt: '2026-01-01T00:00:00Z' }, { occurredAt: Timestamp.fromMillis(Date.now() + 86400000) },
    { attachment: { name: 'bad', type: 'image/png', size: 1, path: 'evidence/bob/valid-record' } },
    { attachment: { name: 'bad', type: 'text/html', size: 1, path: 'evidence/alice/valid-record' } }]) {
    await assertFails(setDoc(doc(db, 'users/alice/incidents/valid-record'), { ...record, ...patch }));
  }
});
test('legacy user profiles, security alerts and unrestricted list queries are denied', async () => {
  const db = env.authenticatedContext('alice', token).firestore();
  await assertFails(setDoc(doc(db, 'users/alice'), { role: 'admin' }));
  await assertFails(getDocs(collection(db, 'users')));
  await assertFails(getDocs(collection(db, 'security_alerts')));
  await assertFails(getDocs(collection(db, 'users/alice/incidents')));
});
test('private evidence requires a verified owner, rejects active content, oversize and overwrite', async () => {
  const store = env.authenticatedContext('alice', token).storage();
  const path = 'evidence/alice/attachment-test';
  await assertSucceeds(uploadBytes(ref(store, path), new Uint8Array([1, 2, 3]), { contentType: 'image/png' }));
  await assertSucceeds(getBytes(ref(store, path)));
  await assertFails(uploadBytes(ref(store, path), new Uint8Array([1]), { contentType: 'image/png' }));
  await assertFails(getBytes(ref(env.authenticatedContext('bob', { email_verified: true }).storage(), path)));
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(), path)));
  await assertFails(uploadBytes(ref(env.authenticatedContext('bob', { email_verified: false }).storage(), 'evidence/bob/nope'), new Uint8Array([1]), { contentType: 'image/png' }));
  await assertFails(uploadBytes(ref(store, 'evidence/alice/html'), new Uint8Array([1]), { contentType: 'text/html' }));
  await assertFails(uploadBytes(ref(store, 'evidence/alice/oversize'), new Uint8Array(5242881), { contentType: 'image/png' }));
  await assertSucceeds(deleteObject(ref(store, path)));
});
