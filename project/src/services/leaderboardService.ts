import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { LEADERBOARD_LIMIT } from '@/lib/constants';
import type { LeaderboardEntry } from '@/lib/types';
import { asNumber, asString } from '@/services/converters';

export async function listTopEntries(testId: string): Promise<LeaderboardEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'leaderboards', testId, 'entries'), orderBy('score', 'desc'), limit(LEADERBOARD_LIMIT)),
  );
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: asString(data.name, 'Student'),
      photoURL: typeof data.photoURL === 'string' ? data.photoURL : null,
      score: asNumber(data.score),
      accuracy: asNumber(data.accuracy),
      timeTaken: asNumber(data.timeTaken),
    };
  });
}

// Ties share a rank. The count query reads index entries only, not the documents.
export async function getRankForScore(testId: string, score: number): Promise<number> {
  const higher = await getCountFromServer(
    query(collection(db, 'leaderboards', testId, 'entries'), where('score', '>', score)),
  );
  return higher.data().count + 1;
}
