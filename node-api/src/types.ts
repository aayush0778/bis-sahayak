export interface AuthUser {
  id: string;
  email: string;
  role: "consumer" | "business" | "admin";
  businessName?: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface Citation {
  type: "standard" | "qco";
  ref: string;
  source_url?: string | null;
}

export interface RagAnswerResponse {
  answer: string;
  citations: Citation[];
  grounded: boolean;
  /** best cosine similarity from retrieval — shown in the UI as the grounding score */
  topScore?: number;
}

export interface ApplicabilityResponse {
  standards: {
    is_number: string;
    title: string;
    score: number;
    matched_on: string[];
    certification_scheme?: string | null;
    source_url?: string | null;
  }[];
  mandatory: boolean;
  scheme?: string | null;
  qcoRefs: {
    ref: string;
    standards: string[];
    effective_date?: string | null;
    scheme?: string | null;
    source_url?: string | null;
  }[];
  concessionRoutes: {
    ref: string;
    effective_date?: string | null;
    scheme?: string | null;
    source_url?: string | null;
  }[];
  why?: string | null;
}

export interface ComplaintDraftResponse {
  draft: {
    category?: string | null;
    relatedRecordNumber?: string | null;
    body: string;
  };
  citations: Citation[];
}
