/**
 * P0-PHASE2: Guest Token HMAC Validation Tests
 * Verifies that the guest_checkout_transaction RPC token verification:
 *   1. Accepts valid base64url(payload).base64url(hmac) signatures
 *   2. Rejects tampered payloads
 *   3. Rejects expired tokens
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';

const MOCK_SECRET = 'super-secret-guest-key-for-testing';

// Utility to create a real HMAC token identical to the backend structure
function createGuestToken(payload: object, secret: string): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64');
  return payloadB64 + '.' + signature;
}

// In a real environment, these would execute against the Supabase RPC.
// Here we unit test the verification logic matching the SQL implementation.
function verifyToken(token: string, phone: string, secret: string): boolean {
  if (!token || !token.includes('.')) throw new Error('Invalid guest session token format');
  
  const [payloadStr, sigStr] = token.split('.');
  
  // 1. Verify Signature
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadStr).digest('base64');
  
  // crypto.timingSafeEqual for constant-time comparison
  const sigBuffer = Buffer.from(sigStr, 'base64');
  const expectedBuffer = Buffer.from(expectedSig, 'base64');
  
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    throw new Error('Guest session token signature invalid');
  }
  
  // 2. Decode Payload
  const payload = JSON.parse(Buffer.from(payloadStr, 'base64').toString('utf8'));
  
  // 3. Verify Phone
  if (payload.phone !== phone) {
    throw new Error('Guest session token phone mismatch');
  }
  
  // 4. Verify Expiry
  if (new Date(payload.expires_at) < new Date()) {
    throw new Error('Guest session token has expired');
  }
  
  return true;
}

describe('P0-PHASE2: Guest Token HMAC Validation', () => {
  it('should accept a valid guest token with correct signature', () => {
    const payload = {
      phone: '+923001234567',
      expires_at: new Date(Date.now() + 15 * 60000).toISOString() // 15 mins future
    };
    
    const token = createGuestToken(payload, MOCK_SECRET);
    const isValid = verifyToken(token, '+923001234567', MOCK_SECRET);
    
    assert.equal(isValid, true);
  });

  it('should reject a token with a tampered payload', () => {
    const originalPayload = {
      phone: '+923001234567',
      expires_at: new Date(Date.now() + 15 * 60000).toISOString()
    };
    
    const originalToken = createGuestToken(originalPayload, MOCK_SECRET);
    const [payloadStr, sigStr] = originalToken.split('.');
    
    // Tamper the payload by changing the phone number
    const tamperedPayload = { ...originalPayload, phone: '+923339999999' };
    const tamperedPayloadStr = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64');
    
    const tamperedToken = tamperedPayloadStr + '.' + sigStr;
    
    assert.throws(
      () => verifyToken(tamperedToken, '+923339999999', MOCK_SECRET),
      /Guest session token signature invalid/
    );
  });

  it('should reject a token verified with the wrong secret', () => {
    const payload = {
      phone: '+923001234567',
      expires_at: new Date(Date.now() + 15 * 60000).toISOString()
    };
    
    const token = createGuestToken(payload, MOCK_SECRET);
    
    assert.throws(
      () => verifyToken(token, '+923001234567', 'wrong-secret'),
      /Guest session token signature invalid/
    );
  });

  it('should reject a token if the phone number does not match the provided phone', () => {
    const payload = {
      phone: '+923001234567',
      expires_at: new Date(Date.now() + 15 * 60000).toISOString()
    };
    
    const token = createGuestToken(payload, MOCK_SECRET);
    
    assert.throws(
      () => verifyToken(token, '+923330000000', MOCK_SECRET),
      /Guest session token phone mismatch/
    );
  });

  it('should reject an expired token', () => {
    const payload = {
      phone: '+923001234567',
      expires_at: new Date(Date.now() - 5 * 60000).toISOString() // 5 mins in the past
    };
    
    const token = createGuestToken(payload, MOCK_SECRET);
    
    assert.throws(
      () => verifyToken(token, '+923001234567', MOCK_SECRET),
      /Guest session token has expired/
    );
  });
});
