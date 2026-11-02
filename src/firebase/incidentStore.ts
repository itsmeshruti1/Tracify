import { collection, doc, onSnapshot, query, limit, writeBatch, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { db, storage } from './config';
import type { Incident } from '../types/incident';
import { validateIncident, validateAttachment } from '../lib/validation';
import { MAX_RECORDS } from '../lib/analytics';

const incidentCollection = (uid: string) => {
  if (!db) throw new Error('Firebase is not configured.');
  return collection(db, 'users', uid, 'incidents');
};
export function subscribeIncidents(uid: string, next: (records: Incident[]) => void, error: (message: string) => void) {
  return onSnapshot(query(incidentCollection(uid), limit(MAX_RECORDS + 1)), snapshot => {
    if (snapshot.size > MAX_RECORDS) { error('Cloud workspace exceeds 2,000 records. Use a server-side analysis pipeline.'); return; }
    try {
      const records = snapshot.docs.map(document => {
        const data = document.data();
        const validated = validateIncident({ ...data, occurredAt: (data.occurredAt as Timestamp).toDate().toISOString() }, data.sourceKind);
        if (data.attachment) validated.attachment = data.attachment;
        return validated;
      });
      next(records);
    } catch { error('Cloud data contains an invalid record. Correct it using the Firebase console before continuing.'); }
  }, err => error(`Cloud connection failed: ${err.message}`));
}
export async function saveCloud(uid: string, records: Incident[], attachment?: File) {
  if (!db || !storage) throw new Error('Firebase is not configured.');
  // A single Firestore batch keeps each import atomic. Evidence stays private in Storage.
  if (records.length > 400) throw new Error('Import at most 400 records per cloud batch.');
  let uploadedPath: string | null = null;
  try {
    if (attachment) {
      validateAttachment(attachment);
      uploadedPath = `evidence/${uid}/${records[0].id}`;
      await uploadBytes(ref(storage, uploadedPath), attachment, { contentType: attachment.type });
      records = records.map((p, i) => i ? p : { ...p, attachment: {
        name: attachment.name.slice(0, 160), type: attachment.type, size: attachment.size, path: uploadedPath!,
      } });
    }
    const batch = writeBatch(db);
    records.forEach(p => batch.set(doc(incidentCollection(uid), p.id), { ...p, occurredAt: Timestamp.fromDate(new Date(p.occurredAt)) }));
    await batch.commit();
  } catch (error) {
    if (uploadedPath) await deleteObject(ref(storage, uploadedPath)).catch(() => undefined);
    throw error;
  }
}
export async function cloudAttachment(incident: Incident) {
  if (!storage || !incident.attachment) return null;
  return getBlob(ref(storage, incident.attachment.path), 5 * 1024 * 1024);
}
export async function removeCloud(uid: string, incident: Incident) {
  // Remove evidence first; if it fails, retain the report so cleanup can be retried.
  if (storage && incident.attachment) {
    await deleteObject(ref(storage, incident.attachment.path)).catch(error => {
      if (error.code !== 'storage/object-not-found') throw error;
    });
  }
  await deleteDoc(doc(incidentCollection(uid), incident.id));
}
