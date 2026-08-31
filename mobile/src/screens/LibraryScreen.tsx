import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { api, LibrarySearchResult, LibrarySource, LibrarySourcePage, LibraryStatus } from "../api/client";
import { Card, Page, PrimaryButton, SectionIntro } from "../components/UI";
import { theme } from "../theme";
import { ResultActions } from "../components/ResultActions";

const categories = [{ id: "all", label: "Todas" }, { id: "comentario", label: "Comentario" }, { id: "diccionario", label: "Diccionario" }, { id: "teologia", label: "Teología" }, { id: "creencias", label: "Creencias" }];

export function LibraryScreen({ onBack }: { onBack: () => void }) {
  const [status, setStatus] = useState<LibraryStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [searching, setSearching] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  const [result, setResult] = useState<LibrarySearchResult | null>(null);
  const [opened, setOpened] = useState<LibrarySourcePage | null>(null);
  const [error, setError] = useState("");

  const loadStatus = async () => {
    try { const data = await api.libraryStatus(); setStatus(data); return data; }
    catch (e) { setError(e instanceof Error ? e.message : "No pude consultar la Biblioteca."); return null; }
    finally { setLoadingStatus(false); }
  };

  useEffect(() => { loadStatus(); }, []);
  useEffect(() => {
    if (status?.status !== "indexing") return;
    const timer = setInterval(() => loadStatus(), 3000);
    return () => clearInterval(timer);
  }, [status?.status]);

  const activate = async () => {
    setConfiguring(true); setError("");
    try { setStatus(await api.configureLibrary()); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude iniciar la Biblioteca."); }
    finally { setConfiguring(false); }
  };

  const search = async () => {
    if (!query.trim()) return setError("Escribí una pregunta, un tema o un pasaje bíblico.");
    setSearching(true); setResult(null); setError("");
    try { setResult(await api.searchLibrary(query.trim(), category)); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude completar la búsqueda."); }
    finally { setSearching(false); }
  };

  const openSource = async (source: LibrarySource) => {
    setError("");
    try { setOpened(await api.librarySourcePage(source.filename, source.pageStart || 1)); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude abrir la fuente."); }
  };

  if (opened) return <SourceReader initial={opened} onBack={() => setOpened(null)} />;

  return <Page onBack={onBack} eyebrow="Fuentes" title="Biblioteca inteligente">
    <View style={styles.hero}><Text style={styles.heroEyebrow}>📚 TU CENTRO DE INVESTIGACIÓN</Text><Text style={styles.heroTitle}>Preguntá. Investigá. Verificá la fuente.</Text><Text style={styles.heroText}>Buscá un pasaje, un tema o una pregunta y recorré las fuentes originales que sostienen la respuesta.</Text></View>
    <SectionIntro text="La Biblioteca responde desde las fuentes indexadas y muestra los fragmentos utilizados." />

    {loadingStatus ? <Card><ActivityIndicator color={theme.colors.gold} /><Text style={styles.center}>Revisando la Biblioteca…</Text></Card> : null}
    {error ? <Card style={styles.errorCard}><Text style={styles.error}>{error}</Text></Card> : null}

    {status ? <Card><Text style={styles.statusTitle}>{status.ready ? "✓ Biblioteca activa" : status.status === "indexing" ? "Preparando biblioteca…" : "Biblioteca pendiente"}</Text><Text style={styles.statusText}>{status.indexedSources ?? 0} de {status.totalSources ?? status.catalog?.length ?? 0} fuentes indexadas · {status.totalPages ?? 0} páginas</Text>{!status.ready && status.status !== "indexing" ? <PrimaryButton title={configuring ? "Iniciando…" : "Activar Biblioteca"} onPress={activate} disabled={configuring} /> : null}</Card> : null}

    {status?.ready ? <>
      <Card><Text style={styles.searchTitle}>¿Qué querés investigar hoy?</Text><TextInput value={query} onChangeText={setQuery} placeholder="Ej.: Lucas 7:11-17 y la viuda de Naín" placeholderTextColor="#70889F" multiline style={styles.input} /><Text style={styles.filterLabel}>Buscar en</Text><View style={styles.chips}>{categories.map((item) => <Pressable key={item.id} onPress={() => setCategory(item.id)} style={[styles.chip, category === item.id && styles.chipSelected]}><Text style={[styles.chipText, category === item.id && styles.chipTextSelected]}>{item.label}</Text></Pressable>)}</View></Card>
      <PrimaryButton title={searching ? "Buscando en las fuentes…" : "Buscar en mi biblioteca"} onPress={search} disabled={searching} />
      {searching ? <Card><ActivityIndicator color={theme.colors.gold} /><Text style={styles.center}>Buscando fragmentos y construyendo una síntesis documentada…</Text></Card> : null}
      {result ? <><SearchResult result={result} onOpen={openSource} /><ResultActions title={`Biblioteca: ${query}`} content={`${result.answer}\n\nUSO PASTORAL\n${result.pastoralUse}\n\nFUENTES\n${result.sources.map((source, i) => `[${i + 1}] ${source.title} — ${source.pageLabel}`).join("\n")}`} type="biblioteca" topic={query} context={{ query, category, sources: result.sources }} /></> : null}
      {status.catalog?.length ? <Card><Text style={styles.searchTitle}>Fuentes disponibles</Text>{status.catalog.map((item: any) => <View key={item.filename} style={styles.catalogRow}><Text style={styles.catalogTitle}>{item.title}</Text><Text style={styles.catalogMeta}>{item.categoryLabel} · {item.pdfPages} páginas</Text></View>)}</Card> : null}
    </> : null}
  </Page>;
}

function SearchResult({ result, onOpen }: { result: LibrarySearchResult; onOpen: (source: LibrarySource) => void }) {
  return <View><Text style={styles.sectionEyebrow}>SÍNTESIS DOCUMENTAL</Text><Card style={styles.answerCard}><Text style={styles.evidence}>{result.evidenceLevel === "alta" ? "Evidencia directa" : result.evidenceLevel === "media" ? "Evidencia parcial" : "Evidencia limitada"}</Text><Text style={styles.answer}>{result.answer}</Text></Card><Card style={styles.pastoral}><Text style={styles.sectionEyebrow}>✨ USO PASTORAL</Text><Text style={styles.answer}>{result.pastoralUse}</Text></Card><Text style={styles.searchTitle}>Abrí las fuentes que sostienen la respuesta</Text>{result.sources.map((source, i) => <Pressable key={source.id} onPress={() => onOpen(source)} style={({ pressed }) => [styles.source, pressed && { opacity: 0.75 }]}><View style={styles.sourceNumber}><Text style={styles.sourceNumberText}>{i + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.sourceTitle}>{source.title}</Text><Text style={styles.sourceMeta}>{source.categoryLabel} · {source.pageLabel}</Text><Text style={styles.excerpt}>{source.excerpt}</Text><Text style={styles.open}>Leer página completa →</Text></View></Pressable>)}</View>;
}

function SourceReader({ initial, onBack }: { initial: LibrarySourcePage; onBack: () => void }) {
  const [source, setSource] = useState(initial);
  const [loading, setLoading] = useState(false);
  const load = async (page: number) => { setLoading(true); try { setSource(await api.librarySourcePage(source.filename, page)); } finally { setLoading(false); } };
  return <Page onBack={onBack} eyebrow="Fuente original" title={source.title || source.filename}><Card><Text style={styles.statusText}>PDF pág. {source.currentPage}{source.totalPages ? ` de ${source.totalPages}` : ""}</Text><Text style={styles.reader}>{source.content || source.text || "Sin texto disponible."}</Text></Card><View style={styles.readerNav}><Pressable disabled={source.currentPage <= 1 || loading} onPress={() => load(source.currentPage - 1)} style={styles.readerButton}><Text style={styles.readerButtonText}>← Anterior</Text></Pressable><Pressable disabled={loading || (source.totalPages ? source.currentPage >= source.totalPages : false)} onPress={() => load(source.currentPage + 1)} style={styles.readerButton}><Text style={styles.readerButtonText}>Siguiente →</Text></Pressable></View></Page>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: "#0D2941", borderRadius: 25, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: theme.colors.borderGold }, heroEyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, heroTitle: { color: theme.colors.ink, fontSize: 27, lineHeight: 32, fontWeight: "900", marginTop: 8 }, heroText: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, center: { color: theme.colors.muted, textAlign: "center", marginTop: 10 }, errorCard: { borderColor: theme.colors.danger }, error: { color: theme.colors.ink, lineHeight: 21 }, statusTitle: { color: theme.colors.goldBright, fontSize: 17, fontWeight: "900" }, statusText: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 5, marginBottom: 12 }, searchTitle: { color: theme.colors.ink, fontSize: 20, fontWeight: "900", marginBottom: 12 }, input: { minHeight: 96, backgroundColor: "#071D31", borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 13, color: theme.colors.ink, fontSize: 15, lineHeight: 21, textAlignVertical: "top" }, filterLabel: { color: theme.colors.muted, fontSize: 12, fontWeight: "800", marginTop: 15, marginBottom: 8 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, chip: { borderRadius: 999, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: theme.colors.surfaceWarm }, chipSelected: { backgroundColor: theme.colors.gold, borderColor: theme.colors.gold }, chipText: { color: theme.colors.ink, fontSize: 12, fontWeight: "800" }, chipTextSelected: { color: theme.colors.navy }, sectionEyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.1, marginBottom: 8 }, answerCard: { backgroundColor: "#0B2238", borderColor: theme.colors.borderGold }, pastoral: { backgroundColor: "#0D2941" }, evidence: { alignSelf: "flex-start", color: theme.colors.goldBright, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 10, fontWeight: "900", marginBottom: 12 }, answer: { color: theme.colors.ink, fontSize: 15, lineHeight: 24 }, source: { flexDirection: "row", backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 15, marginBottom: 12 }, sourceNumber: { width: 34, height: 34, borderRadius: 12, backgroundColor: theme.colors.gold, alignItems: "center", justifyContent: "center", marginRight: 11 }, sourceNumberText: { color: theme.colors.navy, fontWeight: "900" }, sourceTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "900" }, sourceMeta: { color: theme.colors.gold, fontSize: 11, marginTop: 3 }, excerpt: { color: theme.colors.muted, fontSize: 12, lineHeight: 18, marginTop: 9 }, open: { color: theme.colors.goldBright, fontSize: 12, fontWeight: "900", marginTop: 9 }, catalogRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border }, catalogTitle: { color: theme.colors.ink, fontSize: 13, fontWeight: "900" }, catalogMeta: { color: theme.colors.muted, fontSize: 11, marginTop: 3 }, reader: { color: theme.colors.ink, fontSize: 15, lineHeight: 25 }, readerNav: { flexDirection: "row", justifyContent: "space-between", gap: 10 }, readerButton: { flex: 1, minHeight: 48, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 14, alignItems: "center", justifyContent: "center" }, readerButtonText: { color: theme.colors.goldBright, fontWeight: "900" } });
