const API_URL = (process.env.EXPO_PUBLIC_API_URL || "https://asistente-pastoral-ia-api.onrender.com").replace(/\/$/, "");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Error ${response.status}`);
  return data as T;
}

export type SaturdayPath = {
  id: 1 | 2 | 3;
  text: string;
  title: string;
  hook: string;
  centralIdea: string;
  whyItFits: string;
  structure: string[];
  callDirection: string;
};

export type SermonMovement = { title: string; explanation: string; truth: string; application: string };
export type SermonData = {
  title: string; mainText: string; centralIdea: string; hook: string; introduction: string; context: string;
  movements: SermonMovement[]; illustration: string; applications: string[]; call: string; finalPrayer: string; preacherSummary: string[];
};
export type LibrarySource = { id: string; filename: string; title: string; pageLabel: string; pageStart?: number | null; score: number; excerpt?: string; categoryLabel?: string };
export type MaterialItem = { id: string; type: string; title: string; topic?: string; sermon?: SermonData | null; content?: string; context?: any; createdAt: string };
export type LibraryStatus = { ready: boolean; status: string; catalog?: any[]; [key: string]: any };
export type LibrarySearchResult = { answer: string; pastoralUse: string; evidenceLevel: string; sources: LibrarySource[] };
export type LibrarySourcePage = { filename: string; title?: string; currentPage: number; totalPages?: number; text?: string; content?: string; [key: string]: any };

export const api = {
  visit: (body: any) => request<{ result: string }>("/api/visita", { method: "POST", body: JSON.stringify(body) }),
  ministry: (body: any) => request<{ result: string }>("/api/ministerio", { method: "POST", body: JSON.stringify(body) }),
  concordance: (body: any) => request<{ result: string }>("/api/concordancia", { method: "POST", body: JSON.stringify(body) }),
  biblicalWorld: (body: any) => request<{ result: string }>("/api/mundo-biblico", { method: "POST", body: JSON.stringify(body) }),
  saturdayIdeas: (body: any) => request<{ paths: SaturdayPath[]; recommendation: string; sources?: LibrarySource[] }>("/api/preparame-sabado", { method: "POST", body: JSON.stringify(body) }),
  developSermon: (body: any) => request<{ sermon: SermonData; sources?: LibrarySource[] }>("/api/desarrollar-sermon", { method: "POST", body: JSON.stringify(body) }),
  transformSermon: (type: string, sermon: SermonData, context?: any) => request<{ result: string }>("/api/transformar-sermon", { method: "POST", body: JSON.stringify({ type, sermon, context }) }),
  listMaterials: () => request<{ items: MaterialItem[] }>("/api/materiales"),
  saveMaterial: (body: any) => request<{ item: MaterialItem }>("/api/materiales", { method: "POST", body: JSON.stringify(body) }),
  deleteMaterial: (id: string) => request<{ ok: boolean }>(`/api/materiales/${id}`, { method: "DELETE" }),
  exportSermon: (format: "word" | "ppt", sermon: SermonData, context?: any) => request<{ url: string }>("/api/exportar-sermon", { method: "POST", body: JSON.stringify({ format, sermon, context }) }).then((data) => ({ url: data.url.startsWith("http") ? data.url : `${API_URL}${data.url}` })),
  exportDocument: (format: "pdf" | "word", title: string, content: string) => request<{ url: string }>("/api/exportar-documento", { method: "POST", body: JSON.stringify({ format, title, content }) }).then((data) => ({ url: data.url.startsWith("http") ? data.url : `${API_URL}${data.url}` })),
  libraryStatus: () => request<LibraryStatus>("/api/biblioteca/status"),
  configureLibrary: () => request<LibraryStatus>("/api/biblioteca/configurar", { method: "POST", body: "{}" }),
  searchLibrary: (query: string, category = "all") => request<LibrarySearchResult>("/api/biblioteca/buscar", { method: "POST", body: JSON.stringify({ query, category }) }),
  librarySourcePage: (filename: string, page: number) => request<LibrarySourcePage>("/api/biblioteca/fuente", { method: "POST", body: JSON.stringify({ filename, page }) }),
};
