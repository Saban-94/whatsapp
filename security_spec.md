# Security Specification: WhatsApp Web Premium

## 1. Data Invariants
- **Authentication**: All writes (create, update, delete) to any collection must be fully authenticated and verify that the user's email is verified (`request.auth.token.email_verified == true`).
- **JoniUser Ownership**: A user document at `/joni_users/{userId}` can only be read, created, or written by that specific user (i.e. `{userId}` must equal `request.auth.uid`).
- **JoniOutbox Creation**: Messages added to `/joni_outbox/{msgId}` must match the sender's identity and have valid structures. Incoming fields must be type-validated with safe limits to guard against Denial of Wallet (DoW) exploits.
- **Outbox Immutability**: Outbox messages are strictly write-once (create); they cannot be modified or deleted via client SDKs to ensure auditability and prevent queue corruption.

---

## 2. The "Dirty Dozen" Payloads
The following payloads are designed to attack Identity, Integrity, State, and Resources. All these must return `PERMISSION_DENIED`:

### JoniUser Attacks

#### 1. Unauthenticated Profile Creation (Anonymous/No-Auth)
- **Attack**: Non-signed-in attacker attempts to claim user profile.
- **Payload**: `setDoc(/joni_users/hsaban2025, { name: "Attacker", status: "Greedy" })` with `request.auth = null`.

#### 2. Identity Spoofing (Write to another user's space)
- **Attack**: Authenticated user `attacker_uid` attempts to overwrite profile of `hsaban2025`.
- **Payload**: `setDoc(/joni_users/hsaban2025, { name: "Attacker", status: "Compromised" })` with `request.auth.uid = "attacker_uid"`.

#### 3. Unverified User Write (Verified Email Bypass)
- **Attack**: Authenticated but unverified user try to create profile.
- **Payload**: `setDoc(/joni_users/hsaban2025, { name: "Unverified User" })` with `request.auth.token.email_verified = false`.

#### 4. Privilege Escalation / Field Injection (Ghost Fields)
- **Attack**: Attempt to inject unapproved structural properties / administrator fields.
- **Payload**: `setDoc(/joni_users/hsaban2025, { name: "User", isAdmin: true, extraRole: "Owner" })` (which is disallowed by schema keys).

#### 5. Resource Poisoning (Giant Over-sized String)
- **Attack**: Attempt to exceed storage limitations.
- **Payload**: `setDoc(/joni_users/hsaban2025, { name: "X" * 10000 })` (violates `.size() <= 128` on string checks).

### JoniOutbox Attacks

#### 6. Unauthenticated Outbox Publish
- **Attack**: Sending messages without authentication.
- **Payload**: `setDoc(/joni_outbox/msg_001, { phoneNumber: "+972500000000", text: "Spam" })` with `request.auth = null`.

#### 7. Invalid Target Phone Number Structure
- **Attack**: Inject invalid characters into the phone number.
- **Payload**: `setDoc(/joni_outbox/msg_002, { phoneNumber: "CALL_ME_NOW_999", text: "valid text", mediaType: "text", timestamp: "2026-05-28T15:29:09Z", source: "Saban AI Drive PWA", status: "pending_joni" })`.

#### 8. Queue Modification Violation
- **Attack**: Attempt to change a queued message.
- **Payload**: `updateDoc(/joni_outbox/msg_002, { status: "processed" })` by client SDK. (Must be completely blocked as outbox is write-only / immutable).

#### 9. Queue Delete Attack
- **Attack**: Client attempts to clear outbox records.
- **Payload**: `deleteDoc(/joni_outbox/msg_002)`. (Blocked as outbox is write-only).

#### 10. Temporal Spoofing (Injecting Client Timestamp)
- **Attack**: Attacker sets creation date in the past or future to mismatch server time.
- **Payload**: `setDoc(/joni_outbox/msg_003, { phoneNumber: "+972501234567", text: "Hello", mediaType: "text", timestamp: "1999-01-01T00:00:00Z", source: "PWA", status: "pending_joni" })` where timestamp != server timestamp / request.time.

#### 11. Blank Message Bombing
- **Attack**: Sending empty message bodies.
- **Payload**: `setDoc(/joni_outbox/msg_004, { phoneNumber: "+972501234567", text: "", mediaType: "text", timestamp: request.time })`.

#### 12. Missing Required Fields (Schema Underflow)
- **Attack**: Evade processing parameters to cause WhatsApp script crash.
- **Payload**: `setDoc(/joni_outbox/msg_005, { phoneNumber: "+972501234567", text: "Hello" })` (missing `source`, `status`, `timestamp`).

---

## 3. The Test Runner: firestore.rules.test.ts
```typescript
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'saban-ai-drive',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8')
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('WhatsApp Web Premium Rules Security Spec', () => {
  it('Unauthenticated Profile Creation (Payload 1) - EXPECT DENIAL', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauthedDb, 'joni_users/hsaban2025'), {
      name: 'Attacker',
      status: 'Greedy'
    }));
  });

  it('Identity Spoofing (Payload 2) - EXPECT DENIAL', async () => {
    const maliciousDb = testEnv.authenticatedContext('attacker_uid', { email_verified: true }).firestore();
    await assertFails(setDoc(doc(maliciousDb, 'joni_users/hsaban2025'), {
      name: 'Attacker',
      status: 'Compromised'
    }));
  });

  it('Unverified User Write (Payload 3) - EXPECT DENIAL', async () => {
    const unverifiedDb = testEnv.authenticatedContext('hsaban2025', { email_verified: false }).firestore();
    await assertFails(setDoc(doc(unverifiedDb, 'joni_users/hsaban2025'), {
      name: 'Unverified User',
      status: 'Awaiting Verification'
    }));
  });

  it('Privilege Escalation (Payload 4) - EXPECT DENIAL', async () => {
    const verifiedDb = testEnv.authenticatedContext('hsaban2025', { email_verified: true }).firestore();
    await assertFails(setDoc(doc(verifiedDb, 'joni_users/hsaban2025'), {
      name: 'User',
      isAdmin: true,
      extraRole: 'Owner'
    }));
  });

  it('Resource Poisoning (Payload 5) - EXPECT DENIAL', async () => {
    const verifiedDb = testEnv.authenticatedContext('hsaban2025', { email_verified: true }).firestore();
    await assertFails(setDoc(doc(verifiedDb, 'joni_users/hsaban2025'), {
      name: 'A'.repeat(500),
      status: 'Spammer'
    }));
  });

  it('Unauthenticated Outbox Publish (Payload 6) - EXPECT DENIAL', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(setDoc(doc(unauthedDb, 'joni_outbox/msg_001'), {
      phoneNumber: '+972500000000',
      text: 'Spam'
    }));
  });

  it('Invalid Target Phone Structure (Payload 7) - EXPECT DENIAL', async () => {
    const verifiedDb = testEnv.authenticatedContext('hsaban2025', { email_verified: true }).firestore();
    await assertFails(setDoc(doc(verifiedDb, 'joni_outbox/msg_002'), {
      phoneNumber: 'CALL_ME_NOW_999',
      text: 'valid text',
      mediaType: 'text',
      timestamp: new Date().toISOString(),
      source: 'Saban AI Drive PWA',
      status: 'pending_joni'
    }));
  });

  it('Queue Modification Violation (Payload 8) - EXPECT DENIAL', async () => {
    const verifiedDb = testEnv.authenticatedContext('hsaban2025', { email_verified: true }).firestore();
    await assertFails(updateDoc(doc(verifiedDb, 'joni_outbox/msg_002'), {
      status: 'processed'
    }));
  });

  it('Queue Delete Attack (Payload 9) - EXPECT DENIAL', async () => {
    const verifiedDb = testEnv.authenticatedContext('hsaban2025', { email_verified: true }).firestore();
    await assertFails(deleteDoc(doc(verifiedDb, 'joni_outbox/msg_002')));
  });
});
```
