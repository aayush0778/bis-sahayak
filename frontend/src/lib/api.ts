const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getToken(): string | null {
  return localStorage.getItem("bis_token");
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new ApiError("Cannot reach the BIS Sahayak API — is the backend running?", 0);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const message = body?.error?.message ?? `Request failed (${response.status})`;
    throw new ApiError(message, response.status, body?.error?.details);
  }
  return body as T;
}

// ---------- API types ----------

export interface User {
  id: string;
  email: string;
  role: "consumer" | "business" | "admin";
  businessName?: string | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Citation {
  type: "standard" | "qco";
  ref: string;
  source_url?: string | null;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[] | null;
  grounded?: boolean;
  /** "llm" = model synthesis, "corpus" = extractive composer, undefined = legacy backend */
  synthesis?: "llm" | "corpus";
  /** true when the LLM was tried but failed and the extractive composer took over */
  fellBack?: boolean;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
}

export interface ApplicabilityStandard {
  is_number: string;
  title: string;
  score: number;
  matched_on: string[];
  certification_scheme?: string | null;
  source_url?: string | null;
}

export interface ApplicabilityResult {
  standards: ApplicabilityStandard[];
  mandatory: boolean;
  scheme?: string | null;
  qcoRefs: {
    ref: string;
    standards: string[];
    effective_date?: string | null;
    scheme?: string | null;
    source_url?: string | null;
  }[];
  concessionRoutes: { ref: string; effective_date?: string | null; scheme?: string | null; source_url?: string | null }[];
  why?: string | null;
}

export interface QcoItem {
  id: string;
  title: string;
  product_categories: string[];
  applicable_is_numbers: string[];
  effective_date: string;
  issuing_authority: string;
  scheme: string | null;
  summary: string;
  source_url: string;
}

export interface QcoFeed {
  items: QcoItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VerificationRecord {
  type: string;
  number: string;
  holderName: string;
  productScope: string;
  status: "active" | "suspended" | "cancelled" | "expired";
  validUntil: string | null;
}

export interface Complaint {
  id: string;
  product_description: string;
  defect_description: string;
  related_record_number: string | null;
  draft: { category?: string | null; relatedRecordNumber?: string | null; body: string } | null;
  status: "draft" | "submitted";
  created_at: string;
}

export interface Watch {
  id: string;
  product_category: string;
  created_at: string;
}

export interface Office {
  office_type: "hq" | "regional_office" | "branch_office" | "laboratory";
  name: string;
  region: string | null;
  address: string;
  phone: string | null;
  email: string | null;
  latitude: number | null;
  longitude: number | null;
  source_url: string;
}

export async function getOffices(): Promise<{ items: Office[]; note: string }> {
  return api<{ items: Office[]; note: string }>("/offices");
}
