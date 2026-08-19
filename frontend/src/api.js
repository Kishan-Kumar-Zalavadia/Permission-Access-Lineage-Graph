const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (networkError) {
    // Backend unreachable entirely (server not running, wrong port, CORS, etc.)
    throw new ApiError('Could not reach the access-graph service. Is the backend running?', 0);
  }

  if (!response.ok) {
    if (response.status === 503) {
      throw new ApiError('The graph database is currently unreachable. Try again shortly.', 503);
    }
    if (response.status === 404) {
      throw new ApiError('No matching record was found.', 404);
    }
    throw new ApiError(`Request failed (${response.status}).`, response.status);
  }

  return response.json();
}

export const api = {
  listUsers: () => request('/api/users'),
  getUserAccess: (userId) => request(`/api/users/${encodeURIComponent(userId)}/access`),
  getUserDirectRoles: (userId) => request(`/api/users/${encodeURIComponent(userId)}/roles`),
  simulateRevoke: (userId, roleId) =>
    request(`/api/users/${encodeURIComponent(userId)}/simulate-revoke?roleId=${encodeURIComponent(roleId)}`),
};

export { ApiError };
