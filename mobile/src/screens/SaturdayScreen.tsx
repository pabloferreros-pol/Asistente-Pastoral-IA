import React, { useEffect, useState } from "react";
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { api, LibrarySource, SaturdayPath, SermonData } from "../api/client";
import { Card, Chips, Field, Page, PrimaryButton, ResultBox, SectionIntro } from "../components/UI";
import { theme } from "../theme";

type ActionResult = { title: string; text: string };

export function SaturdayScreen({ onBack }: { onBack: () => void }) {
  const [event, setEvent] = useState("Iglesia local");
  const [audience, setAudience] = useState("Mixta");
  const [people, setPeople] = useState("80");
  const [duration, setDuration] = useState("25");
  const [goal, setGoal] = useState("Inspirar");
  const [topic, setTopic] = useState("");
  const [baseText, setBaseText] = useState("");
  const [paths, setPaths] = useState<SaturdayPath[]>([]);
  const [selected, setSelected] = useState<SaturdayPath | null>(null);
  const [recommendation, setRecommendation] = useState("");
  const [sermon, setSermon] = useState<SermonData | null>(null);
  const [ideaSources, setIdeaSources] = useState<LibrarySource[]>([]);
  const [sermonSources, setSermonSources] = useState<LibrarySource[]>([]);
  const [libraryReady, setLibraryReady] = useState(false);
  const [useLibrary, setUseLibrary] = useState(true);
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingSermon, setLoadingSermon] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [sermonError, setSermonError] = useState("");
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  useEffect(() => {
    api.libraryStatus().then((status) => {
      setLibraryReady(Boolean(status.ready));
      if (!status.ready) setUseLibrary(false);
    }).catch(() => { setLibraryReady(false); setUseLibrary(false); });
  }, []);

  const context = { event, audience, people, duration, goal, topic, baseText, useLibrary: libraryReady && useLibrary };

  const submitIdeas = async () => {
    if (!topic.trim()) return setError("Escribí primero el tema que querés trabajar.");
    setLoadingIdeas(true); setError(""); setPaths([]); setSelected(null); setSermon(null); setIdeaSources([]); setActionResult(null);
    try {
      const data = await api.saturdayIdeas(context);
      setPaths(data.paths || []); setRecommendation(data.recommendation || ""); setIdeaSources(data.sources || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setLoadingIdeas(false); }
  };

  const developSelected = async () => {
    if (!selected) return;
    setLoadingSermon(true); setSermonError(""); setSermon(null); setSermonSources([]);
    try {
      const data = await api.developSermon({ context, selectedPath: selected });
      setSermon(data.sermon); setSermonSources(data.sources || []);
    } catch (e) { setSermonError(e instanceof Error ? e.message : "No pude desarrollar el sermón."); }
    finally { setLoadingSermon(false); }
  };

  const sermonContext = { ...context, libraryUsed: sermonSources.length > 0, librarySources: sermonSources };

  const saveSermon = async () => {
    if (!sermon) return;
    setBusyAction("save");
    try { await api.saveMaterial({ type: "sermon", title: sermon.title, topic, sermon, context: sermonContext }); Alert.alert("Guardado", "El sermón quedó guardado en Mis materiales."); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude guardar el sermón."); }
    finally { setBusyAction(""); }
  };

  const transform = async (type: "outline" | "whatsapp" | "reel", title: string, shareNow = false) => {
    if (!sermon) return;
    setBusyAction(type); setActionResult(null);
    try { const data = await api.transformSermon(type, sermon, sermonContext); setActionResult({ title, text: data.result }); if (shareNow) await Share.share({ title, message: data.result }); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude transformar el sermón."); }
    finally { setBusyAction(""); }
  };

  const exportFile = async (format: "word" | "ppt") => {
    if (!sermon) return;
    setBusyAction(format);
    try { const data = await api.exportSermon(format, sermon, sermonContext); await Linking.openURL(data.url); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude abrir el archivo generado."); }
    finally { setBusyAction(""); }
  };

  return <Page onBack={onBack} eyebrow="Predicación" title="Preparame para este sábado">
    <View style={styles.hero}><Text style={styles.heroEyebrow}>🔥 PREPARACIÓN INTELIGENTE</Text><Text style={styles.heroTitle}>Del tema al sermón, con investigación y dirección pastoral</Text><Text style={styles.heroText}>Primero elegimos el mejor camino bíblico. Después desarrollamos el mensaje completo.</Text><View style={styles.steps}><Step n="1" label="Contexto" /><Text style={styles.line}>—</Text><Step n="2" label="Caminos" /><Text style={styles.line}>—</Text><Step n="3" label="Sermón" /></View></View>
    <SectionIntro text="Definí dónde, a quién y para qué vas a predicar. La app te propone tres caminos antes de escribir el sermón." />

    <Card style={styles.libraryCard}><Text style={styles.libraryEyebrow}>📚 BIBLIOTECA INTELIGENTE</Text><Text style={styles.libraryTitle}>Que el sermón nazca de tus fuentes</Text><Text style={styles.libraryText}>{libraryReady ? "La biblioteca está lista para enriquecer la preparación." : "La preparación funciona con IA; la biblioteca se usará cuando esté disponible."}</Text>{libraryReady ? <Pressable onPress={() => setUseLibrary(!useLibrary)} style={[styles.toggle, useLibrary && styles.toggleOn]}><Text style={[styles.toggleText, useLibrary && styles.toggleTextOn]}>{useLibrary ? "✓ Investigar con mi Biblioteca" : "Investigar con mi Biblioteca"}</Text></Pressable> : null}</Card>

    <Card><Chips label="¿Dónde vas a predicar?" options={["Iglesia local", "Jóvenes", "Campaña", "Retiro", "Bautismo", "Otro"]} value={event} onChange={setEvent} /><Chips label="Audiencia predominante" options={["Mixta", "Jóvenes", "Adultos", "Familias", "No adventistas", "Adventistas"]} value={audience} onChange={setAudience} /><Field label="Cantidad aproximada de personas" value={people} onChangeText={setPeople} placeholder="80" /><Chips label="Duración" options={["15", "20", "25", "30", "40", "50"]} value={duration} onChange={setDuration} /><Chips label="¿Qué querés lograr?" options={["Inspirar", "Enseñar", "Evangelizar", "Decisión", "Consolar", "Desafiar"]} value={goal} onChange={setGoal} /><Field label="Tema" value={topic} onChangeText={setTopic} placeholder="Ej.: Esperanza cuando Dios parece guardar silencio" multiline /><Field label="Texto bíblico base (opcional)" value={baseText} onChangeText={setBaseText} placeholder="Ej.: Marcos 4:35-41" /></Card>
    <PrimaryButton title={loadingIdeas ? "Buscando caminos…" : "Dame 3 caminos posibles"} onPress={submitIdeas} disabled={loadingIdeas} />
    {error ? <ResultBox loading={false} error={error} /> : null}

    {paths.length ? <View style={styles.paths}><Text style={styles.sectionEyebrow}>TRES CAMINOS PARA ELEGIR</Text>{paths.map((path) => { const active = selected?.id === path.id; return <Pressable key={path.id} onPress={() => { setSelected(path); setSermon(null); setSermonError(""); }} style={[styles.path, active && styles.pathSelected]}><Text style={styles.pathNumber}>CAMINO {path.id}</Text><Text style={styles.pathTitle}>{path.title}</Text><Text style={styles.pathRef}>📖 {path.text}</Text><Text style={styles.label}>HOOK</Text><Text style={styles.body}>{path.hook}</Text><Text style={styles.label}>IDEA CENTRAL</Text><Text style={styles.body}>{path.centralIdea}</Text><Text style={styles.label}>ESTRUCTURA</Text>{path.structure.map((x, i) => <Text key={i} style={styles.body}>{i + 1}. {x}</Text>)}<Text style={styles.why}>{path.whyItFits}</Text><Text style={styles.choose}>{active ? "✓ Camino elegido" : "Elegir este camino"}</Text></Pressable>; })}{recommendation ? <Card style={styles.recommendation}><Text style={styles.label}>💡 RECOMENDACIÓN DE LA IA</Text><Text style={styles.body}>{recommendation}</Text></Card> : null}</View> : null}

    {ideaSources.length ? <Sources title="Fuentes usadas para proponer los caminos" sources={ideaSources} /> : null}

    {selected && !sermon ? <Card style={styles.develop}><Text style={styles.developTitle}>Vas a desarrollar: {selected.title}</Text><PrimaryButton title={loadingSermon ? "Desarrollando sermón…" : "Desarrollar este sermón"} onPress={developSelected} disabled={loadingSermon} />{sermonError ? <Text style={styles.error}>{sermonError}</Text> : null}</Card> : null}

    {sermon ? <View style={styles.sermon}><View style={styles.finalHero}><Text style={styles.heroEyebrow}>SERMÓN DESARROLLADO</Text><Text style={styles.finalTitle}>{sermon.title}</Text><Text style={styles.pathRef}>📖 {sermon.mainText}</Text></View><SermonSection title="IDEA CENTRAL" text={sermon.centralIdea} /><SermonSection title="HOOK" text={sermon.hook} /><SermonSection title="INTRODUCCIÓN" text={sermon.introduction} /><SermonSection title="CONTEXTO BÍBLICO" text={sermon.context} />{sermon.movements.map((m, i) => <Card key={i}><Text style={styles.pathNumber}>MOVIMIENTO {i + 1}</Text><Text style={styles.pathTitle}>{m.title}</Text><Text style={styles.label}>EXPLICACIÓN</Text><Text style={styles.body}>{m.explanation}</Text><Text style={styles.label}>VERDAD CENTRAL</Text><Text style={styles.body}>{m.truth}</Text><Text style={styles.label}>APLICACIÓN</Text><Text style={styles.body}>{m.application}</Text></Card>)}<SermonSection title="ILUSTRACIÓN" text={sermon.illustration} /><Card><Text style={styles.label}>APLICACIONES CONCRETAS</Text>{sermon.applications.map((x, i) => <Text key={i} style={styles.body}>{i + 1}. {x}</Text>)}</Card><SermonSection title="LLAMADO" text={sermon.call} /><SermonSection title="ORACIÓN FINAL" text={sermon.finalPrayer} /><Card><Text style={styles.label}>RESUMEN PARA EL PREDICADOR</Text>{sermon.preacherSummary.map((x, i) => <Text key={i} style={styles.body}>• {x}</Text>)}</Card>{sermonSources.length ? <Sources title="Fuentes consultadas para este sermón" sources={sermonSources} /> : null}<Text style={styles.toolsTitle}>Ahora transformalo</Text><View style={styles.tools}><Tool icon="💾" title="Guardar" busy={busyAction === "save"} onPress={saveSermon} /><Tool icon="📄" title="Word" busy={busyAction === "word"} onPress={() => exportFile("word")} /><Tool icon="🖥️" title="PPT" busy={busyAction === "ppt"} onPress={() => exportFile("ppt")} /><Tool icon="📝" title="Bosquejo" busy={busyAction === "outline"} onPress={() => transform("outline", "Bosquejo del sermón")} /><Tool icon="📱" title="WhatsApp" busy={busyAction === "whatsapp"} onPress={() => transform("whatsapp", "Resumen para WhatsApp", true)} /><Tool icon="🎥" title="Reel" busy={busyAction === "reel"} onPress={() => transform("reel", "Guion para Reel")} /></View></View> : null}

    {actionResult ? <Card><Text style={styles.pathTitle}>{actionResult.title}</Text><Text style={styles.body}>{actionResult.text}</Text><Pressable onPress={() => Share.share({ title: actionResult.title, message: actionResult.text })}><Text style={styles.choose}>Compartir</Text></Pressable></Card> : null}
  </Page>;
}

function Step({ n, label }: { n: string; label: string }) { return <View style={styles.step}><Text style={styles.stepN}>{n}</Text><Text style={styles.stepText}>{label}</Text></View>; }
function SermonSection({ title, text }: { title: string; text: string }) { return <Card><Text style={styles.label}>{title}</Text><Text style={styles.body}>{text}</Text></Card>; }
function Sources({ title, sources }: { title: string; sources: LibrarySource[] }) { return <Card><Text style={styles.label}>INVESTIGACIÓN DOCUMENTAL</Text><Text style={styles.pathTitle}>{title}</Text>{sources.map((s, i) => <View key={`${s.id}-${i}`} style={styles.source}><Text style={styles.sourceN}>[{i + 1}]</Text><View style={{ flex: 1 }}><Text style={styles.sourceTitle}>{s.title}</Text><Text style={styles.sourceMeta}>{s.pageLabel}</Text></View></View>)}</Card>; }
function Tool({ icon, title, onPress, busy }: { icon: string; title: string; onPress: () => void; busy?: boolean }) { return <Pressable onPress={onPress} disabled={busy} style={({ pressed }) => [styles.tool, pressed && { opacity: 0.8 }, busy && { opacity: 0.5 }]}><Text style={styles.toolIcon}>{icon}</Text><Text style={styles.toolText}>{busy ? "Preparando…" : title}</Text></Pressable>; }

const styles = StyleSheet.create({ hero: { backgroundColor: "#0B2944", borderRadius: 25, padding: 20, marginBottom: 18, borderWidth: 1, borderColor: theme.colors.borderGold }, heroEyebrow: { color: theme.colors.goldBright, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, heroTitle: { color: "#FFFFFF", fontSize: 27, lineHeight: 32, fontWeight: "900", marginTop: 8 }, heroText: { color: "#C2D0DC", fontSize: 14, lineHeight: 21, marginTop: 8 }, steps: { flexDirection: "row", alignItems: "center", marginTop: 18 }, step: { alignItems: "center" }, stepN: { width: 28, height: 28, textAlign: "center", textAlignVertical: "center", borderRadius: 14, overflow: "hidden", backgroundColor: theme.colors.gold, color: theme.colors.navy, fontWeight: "900" }, stepText: { color: "#FFFFFF", fontSize: 10, marginTop: 5 }, line: { color: theme.colors.gold, marginHorizontal: 8 }, libraryCard: { backgroundColor: "#0D2941", borderColor: "#294A66" }, libraryEyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900" }, libraryTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: "900", marginTop: 5 }, libraryText: { color: theme.colors.muted, fontSize: 13, lineHeight: 20, marginTop: 9 }, toggle: { minHeight: 44, borderWidth: 1, borderColor: theme.colors.gold, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 13 }, toggleOn: { backgroundColor: theme.colors.gold }, toggleText: { color: theme.colors.gold, fontWeight: "900" }, toggleTextOn: { color: theme.colors.navy }, paths: { marginTop: 8 }, sectionEyebrow: { color: theme.colors.gold, fontWeight: "900", fontSize: 11, letterSpacing: 1.1, marginBottom: 10 }, path: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, padding: 18, marginBottom: 14 }, pathSelected: { borderColor: theme.colors.gold, borderWidth: 2 }, pathNumber: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1 }, pathTitle: { color: theme.colors.ink, fontSize: 19, lineHeight: 24, fontWeight: "900", marginTop: 5 }, pathRef: { color: theme.colors.goldBright, fontSize: 13, fontWeight: "800", marginTop: 5, marginBottom: 10 }, label: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1, marginTop: 8, marginBottom: 5 }, body: { color: theme.colors.ink, fontSize: 15, lineHeight: 23, marginBottom: 5 }, why: { color: theme.colors.muted, fontSize: 13, lineHeight: 20, fontStyle: "italic", marginVertical: 12 }, choose: { color: theme.colors.goldBright, fontSize: 14, fontWeight: "900", marginTop: 10 }, recommendation: { backgroundColor: "#172B3D" }, develop: { borderColor: theme.colors.gold }, developTitle: { color: theme.colors.ink, fontSize: 18, fontWeight: "900", marginBottom: 12 }, error: { color: theme.colors.danger, fontSize: 13, lineHeight: 19 }, sermon: { marginTop: 14 }, finalHero: { backgroundColor: "#08223A", borderRadius: 24, padding: 20, marginBottom: 16 }, finalTitle: { color: "#FFFFFF", fontSize: 28, lineHeight: 33, fontWeight: "900", marginTop: 7 }, toolsTitle: { color: theme.colors.ink, fontSize: 24, fontWeight: "900", marginTop: 8, marginBottom: 12 }, tools: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 16 }, tool: { width: "48%", minHeight: 96, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, padding: 15, marginBottom: 11 }, toolIcon: { fontSize: 24, marginBottom: 10 }, toolText: { color: theme.colors.ink, fontSize: 14, fontWeight: "900" }, source: { flexDirection: "row", paddingVertical: 9, borderTopWidth: 1, borderTopColor: theme.colors.border }, sourceN: { width: 34, color: theme.colors.gold, fontWeight: "900" }, sourceTitle: { color: theme.colors.ink, fontSize: 13, fontWeight: "900" }, sourceMeta: { color: theme.colors.muted, fontSize: 11, marginTop: 3 } });
