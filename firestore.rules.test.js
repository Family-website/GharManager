// ============================================================
// GharManager Pro — Firestore Security Rules Tests
// Phase 8.1: runs against the Firebase emulator (no real project
// touched, no real data at risk).
//
// Setup (one-time):
//   npm install --save-dev @firebase/rules-unit-testing mocha
//
// Run:
//   firebase emulators:exec --only firestore "npx mocha firestore.rules.test.js"
//
// What this checks, in plain terms:
//   - You CAN read/write your own familyData document.
//   - You CANNOT read/write someone else's familyData document.
//   - A signed-out (anonymous) visitor can't read/write ANY
//     familyData document.
//   - Nobody can write to aiUsage directly from the client
//     (only the Cloud Function's Admin SDK should be able to).
//   - Random/unlisted collections are closed by default.
// ============================================================

const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const fs = require('fs');

const PROJECT_ID = 'gharmanager-rules-test';
let testEnv;

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });
});

after(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

describe('familyData/{uid} — owner-only access', () => {
  it('lets a signed-in user read their own document', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    await assertSucceeds(
      alice.firestore().collection('familyData').doc('alice-uid').get()
    );
  });

  it('lets a signed-in user write their own document', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    await assertSucceeds(
      alice.firestore().collection('familyData').doc('alice-uid').set({ expenses: [] })
    );
  });

  it('blocks a signed-in user from reading someone else\'s document', async () => {
    const bob = testEnv.authenticatedContext('bob-uid');
    await assertFails(
      bob.firestore().collection('familyData').doc('alice-uid').get()
    );
  });

  it('blocks a signed-in user from writing someone else\'s document', async () => {
    const bob = testEnv.authenticatedContext('bob-uid');
    await assertFails(
      bob.firestore().collection('familyData').doc('alice-uid').set({ expenses: [{ amount: 99999 }] })
    );
  });

  it('blocks a signed-out visitor from reading any document', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      anon.firestore().collection('familyData').doc('alice-uid').get()
    );
  });

  it('blocks a signed-out visitor from writing any document', async () => {
    const anon = testEnv.unauthenticatedContext();
    await assertFails(
      anon.firestore().collection('familyData').doc('alice-uid').set({ expenses: [] })
    );
  });
});

describe('aiUsage/{docId} — server-write-only rate limit counters', () => {
  it('lets a user read their own usage counter', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    await assertSucceeds(
      alice.firestore().collection('aiUsage').doc('alice-uid_2026-07-20').get()
    );
  });

  it('blocks a user from reading someone else\'s usage counter', async () => {
    const bob = testEnv.authenticatedContext('bob-uid');
    await assertFails(
      bob.firestore().collection('aiUsage').doc('alice-uid_2026-07-20').get()
    );
  });

  it('blocks ANY client write, even to their own counter (this is the whole point — only the Cloud Function\'s Admin SDK may write it)', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    await assertFails(
      alice.firestore().collection('aiUsage').doc('alice-uid_2026-07-20').set({ count: 0 })
    );
  });
});

describe('unlisted collections — default deny', () => {
  it('blocks reads on any collection not explicitly listed in the rules', async () => {
    const alice = testEnv.authenticatedContext('alice-uid');
    await assertFails(
      alice.firestore().collection('somethingNobodyThoughtOf').doc('x').get()
    );
  });
});
