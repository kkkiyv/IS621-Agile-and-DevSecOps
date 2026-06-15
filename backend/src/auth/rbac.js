const permissions = {
  admin:  ['/admin', '/dashboard', '/content', '/settings', '/users'],
  editor: ['/dashboard', '/content'],
  viewer: ['/dashboard'],
  guest:  [],
};

function checkAccess(role, route) {
  if (!role || !permissions[role]) return false;
  return permissions[role].some(allowed => route.startsWith(allowed));
}

module.exports = { checkAccess, permissions };
