import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { api, LibrarySource, MaterialItem, SermonData } from "../api/client";
import { Card, Page, SectionIntro } from "../components/UI";
import { theme } from "../theme";
import { ResultActions } from "../components/ResultActions";

type ActionResult = { title: string; text: string };

export function MaterialsScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState<MaterialItem | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  const load = async () => {
    setLoading(true); setError("");
    try { const data = await api.listMaterials(); setItems(data.items || []); }
    catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const remove = (item: MaterialItem) => Alert.alert("Eliminar material", `¿Querés eliminar \"${item.title}\"?`, [{ text: "Cancelar", style: "cancel" }, { text: "Eliminar", style: "destructive", onPress: async () => { try { await api.deleteMaterial(item.id); setOpened(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : "No pude eliminarlo."); } } }]);

  const exportFile = async (format: "word" | "ppt", sermon: SermonData, context?: any) => {
    setBusyAction(format); setError("");
    try { const data = await api.exportSermon(format, sermon, context); await Linking.openURL(data.url); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude abrir el archivo."); }
    finally { setBusyAction(""); }
  };

  const transform = async (type: "outline" | "whatsapp" | "reel", title: string, sermon: SermonData, context?: any, shareNow = false) => {
    setBusyAction(type); setActionResult(null); setError("");
    try { const data = await api.transformSermon(type, sermon, context); setActionResult({ title, text: data.result }); if (shareNow) await Share.share({ title, message: data.result }); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude preparar esa versión."); }
    finally { setBusyAction(""); }
  };

  if (opened?.sermon) return <OpenedSermon item={opened} onBack={() => { setOpened(null); setActionResult(null); }} onDelete={() => remove(opened)} onExport={exportFile} onTransform={transform} busyAction={busyAction} actionResult={actionResult} error={error} />;
  if (opened) return <Page onBack={() => setOpened(null)} eyebrow="Material guardado" title={opened.title}><Text style={styles.openedDate}>Guardado el {new Date(opened.createdAt).toLocaleDateString()}</Text>{opened.topic ? <Text style={styles.openedRef}>{opened.topic}</Text> : null}<Card><Text style={styles.body}>{opened.content || "Este material no contiene texto."}</Text></Card><ResultActions title={opened.title} content={opened.content || ""} type={opened.type} topic={opened.topic} context={opened.context} allowSave={false} /><Pressable onPress={() => remove(opened)} style={styles.delete}><Text style={styles.deleteText}>Eliminar este material</Text></Pressable></Page>;

  return <Page onBack={onBack} eyebrow="Archivo pastoral" title="Mis materiales">
    <View style={styles.hero}><Text style={styles.heroEyebrow}>🗂️ TU ARCHIVO PERSONAL</Text><Text style={styles.heroTitle}>Guardá una vez. Volvé a usarlo cuando quieras.</Text><Text style={styles.heroText}>Tus sermones preparados pueden volver a exportarse, resumirse o compartirse sin generarlos otra vez.</Text></View>
    <SectionIntro text="Acá aparecen sermones, visitas, investigaciones y respuestas que guardaste desde cualquier herramienta." />
    {loading ? <Card><Text style={styles.muted}>Cargando materiales…</Text></Card> : null}
    {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}
    {!loading && !items.length ? <Card style={styles.empty}><Text style={styles.emptyIcon}>🗂️</Text><Text style={styles.emptyTitle}>Todavía no guardaste materiales</Text><Text style={styles.emptyText}>Cuando guardes un sermón, aparecerá acá listo para reutilizar.</Text></Card> : null}
    {items.map((item) => <Pressable key={item.id} onPress={() => setOpened(item)} style={({ pressed }) => pressed ? { opacity: 0.75 } : undefined}><Card style={styles.item}><View style={styles.row}><View style={styles.icon}><Text style={{ fontSize: 22 }}>{item.sermon ? "🎙️" : "📝"}</Text></View><View style={{ flex: 1 }}><Text style={styles.title}>{item.title}</Text>{item.topic ? <Text style={styles.topic}>{item.topic}</Text> : null}{item.sermon?.mainText ? <Text style={styles.ref}>📖 {item.sermon.mainText}</Text> : null}<Text style={styles.date}>{new Date(item.createdAt).toLocaleDateString()}</Text></View><Text style={styles.arrow}>›</Text></View></Card></Pressable>)}
  </Page>;
}

function OpenedSermon({ item, onBack, onDelete, onExport, onTransform, busyAction, actionResult, error }: { item: MaterialItem; onBack: () => void; onDelete: () => void; onExport: (f: "word" | "ppt", s: SermonData, c?: any) => Promise<void>; onTransform: (t: "outline" | "whatsapp" | "reel", title: string, s: SermonData, c?: any, share?: boolean) => Promise<void>; busyAction: string; actionResult: ActionResult | null; error: string }) {
  const sermon = item.sermon as SermonData;
  const sources: LibrarySource[] = Array.isArray(item.context?.librarySources) ? item.context.librarySources : [];
  return <Page onBack={onBack} eyebrow="Sermón guardado" title={sermon.title}>
    <Text style={styles.openedDate}>Guardado el {new Date(item.createdAt).toLocaleDateString()}</Text><Text style={styles.openedRef}>📖 {sermon.mainText}</Text>
    {error ? <Card><Text style={styles.error}>{error}</Text></Card> : null}
    <S title="IDEA CENTRAL" text={sermon.centralIdea} /><S title="HOOK" text={sermon.hook} /><S title="INTRODUCCIÓN" text={sermon.introduction} /><S title="CONTEXTO BÍBLICO" text={sermon.context} />
    {sermon.movements.map((m, i) => <Card key={i}><Text style={styles.label}>MOVIMIENTO {i + 1}</Text><Text style={styles.movementTitle}>{m.title}</Text><Text style={styles.mini}>EXPLICACIÓN</Text><Text style={styles.body}>{m.explanation}</Text><Text style={styles.mini}>VERDAD CENTRAL</Text><Text style={styles.body}>{m.truth}</Text><Text style={styles.mini}>APLICACIÓN</Text><Text style={styles.body}>{m.application}</Text></Card>)}
    <S title="ILUSTRACIÓN" text={sermon.illustration} /><Card><Text style={styles.label}>APLICACIONES CONCRETAS</Text>{sermon.applications.map((x, i) => <Text key={i} style={styles.body}>{i + 1}. {x}</Text>)}</Card><S title="LLAMADO" text={sermon.call} /><S title="ORACIÓN FINAL" text={sermon.finalPrayer} />
    {sources.length ? <Card><Text style={styles.label}>FUENTES CONSULTADAS</Text>{sources.map((s, i) => <View key={`${s.id}-${i}`} style={styles.source}><Text style={styles.sourceN}>[{i + 1}]</Text><View><Text style={styles.sourceTitle}>{s.title}</Text><Text style={styles.sourceMeta}>{s.pageLabel}</Text></View></View>)}</Card> : null}
    <Text style={styles.toolsTitle}>Volvé a usar este sermón</Text><View style={styles.tools}><Tool icon="📄" title="Word" busy={busyAction === "word"} onPress={() => onExport("word", sermon, item.context)} /><Tool icon="🖥️" title="PPT" busy={busyAction === "ppt"} onPress={() => onExport("ppt", sermon, item.context)} /><Tool icon="📝" title="Bosquejo" busy={busyAction === "outline"} onPress={() => onTransform("outline", "Bosquejo del sermón", sermon, item.context)} /><Tool icon="📱" title="WhatsApp" busy={busyAction === "whatsapp"} onPress={() => onTransform("whatsapp", "Resumen para WhatsApp", sermon, item.context, true)} /><Tool icon="🎥" title="Reel" busy={busyAction === "reel"} onPress={() => onTransform("reel", "Guion para Reel", sermon, item.context)} /></View>
    <ResultActions title={sermon.title} content={sermonToText(sermon)} type="sermon" topic={item.topic} context={item.context} allowSave={false} />
    {actionResult ? <Card><Text style={styles.movementTitle}>{actionResult.title}</Text><Text style={styles.body}>{actionResult.text}</Text><Pressable onPress={() => Share.share({ title: actionResult.title, message: actionResult.text })}><Text style={styles.share}>Compartir</Text></Pressable></Card> : null}
    <Pressable onPress={onDelete} style={styles.delete}><Text style={styles.deleteText}>Eliminar este material</Text></Pressable>
  </Page>;
}
function S({ title, text }: { title: string; text: string }) { return <Card><Text style={styles.label}>{title}</Text><Text style={styles.body}>{text}</Text></Card>; }
function Tool({ icon, title, onPress, busy }: { icon: string; title: string; onPress: () => void; busy?: boolean }) { return <Pressable disabled={busy} onPress={onPress} style={[styles.tool, busy && { opacity: 0.5 }]}><Text style={styles.toolIcon}>{icon}</Text><Text style={styles.toolTitle}>{busy ? "Preparando…" : title}</Text></Pressable>; }
function sermonToText(sermon: SermonData) { return [`Texto principal: ${sermon.mainText}`, `Idea central: ${sermon.centralIdea}`, `Hook: ${sermon.hook}`, `Introducción\n${sermon.introduction}`, `Contexto bíblico\n${sermon.context}`, ...sermon.movements.map((m, i) => `${i + 1}. ${m.title}\nExplicación: ${m.explanation}\nVerdad central: ${m.truth}\nAplicación: ${m.application}`), `Ilustración\n${sermon.illustration}`, `Aplicaciones concretas\n${sermon.applications.map((x, i) => `${i + 1}. ${x}`).join("\n")}`, `Llamado\n${sermon.call}`, `Oración final\n${sermon.finalPrayer}`].join("\n\n"); }

const styles = StyleSheet.create({ hero: { backgroundColor: "#0D2941", borderRadius: 24, borderWidth: 1, borderColor: "#294A66", padding: 20, marginBottom: 18 }, heroEyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, heroTitle: { color: theme.colors.ink, fontSize: 26, lineHeight: 30, fontWeight: "900", marginTop: 8 }, heroText: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, muted: { color: theme.colors.muted }, error: { color: theme.colors.ink, lineHeight: 21 }, empty: { alignItems: "center", paddingVertical: 38 }, emptyIcon: { fontSize: 38 }, emptyTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: "900", marginTop: 12 }, emptyText: { color: theme.colors.muted, textAlign: "center", lineHeight: 21, marginTop: 7 }, item: { borderRadius: 20 }, row: { flexDirection: "row", alignItems: "center" }, icon: { width: 48, height: 48, borderRadius: 15, backgroundColor: theme.colors.surfaceWarm, alignItems: "center", justifyContent: "center", marginRight: 12 }, title: { color: theme.colors.ink, fontSize: 16, fontWeight: "900" }, topic: { color: theme.colors.muted, fontSize: 12, marginTop: 3 }, ref: { color: theme.colors.goldBright, fontSize: 12, fontWeight: "800", marginTop: 4 }, date: { color: theme.colors.gold, fontSize: 11, marginTop: 4 }, arrow: { color: theme.colors.gold, fontSize: 28 }, openedDate: { color: theme.colors.muted, fontSize: 12 }, openedRef: { color: theme.colors.goldBright, fontSize: 15, fontWeight: "800", marginTop: 5, marginBottom: 18 }, label: { color: theme.colors.gold, fontSize: 11, letterSpacing: 1.1, fontWeight: "900", marginBottom: 8 }, body: { color: theme.colors.ink, fontSize: 15, lineHeight: 24, marginBottom: 5 }, movementTitle: { color: theme.colors.ink, fontSize: 20, lineHeight: 25, fontWeight: "900", marginBottom: 12 }, mini: { color: theme.colors.goldBright, fontSize: 10, fontWeight: "900", marginTop: 7, marginBottom: 4 }, toolsTitle: { color: theme.colors.ink, fontSize: 24, fontWeight: "900", marginTop: 8, marginBottom: 12 }, tools: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, tool: { width: "48%", minHeight: 92, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 15, marginBottom: 11 }, toolIcon: { fontSize: 24, marginBottom: 10 }, toolTitle: { color: theme.colors.ink, fontSize: 14, fontWeight: "900" }, share: { color: theme.colors.goldBright, fontWeight: "900", marginTop: 10 }, delete: { alignSelf: "center", padding: 14, marginBottom: 20 }, deleteText: { color: theme.colors.danger, fontWeight: "900" }, source: { flexDirection: "row", paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border }, sourceN: { width: 34, color: theme.colors.gold, fontWeight: "900" }, sourceTitle: { color: theme.colors.ink, fontSize: 13, fontWeight: "900" }, sourceMeta: { color: theme.colors.muted, fontSize: 11, marginTop: 3 } });
