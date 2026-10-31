import { writeBatch, type DocumentReference } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const MAX_OPERATIONS_PER_BATCH = 500;

export async function deleteDocsInBatches(refs: DocumentReference[]) {
  for (let i = 0; i < refs.length; i += MAX_OPERATIONS_PER_BATCH) {
    const batch = writeBatch(db);
    for (const ref of refs.slice(i, i + MAX_OPERATIONS_PER_BATCH)) {
      batch.delete(ref);
    }
    await batch.commit();
  }
}
