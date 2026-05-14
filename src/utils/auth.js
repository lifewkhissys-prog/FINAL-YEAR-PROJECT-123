export const decodeJwtPayload = (token) => {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch (error) {
    return null;
  }
};

export const isTokenExpired = (payload) => {
  if (!payload?.exp) return true;
  return payload.exp < Date.now() / 1000;
};

export const getUserFromToken = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload || isTokenExpired(payload)) return null;

  return {
    id: payload.sub || payload.user_id || payload.id,
    name: payload.name || 'User',
    email: payload.email,
    role: payload.role,
    exp: payload.exp,
  };
};
