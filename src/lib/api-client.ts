import type { BusinessSettings } from "./business-settings";
import type { Receipt } from "./receipt-store";

const DEFAULT_BASE =
  (typeof import.meta !== "undefined" && (import.meta as any).env
    ? (import.meta as any).env?.VITE_API_BASE_URL
    : undefined) || "/api";

export type ApiResponse<T = any> = {
  success: boolean;
  message?: string;
  code?: string;
  data?: T;
  errors?: { field?: string; message: string }[];
};

export class ApiClient {
  private base: string;
  private enabled: boolean;

  constructor(baseUrl = DEFAULT_BASE) {
    this.base = baseUrl.replace(/\/$/, "");
    this.enabled = typeof window !== "undefined";
  }

  getBaseUrl() {
    return this.base;
  }

  isEnabled() {
    return this.enabled;
  }

  private async request<T = any>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<ApiResponse<T>> {
    if (!this.enabled) {
      return { success: false, message: "API disabled", code: "DISABLED" };
    }
    const url = path.startsWith("http") ? path : `${this.base}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      const t = await res.text().catch(() => "");
      data = { success: res.ok, message: t || res.statusText };
    }
    if (!res.ok && data && typeof data === "object") {
      data.success = data.success ?? false;
    }
    return data as ApiResponse<T>;
  }

  async health() {
    return this.request<any>("GET", "/health");
  }

  async isBackendReachable(): Promise<boolean> {
    try {
      const res = await this.health();
      return Boolean(res?.success || res?.status === "healthy");
    } catch {
      return false;
    }
  }

  // --- Business ---
  async getBusiness(): Promise<ApiResponse<BusinessSettings & { _id?: string }>> {
    return this.request("GET", "/business");
  }
  async saveBusiness(payload: BusinessSettings) {
    const body = this.settingsToBusinessPayload(payload);
    return this.request("POST", "/business", body);
  }

  // --- Receipts ---
  async listReceipts(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sort?: "newest" | "oldest" | "highest" | "lowest";
  }) {
    const q = new URLSearchParams();
    if (params?.page) q.set("page", String(params.page));
    if (params?.limit) q.set("limit", String(params.limit));
    if (params?.search) q.set("search", params.search);
    if (params?.sort) q.set("sort", params.sort);
    const s = q.toString();
    return this.request("GET", `/receipts${s ? `?${s}` : ""}`);
  }

  async getReceipt(id: string) {
    return this.request("GET", `/receipts/${encodeURIComponent(id)}`);
  }

  async createReceipt(payload: CreateReceiptPayload) {
    return this.request("POST", "/receipts", payload);
  }

  async deleteReceipt(id: string) {
    return this.request("DELETE", `/receipts/${encodeURIComponent(id)}`);
  }

  async nextReceiptNumber() {
    return this.request<{ receiptNumber: string; date: string }>(
      "GET",
      "/receipts/utils/next-number",
    );
  }

  // --- Mappers ---
  settingsToBusinessPayload(s: BusinessSettings) {
    return {
      companyName: s.companyName || "",
      ownerName: s.ownerName || "",
      logo: s.logoDataUrl || null,
      phone: s.phone || "",
      email: s.email || "",
      website: s.website || "",
      gstNumber: s.gstNumber || "",
      currency: (s.currency as any) || "INR",
      address: {
        addressLine: s.addressLine || "",
        city: s.city || "",
        state: s.state || "",
        country: s.country || "",
        postalCode: s.postalCode || "",
      },
    };
  }

  businessToSettings(doc: any): BusinessSettings {
    const d = doc || {};
    const addr = d.address || {};
    return {
      companyName: d.companyName || "",
      ownerName: d.ownerName || "",
      gstNumber: d.gstNumber || "",
      phone: d.phone || "",
      email: d.email || "",
      website: d.website || "",
      addressLine: addr.addressLine || "",
      city: addr.city || "",
      state: addr.state || "",
      country: addr.country || "",
      postalCode: addr.postalCode || "",
      logoDataUrl: d.logo || null,
      currency: d.currency || "INR",
    };
  }
}

export type CreateReceiptPayload = {
  customer: {
    name: string;
    phone?: string;
    email?: string;
    address?: string;
  };
  items: {
    itemName: string;
    description?: string;
    quantity: number;
    unitPrice: number;
  }[];
  gstEnabled: boolean;
  gstPercentage: number;
  discount?: { percentage: number };
  discountPercentage?: number;
  shipping: number;
  notes: string;
  currency?: string;
};

export const apiClient = new ApiClient();

export default apiClient;
