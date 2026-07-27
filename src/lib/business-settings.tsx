import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import apiClient, { type ApiResponse } from "./api-client";

export interface BusinessSettings {
  companyName: string;
  ownerName: string;
  gstNumber: string;
  phone: string;
  email: string;
  website: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  logoDataUrl: string | null; // base64 data URL
  currency: string;
}

export const defaultSettings: BusinessSettings = {
  companyName: "",
  ownerName: "",
  gstNumber: "",
  phone: "",
  email: "",
  website: "",
  addressLine: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  logoDataUrl: null,
  currency: "INR",
};

const STORAGE_KEY = "receiptai-business-settings";

interface Ctx {
  settings: BusinessSettings;
  saveSettings: (next: BusinessSettings) => Promise<ApiResponse | void>;
  updateLogo: (dataUrl: string | null) => Promise<ApiResponse | void>;
  refreshFromApi: () => Promise<ApiResponse | void>;
  isConfigured: boolean;
  hydrated: boolean;
  syncStatus: "idle" | "loading" | "synced" | "error";
  apiEnabled: boolean;
}

const BusinessSettingsContext = createContext<Ctx | null>(null);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings);
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<Ctx["syncStatus"]>("idle");
  const [apiEnabled, setApiEnabled] = useState(false);

  useEffect(() => {
    let initial = { ...defaultSettings };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<BusinessSettings>;
        initial = { ...initial, ...parsed };
        setSettings(initial);
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
        if (!ok) {
          setApiEnabled(false);
          return;
        }
        setApiEnabled(true);
        setSyncStatus("loading");
        const res = await apiClient.getBusiness();
        if (!alive) return;
        if (res?.success && res?.data) {
          const mapped = apiClient.businessToSettings(res.data);
          setSettings(mapped);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
          } catch {
            /* ignore */
          }
          setSyncStatus("synced");
        } else {
          setSyncStatus("idle");
        }
      } catch {
        if (alive) setApiEnabled(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const persistLocal = useCallback((next: BusinessSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, []);

  const refreshFromApi = useCallback(async (): Promise<ApiResponse | void> => {
    if (!apiEnabled) return;
    setSyncStatus("loading");
    try {
      const res = await apiClient.getBusiness();
      if (res?.success && res?.data) {
        const mapped = apiClient.businessToSettings(res.data);
        setSettings(mapped);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } catch {
          /* ignore */
        }
        setSyncStatus("synced");
      } else {
        setSyncStatus("error");
      }
      return res;
    } catch (e) {
      setSyncStatus("error");
      return { success: false, message: (e as any)?.message || "Network error" };
    }
  }, [apiEnabled]);

  const saveSettings = useCallback(
    async (next: BusinessSettings): Promise<ApiResponse | void> => {
      persistLocal(next);
      if (apiEnabled) {
        setSyncStatus("loading");
        try {
          const res = await apiClient.saveBusiness(next);
          if (res?.success && res?.data) {
            const mapped = apiClient.businessToSettings(res.data);
            setSettings(mapped);
            setSyncStatus("synced");
          } else {
            setSyncStatus("error");
          }
          return res;
        } catch (e) {
          setSyncStatus("error");
          return { success: false, message: (e as any)?.message || "Network error" };
        }
      }
    },
    [apiEnabled, persistLocal],
  );

  const updateLogo = useCallback(
    async (dataUrl: string | null): Promise<ApiResponse | void> => {
      const next = { ...settings, logoDataUrl: dataUrl };
      return saveSettings(next);
    },
    [settings, saveSettings],
  );

  const value = useMemo<Ctx>(
    () => ({
      settings,
      saveSettings,
      updateLogo,
      refreshFromApi,
      isConfigured: settings.companyName.trim().length > 0,
      hydrated,
      syncStatus,
      apiEnabled,
    }),
    [settings, saveSettings, updateLogo, refreshFromApi, hydrated, syncStatus, apiEnabled],
  );

  return (
    <BusinessSettingsContext.Provider value={value}>{children}</BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const ctx = useContext(BusinessSettingsContext);
  if (!ctx) throw new Error("useBusinessSettings must be used within BusinessSettingsProvider");
  return ctx;
}
