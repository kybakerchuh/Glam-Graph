// Adversarial Firestore Security Rules Test Cases (Dirty Dozen Specification)
// Verifies that every invalid/malicious operation is rejected with PERMISSION_DENIED.

export interface RulesTestCase {
  id: number;
  name: string;
  actorUid: string | null;
  emailVerified: boolean;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expected: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: RulesTestCase[] = [
  {
    id: 1,
    name: 'Unauthenticated user profile create',
    actorUid: null,
    emailVerified: false,
    operation: 'create',
    path: 'users/studentA',
    payload: { ownerId: 'studentA' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Unverified email user write',
    actorUid: 'studentA',
    emailVerified: false,
    operation: 'create',
    path: 'users/studentA',
    payload: { ownerId: 'studentA', displayName: 'Student A' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Cross-user profile read',
    actorUid: 'studentB',
    emailVerified: true,
    operation: 'get',
    path: 'users/studentA',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Users collection list enumeration',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'list',
    path: 'users',
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'OwnerId spoofing on SavedFigure create',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'create',
    path: 'users/studentA/figures/look_1',
    payload: { ownerId: 'studentB', title: 'Spoof Look', modelId: 'maya' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Ghost field injection on UserProgress create',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'create',
    path: 'users/studentA',
    payload: {
      ownerId: 'studentA',
      displayName: 'Maya',
      glamStars: 0,
      totalQuestionsSolved: 0,
      streak: 0,
      solvedIds: [],
      unlockedShades: [],
      unlockedTools: [],
      isAdmin: true,
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Orphaned SavedFigure without parent user doc',
    actorUid: 'studentNoDoc',
    emailVerified: true,
    operation: 'create',
    path: 'users/studentNoDoc/figures/look_1',
    payload: { ownerId: 'studentNoDoc', title: 'Orphan', modelId: 'chloe' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Invalid document ID characters',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'create',
    path: 'users/studentA/figures/bad..id$99',
    payload: { ownerId: 'studentA', title: 'Bad ID', modelId: 'maya' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-forged createdAt timestamp on update',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'update',
    path: 'users/studentA',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Immutable ownerId mutation on SavedFigure update',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'update',
    path: 'users/studentA/figures/look_1',
    payload: { ownerId: 'studentB' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Negative glamStars or oversized solvedIds array',
    actorUid: 'studentA',
    emailVerified: true,
    operation: 'update',
    path: 'users/studentA',
    payload: { glamStars: -50 },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Cross-user figures list query',
    actorUid: 'studentB',
    emailVerified: true,
    operation: 'list',
    path: 'users/studentA/figures',
    expected: 'PERMISSION_DENIED',
  },
];
