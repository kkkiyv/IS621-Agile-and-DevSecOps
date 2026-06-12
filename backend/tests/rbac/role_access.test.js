// backend/tests/rbac/role_access.test.js

const { checkAccess, permissions } = require('../../src/auth/rbac');

// ─── AC1: Role-based tests exist ─────────────────────────────────────────────
describe('RBAC Regression Tests', () => {

  // ─── AC1: All expected roles are defined ───────────────────────────────────
  describe('Role definitions', () => {
    test('all expected roles exist in the system', () => {
      const expectedRoles = ['admin', 'editor', 'viewer', 'guest'];
      expectedRoles.forEach(role => {
        expect(permissions).toHaveProperty(role);
      });
    });
  });

  // ─── AC2: Authorized access is confirmed ───────────────────────────────────
  describe('Authorized access', () => {
    test('admin can access /admin routes', () => {
      expect(checkAccess('admin', '/admin/users')).toBe(true);
    });

    test('admin can access /dashboard', () => {
      expect(checkAccess('admin', '/dashboard')).toBe(true);
    });

    test('editor can access /content routes', () => {
      expect(checkAccess('editor', '/content/edit')).toBe(true);
    });

    test('editor can access /dashboard', () => {
      expect(checkAccess('editor', '/dashboard')).toBe(true);
    });

    test('viewer can access /dashboard', () => {
      expect(checkAccess('viewer', '/dashboard')).toBe(true);
    });
  });

  // ─── AC3: Unauthorized access is blocked ───────────────────────────────────
  describe('Unauthorized access', () => {
    test('viewer cannot access /admin routes', () => {
      expect(checkAccess('viewer', '/admin/users')).toBe(false);
    });

    test('viewer cannot access /content routes', () => {
      expect(checkAccess('viewer', '/content/edit')).toBe(false);
    });

    test('editor cannot access /admin routes', () => {
      expect(checkAccess('editor', '/admin/settings')).toBe(false);
    });

    test('guest cannot access any protected route', () => {
      expect(checkAccess('guest', '/dashboard')).toBe(false);
    });

    test('unauthenticated user (null) is always blocked', () => {
      expect(checkAccess(null, '/dashboard')).toBe(false);
    });

    test('unknown role is always blocked', () => {
      expect(checkAccess('hacker', '/admin')).toBe(false);
    });
  });

});
