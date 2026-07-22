"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface CmsClient {
  page_id: string;
  name: string;
  instagram_account_id: string | null;
}

interface ClientContextValue {
  clients: CmsClient[];
  sortedClients: CmsClient[];
  clientsLoading: boolean;
  selectedClientPageId: string;
  selectedClient: CmsClient | null;
  setSelectedClientPageId: (pageId: string) => void;
  syncing: boolean;
  syncError: string | null;
  syncClients: () => Promise<void>;
}

const ClientContext = createContext<ClientContextValue | null>(null);

const CLIENT_STORAGE_KEY = "cms_selected_client";

export function ClientProvider({ children }: { children: React.ReactNode }) {
  const [clients, setClients] = useState<CmsClient[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [selectedClientPageId, setSelectedClientPageIdState] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const sortedClients = useMemo(() => [...clients].sort((a, b) => a.name.localeCompare(b.name)), [clients]);

  const fetchClients = (preserveSelection: boolean) => {
    setClientsLoading(true);
    fetch("/api/cms/clients")
      .then(r => r.json())
      .then(data => {
        const list: CmsClient[] = data.clients ?? [];
        setClients(list);
        setSelectedClientPageIdState(prev => {
          if (preserveSelection && prev && list.some(c => c.page_id === prev)) return prev;
          const stored = typeof window !== "undefined" ? localStorage.getItem(CLIENT_STORAGE_KEY) : null;
          return list.find(c => c.page_id === stored)?.page_id ?? list[0]?.page_id ?? "";
        });
      })
      .catch(() => {})
      .finally(() => setClientsLoading(false));
  };

  useEffect(() => { fetchClients(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setSelectedClientPageId = (pageId: string) => {
    setSelectedClientPageIdState(pageId);
    if (typeof window !== "undefined") localStorage.setItem(CLIENT_STORAGE_KEY, pageId);
  };

  const syncClients = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/cms/clients/sync", { method: "POST" });
      if (!res.ok) throw new Error((await res.text()) || "Sync failed");
      fetchClients(true);
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSyncing(false);
    }
  };

  const selectedClient = clients.find(c => c.page_id === selectedClientPageId) ?? null;

  return (
    <ClientContext.Provider value={{
      clients, sortedClients, clientsLoading,
      selectedClientPageId, selectedClient, setSelectedClientPageId,
      syncing, syncError, syncClients,
    }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useCmsClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useCmsClient must be used within ClientProvider");
  return ctx;
}
