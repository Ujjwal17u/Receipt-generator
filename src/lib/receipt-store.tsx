import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { generateReceiptNumber, isSameDay } from "./receipt-utils";
import apiClient, { type ApiResponse, type CreateReceiptPayload } from "./api-client";

export interface ReceiptItem {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  createdAt: string;
  dateIso: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;

  items: ReceiptItem[];
  gstEnabled: boolean;
  gstRate: number;
  discountPercent: number;
  shipping: number;

  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;

  notes: string;

  _backendId?: string;
  syncedAt?: string;
}

const STORAGE_KEY = "receiptai-receipts";

interface Ctx {
  receipts: Receipt[];
  addReceipt: (
    r: Omit<Receipt, "id" | "receiptNumber" | "createdAt" | "dateIso">,
  ) => Promise<{ receipt: Receipt; api?: ApiResponse }>;
  deleteReceipt: (id: string) => Promise<void>;
  getNextReceiptNumber: () => Promise<string>;
  refreshFromApi: () => Promise<void>;
  totalToday: number;
  totalAllTime: number;
  hydrated: boolean;
  apiEnabled: boolean;
  syncStatus: "idle" | "loading" | "synced" | "error";
}

const ReceiptContext = createContext<Ctx | null>(null);

function uid(): string {
  return "r_" + Math.random().toString(36).slice(2, 10);
}

export function toBackendPayload(
  r: Omit<Receipt, "id" | "receiptNumber" | "createdAt" | "dateIso"> & {
    currency?: string;
  },
): CreateReceiptPayload {
  return {
    customer: {
      name: r.customerName,
      phone: r.customerPhone || undefined,
      email: r.customerEmail || undefined,
      address: r.customerAddress || undefined,
    },
    items: r.items.map((it) => ({
      itemName: it.name,
      description: it.description || undefined,
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
    })),
    gstEnabled: Boolean(r.gstEnabled),
    gstPercentage: Number(r.gstRate) || 0,
    discount: { percentage: Number(r.discountPercent) || 0 },
    shipping: Number(r.shipping) || 0,
    notes: r.notes || "",
    currency: r.currency || "INR",
  };
}

function fromBackendDoc(doc: any): Receipt | null {
  if (!doc) return null;
  const customer = doc.customer || {};
  const items = (Array.isArray(doc.items) ? doc.items : []).map((it: any, idx: number) => ({
    id: `it_${idx}_${Math.random().toString(36).slice(2, 6)}`,
    name: it.itemName || "",
    description: it.description || "",
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
  }));
  const fin = doc.financials || {};
  return {
    id: `r_${doc._id || doc.receiptId || uid()}`,
    receiptNumber: doc.receiptNumber || "",
    createdAt: doc.createdAt || doc.receiptDate || new Date().toISOString(),
    dateIso: doc.receiptDate || doc.createdAt || new Date().toISOString(),
    customerName: customer.name || "",
    customerPhone: customer.phone || "",
    customerEmail: customer.email || "",
    customerAddress: customer.address || "",
    items,
    gstEnabled: Boolean(fin.gstEnabled),
    gstRate: Number(fin.gstPercentage) || 0,
    discountPercent: Number(fin.discount?.percentage) || 0,
    shipping: Number(fin.shipping) || 0,
    subtotal: Number(fin.subtotal) || 0,
    discountAmount: Number(fin.discount?.amount) || 0,
    taxableAmount: Number(fin.taxableAmount) || 0,
    gstAmount: Number(fin.gstAmount) || 0,
    grandTotal: Number(fin.grandTotal) || 0,
    notes: doc.notes || "",
    _backendId: doc._id || doc.receiptId,
    syncedAt: new Date().toISOString(),
  };
}

export function ReceiptProvider({ children }: { children: ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Ctx["syncStatus"]>("idle");
  const [apiEnabled, setApiEnabled] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setReceipts(JSON.parse(raw) as Receipt[]);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);

    let alive = true;
    (async () => {
      try {
        const ok = await apiClient.isBackendReachable();
        if (!alive) return;
        setApiEnabled(ok);
        if (ok) {
          setSyncStatus("loading");
          const res = await apiClient.listReceipts({ limit: 100, sort: "newest" });
          if (!alive) return;
          if (res?.success && Array.isArray((res.data as any)?.items)) {
            const backendItems = (res.data as any).items
              .map((d: any) => fromBackendDoc(d))
              .filter(Boolean) as Receipt[];
            if (backendItems.length > 0) {
              const byNumber = new Map<string, Receipt>();
              for (const r of backendItems) byNumber.set(r.receiptNumber, r);
              for (const r of receipts)
                if (!byNumber.has(r.receiptNumber)) byNumber.set(r.receiptNumber, r);
              const merged = Array.from(byNumber.values()).sort(
                (a, b) => +new Date(b.dateIso) - +new Date(a.dateIso),
              );
              setReceipts(merged);
              try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
              } catch {
                /* ignore */
              }
            }
            setSyncStatus("synced");
          } else {
            setSyncStatus("idle");
          }
        }
      } catch {
        if (alive) setApiEnabled(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback((next: Receipt[]) => {
    setReceipts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const refreshFromApi = useCallback(async () => {
    if (!apiEnabled) return;
    setSyncStatus("loading");
    try {
      const res = await apiClient.listReceipts({ limit: 200, sort: "newest" });
      if (res?.success && Array.isArray((res.data as any)?.items)) {
        const backendItems = (res.data as any).items
          .map((d: any) => fromBackendDoc(d))
          .filter(Boolean) as Receipt[];
        const byNumber = new Map<string, Receipt>();
        for (const r of backendItems) byNumber.set(r.receiptNumber, r);
        for (const r of receipts)
          if (!byNumber.has(r.receiptNumber)) byNumber.set(r.receiptNumber, r);
        const merged = Array.from(byNumber.values()).sort(
          (a, b) => +new Date(b.dateIso) - +new Date(a.dateIso),
        );
        persist(merged);
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
    } catch {
      setSyncStatus("error");
    }
  }, [apiEnabled, persist, receipts]);

  const getNextReceiptNumber = useCallback(async (): Promise<string> => {
    if (apiEnabled) {
      try {
        const res = await apiClient.nextReceiptNumber();
        if (res?.success && (res.data as any)?.receiptNumber) {
          return (res.data as any).receiptNumber as string;
        }
      } catch {
        /* fall through */
      }
    }
    const today = new Date();
    const todays = receipts.filter((r) => isSameDay(new Date(r.dateIso), today));
    return generateReceiptNumber(todays.length, today);
  }, [apiEnabled, receipts]);

  const addReceipt = useCallback(
    async (
      r: Omit<Receipt, "id" | "receiptNumber" | "createdAt" | "dateIso">,
    ): Promise<{ receipt: Receipt; api?: ApiResponse }> => {
      const now = new Date();
      let receiptNumber = "";
      try {
        receiptNumber = await getNextReceiptNumber();
      } catch {
        const todayReceipts = receipts.filter((x) =>
          isSameDay(new Date(x.dateIso), now),
        );
        receiptNumber = generateReceiptNumber(todayReceipts.length, now);
      }
      const newReceipt: Receipt = {
        ...r,
        id: uid(),
        receiptNumber,
        createdAt: now.toISOString(),
        dateIso: now.toISOString(),
      };

      let apiRes: ApiResponse | undefined;
      if (apiEnabled) {
        try {
          const payload = toBackendPayload({ ...r, currency: "INR" });
          apiRes = await apiClient.createReceipt(payload);
          if (apiRes?.success && apiRes?.data) {
            const mapped = fromBackendDoc(apiRes.data);
            if (mapped) {
              if (!mapped.receiptNumber) mapped.receiptNumber = receiptNumber;
              mapped.id = newReceipt.id;
              mapped.syncedAt = new Date().toISOString();
              persist([mapped, ...receipts]);
              return { receipt: mapped, api: apiRes };
            }
          }
        } catch (e) {
          apiRes = {
            success: false,
            message: (e as any)?.message || "API error",
          };
        }
      }
      persist([newReceipt, ...receipts]);
      return { receipt: newReceipt, api: apiRes };
    },
    [apiEnabled, getNextReceiptNumber, persist, receipts],
  );

  const deleteReceipt = useCallback(
    async (id: string) => {
      const target = receipts.find(
        (r) =>
          r.id === id || r._backendId === id || r.receiptNumber === id,
      );
      const next = receipts.filter(
        (r) =>
          r.id !== id && r._backendId !== id && r.receiptNumber !== id,
      );
      persist(next);
      if (apiEnabled && target?._backendId) {
        try {
          await apiClient.deleteReceipt(target._backendId);
        } catch {
          /* ignore */
        }
      } else if (apiEnabled && target?.receiptNumber) {
        try {
          await apiClient.deleteReceipt(target.receiptNumber);
        } catch {
          /* ignore */
        }
      }
    },
    [apiEnabled, persist, receipts],
  );

  const value = useMemo<Ctx>(() => {
    const today = new Date();
    const todayList = receipts.filter((r) =>
      isSameDay(new Date(r.dateIso), today),
    );
    const totalToday = todayList.reduce((s, r) => s + r.grandTotal, 0);
    const totalAllTime = receipts.reduce((s, r) => s + r.grandTotal, 0);
    return {
      receipts,
      addReceipt,
      deleteReceipt,
      getNextReceiptNumber,
      refreshFromApi,
      totalToday,
      totalAllTime,
      hydrated,
      apiEnabled,
      syncStatus,
    };
  }, [
    receipts,
    addReceipt,
    deleteReceipt,
    getNextReceiptNumber,
    refreshFromApi,
    hydrated,
    apiEnabled,
    syncStatus,
  ]);

  return (
    <ReceiptContext.Provider value={value}>{children}</ReceiptContext.Provider>
  );
}

export function useReceipts() {
  const ctx = useContext(ReceiptContext);
  if (!ctx) throw new Error("useReceipts must be used within ReceiptProvider");
  return ctx;
}

export function computeReceiptTotals(
  items: ReceiptItem[],
  gstEnabled: boolean,
  gstRate: number,
  discountPercent: number,
  shipping: number,
) {
  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0,
  );
  const discountAmount =
    subtotal * ((Number(discountPercent) || 0) / 100);
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = gstEnabled
    ? taxableAmount * ((Number(gstRate) || 0) / 100)
    : 0;
  const grandTotal = taxableAmount + gstAmount + (Number(shipping) || 0);
  return { subtotal, discountAmount, taxableAmount, gstAmount, grandTotal };
}
