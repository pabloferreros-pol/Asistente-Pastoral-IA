import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Card, Chips, Field, Page, PrimaryButton, ResultBox, SectionIntro } from "../components/UI";
import { theme } from "../theme";

export function BiblicalWorldScreen({ onBack }: { onBack: () => void }) {
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("Comprender el pasaje");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!query.trim()) return setError("Escribí un pasaje o una costumbre.");
    setLoading(true); setError(""); setResult("");
    try { const data = await api.biblicalWorld({ query, focus }); setResult(data.result); }
    catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setLoading(false); }
  };

  return <Page onBack={onBack} eyebrow="Contexto" title="Mundo bíblico">
    <View style={styles.hero}>
      <Text style={styles.eyebrow}>🏺 COSTUMBRES Y CONTEXTO</Text>
      <Text style={styles.title}>Leé el pasaje con otros ojos</Text>
      <Text style={styles.text}>Cultura, geografía, vida cotidiana, costumbres y símbolos para comprender mejor lo que el texto comunica.</Text>
      <View style={styles.row}><Mini icon="🏠" title="Vida diaria" /><Mini icon="🗺️" title="Geografía" /><Mini icon="👨‍👩‍👧" title="Sociedad" /></View>
    </View>
    <SectionIntro text="Preguntá por un pasaje, una costumbre o un elemento concreto y recibí una explicación con enfoque pastoral." />
    <Card><Field label="Pasaje, tema o costumbre" value={query} onChangeText={setQuery} placeholder="Ej.: Lucas 15:11-32 / anillo / funerales / sinagoga" multiline /><Chips label="Enfoque" options={["Comprender el pasaje", "Predicación", "Costumbres", "Contexto social", "Geografía"]} value={focus} onChange={setFocus} /></Card>
    <PrimaryButton title={loading ? "Investigando contexto…" : "Investigar contexto"} onPress={submit} disabled={loading} />
    <ResultBox loading={loading} error={error} result={result} />
  </Page>;
}

function Mini({ icon, title }: { icon: string; title: string }) { return <View style={styles.mini}><Text style={styles.miniIcon}>{icon}</Text><Text style={styles.miniTitle}>{title}</Text></View>; }
const styles = StyleSheet.create({ hero: { backgroundColor: "#0D2941", borderRadius: 24, borderWidth: 1, borderColor: "#294A66", padding: 20, marginBottom: 18 }, eyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, title: { color: theme.colors.ink, fontSize: 26, lineHeight: 30, fontWeight: "900", marginTop: 8 }, text: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 15 }, mini: { backgroundColor: "#112F4B", borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 }, miniIcon: { fontSize: 20 }, miniTitle: { color: theme.colors.ink, fontSize: 12, fontWeight: "900", marginTop: 7 } });
