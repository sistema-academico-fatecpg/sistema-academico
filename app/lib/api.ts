const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

function getToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro desconhecido" }));
    throw new Error(error.error?.message || `Erro ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value.toString());
    }
  });
  return searchParams.toString();
}

export interface UsersResponse {
  users: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LogsResponse {
  logs: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CriticalOperationsResponse {
  requests: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    fetchApi<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => fetchApi<any>("/auth/logout", { method: "POST" }),

  register: (data: {
    name: string;
    socialName?: string;
    email: string;
    institutionalEmail: string;
    registrationNumber?: string;
    role: string;
  }) =>
    fetchApi<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  me: () => fetchApi<any>("/auth/me"),

  // Users
  getUsers: (query?: {
    page?: number;
    limit?: number;
    role?: string;
    status?: string;
    search?: string;
  }) => fetchApi<UsersResponse>(`/users?${buildQueryString(query ?? {})}`),

  getUser: (id: string) => fetchApi<any>(`/users/${id}`),

  updateUser: (id: string, data: any) =>
    fetchApi<any>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteUser: (id: string) => fetchApi<any>(`/users/${id}`, { method: "DELETE" }),

  assignRole: (userId: string, role: string) =>
    fetchApi<any>(`/users/${userId}/roles`, {
      method: "POST",
      body: JSON.stringify({ role }),
    }),

  removeRole: (userId: string, role: string) =>
    fetchApi<any>(`/users/${userId}/roles/${role}`, { method: "DELETE" }),

  // Roles
  getRoles: () => fetchApi<any>("/roles"),

  // Logs
  getLogs: (query?: {
    page?: number;
    limit?: number;
    module?: string;
    action?: string;
    userId?: string;
  }) => fetchApi<LogsResponse>(`/logs?${buildQueryString(query ?? {})}`),

  // Critical Operations
  getCriticalOperations: (query?: { page?: number; limit?: number; status?: string }) =>
    fetchApi<CriticalOperationsResponse>(`/critical-operations?${buildQueryString(query ?? {})}`),

  createCriticalOperation: (data: any) =>
    fetchApi<any>("/critical-operations", { method: "POST", body: JSON.stringify(data) }),

  approveOperation: (id: string) =>
    fetchApi<any>(`/critical-operations/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "APPROVE" }),
    }),

  rejectOperation: (id: string) =>
    fetchApi<any>(`/critical-operations/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "REJECT" }),
    }),

  executeOperation: (id: string) =>
    fetchApi<any>(`/critical-operations/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "EXECUTE" }),
    }),

  // Support Access
  getSupportAccess: (query?: { page?: number; limit?: number; status?: string }) =>
    fetchApi<any>(`/support-access?${buildQueryString(query ?? {})}`),

  createSupportAccess: (data: any) =>
    fetchApi<any>("/support-access", { method: "POST", body: JSON.stringify(data) }),

  approveSupportAccess: (id: string) =>
    fetchApi<any>(`/support-access/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "APPROVE" }),
    }),

  rejectSupportAccess: (id: string) =>
    fetchApi<any>(`/support-access/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "REJECT" }),
    }),

  revokeSupportAccess: (id: string) =>
    fetchApi<any>(`/support-access/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: "REVOKE" }),
    }),

  // MFA
  setupMFA: () => fetchApi<any>("/mfa", { method: "POST" }),
  verifyMFA: (token: string, secret: string) =>
    fetchApi<any>("/mfa", { method: "PUT", body: JSON.stringify({ token, secret }) }),
  verifyRecoveryCode: (code: string) =>
    fetchApi<any>("/mfa/recovery", { method: "POST", body: JSON.stringify({ code }) }),

  // Tokens
  activateAccount: (tokenId: string) =>
    fetchApi<any>("/tokens/activate", { method: "POST", body: JSON.stringify({ tokenId }) }),

  resetPassword: (tokenId: string) =>
    fetchApi<any>("/tokens/password-reset", { method: "POST", body: JSON.stringify({ tokenId }) }),
};
