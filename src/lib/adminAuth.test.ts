import { authAdminReducer, AuthAdminState, AdminCheck } from './adminAuth';

/**
 * Automated self-checking test suite for the Admin Check contract.
 * Run in pure TypeScript/JavaScript to mathematically verify state invariants:
 * 1. An error NEVER signs out a user (shouldSignOut === false).
 * 2. An error NEVER becomes a "not_admin" decision (adminCheck.kind is 'error', not 'not_admin').
 * 3. A confirmed "not_admin" ALWAYS triggers sign-out (shouldSignOut === true, user becomes null).
 * 4. A confirmed "admin" sets isAdmin to true without sign-out.
 */
export function runAdminAuthTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      results.push(`PASS: ${testName}`);
    } else {
      results.push(`FAIL: ${testName}`);
      allPassed = false;
    }
  }

  const mockUser = { id: 'test-user-123', email: 'admin@giriraj.in' };

  // Initial clean state
  const initialState: AuthAdminState<typeof mockUser> = {
    user: mockUser,
    isAdmin: false,
    adminCheck: null,
    verificationError: null,
    isVerifying: true,
  };

  // TEST 1: Network / Supabase error preserves user and DOES NOT sign out
  {
    const errorCheck: AdminCheck = { kind: 'error', message: 'connection timeout' };
    const { nextState, shouldSignOut } = authAdminReducer(initialState, {
      type: 'CHECK_RESOLVED',
      check: errorCheck,
      user: mockUser,
    });

    assert(shouldSignOut === false, 'Error must NEVER trigger shouldSignOut=true');
    assert(nextState.user !== null, 'Error must preserve user session (user must not be null)');
    assert(nextState.adminCheck?.kind === 'error', 'Error must be recorded as kind: "error"');
    assert(nextState.adminCheck?.kind !== 'not_admin', 'Error must NEVER be treated as kind: "not_admin"');
    assert(nextState.verificationError === 'connection timeout', 'Verification error message must be exposed for retry');
    assert(nextState.isAdmin === false, 'Admin privileges must remain false until verified');
  }

  // TEST 2: Confirmed non-admin signs out user
  {
    const notAdminCheck: AdminCheck = { kind: 'not_admin' };
    const { nextState, shouldSignOut } = authAdminReducer(initialState, {
      type: 'CHECK_RESOLVED',
      check: notAdminCheck,
      user: mockUser,
    });

    assert(shouldSignOut === true, 'not_admin MUST trigger shouldSignOut=true');
    assert(nextState.user === null, 'not_admin MUST clear the user');
    assert(nextState.isAdmin === false, 'not_admin MUST ensure isAdmin is false');
    assert(nextState.adminCheck?.kind === 'not_admin', 'not_admin recorded accurately');
  }

  // TEST 3: Confirmed admin grants admin status
  {
    const adminCheck: AdminCheck = { kind: 'admin' };
    const { nextState, shouldSignOut } = authAdminReducer(initialState, {
      type: 'CHECK_RESOLVED',
      check: adminCheck,
      user: mockUser,
    });

    assert(shouldSignOut === false, 'admin MUST NOT trigger sign-out');
    assert(nextState.user === mockUser, 'admin preserves user');
    assert(nextState.isAdmin === true, 'admin sets isAdmin to true');
    assert(nextState.verificationError === null, 'admin clears any prior verification error');
  }

  // TEST 4: Retry from error state transitions to admin upon successful check
  {
    const errorState: AuthAdminState<typeof mockUser> = {
      user: mockUser,
      isAdmin: false,
      adminCheck: { kind: 'error', message: 'Temporary 503 error' },
      verificationError: 'Temporary 503 error',
      isVerifying: false,
    };

    const retrySuccess: AdminCheck = { kind: 'admin' };
    const { nextState, shouldSignOut } = authAdminReducer(errorState, {
      type: 'CHECK_RESOLVED',
      check: retrySuccess,
      user: mockUser,
    });

    assert(shouldSignOut === false, 'Retry to admin does not sign out');
    assert(nextState.isAdmin === true, 'Retry to admin successfully activates admin privileges');
    assert(nextState.verificationError === null, 'Verification error is cleared on successful retry');
  }

  return { passed: allPassed, results };
}
