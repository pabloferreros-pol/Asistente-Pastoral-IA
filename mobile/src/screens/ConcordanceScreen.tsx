import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Card, Chips, Field, Page, PrimaryButton, ResultBox, SectionIntro } from "../components/UI";
import { theme } from "../theme";

const examples = ["perdón", "ansiedad", "sábado", "esperanza", "segunda venida"];

export function ConcordanceScreen({ onBack }: { onBack: () => void }) {
  const [topic, setTopic] = useState("");
  const [use, setUse] = useState("Predicación");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!topic.trim()) return setError("Escribí un tema para buscar.");
    setLoading(true); setError(""); setResult("");
    try { const data = await api.concordance({ topic, use }); setResult(data.result); }
    catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setLoading(false); }
  };

  return <Page onBack={onBack} eyebrow="Biblia" title="Concordancia temática">
    <View style={styles.hero}><Text style={styles.eyebrow}>📖 BÚSQUEDA TEMÁTICA</Text><Text style={styles.title}>Textos conectados alrededor de una misma idea</Text><Text style={styles.text}>Encontrá pasajes relacionados, conexiones doctrinales y líneas de aplicación en segundos.</Text><View style={styles.examples}>{examples.map((x) => <View key={x} style={styles.chip}><Text style={styles.chipText}>{x}</Text></View>)}</View></View>
    <SectionIntro text="Ideal para predicación, visitas, evangelismo o investigación pastoral." />
    <Card><Field label="Tema" value={topic} onChangeText={setTopic} placeholder="Ej.: perdón, ansiedad, sábado, segunda venida" /><Chips label="¿Para qué lo necesitás?" options={["Predicación", "Visita pastoral", "Jóvenes", "Evangelismo", "Estudio personal"]} value={use} onChange={setUse} /></Card>
    <PrimaryButton title={loading ? "Buscando textos…" : "Buscar en la Biblia"} onPress={submit} disabled={loading} />
    <ResultBox loading={loading} error={error} result={result} />
  </Page>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: "#0D2941", borderRadius: 24, borderWidth: 1, borderColor: "#294A66", padding: 20, marginBottom: 18 }, eyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, title: { color: theme.colors.ink, fontSize: 26, lineHeight: 30, fontWeight: "900", marginTop: 8 }, text: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 }, examples: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 }, chip: { backgroundColor: "#112F4B", borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 }, chipText: { color: theme.colors.goldBright, fontSize: 12, fontWeight: "800" } });
