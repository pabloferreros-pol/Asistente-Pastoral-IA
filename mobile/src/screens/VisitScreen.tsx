import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Card, Field, MultiChips, Page, PrimaryButton, ResultBox, SectionIntro } from "../components/UI";
import { theme } from "../theme";

const SITUATIONS = ["Duelo", "Enfermedad", "Familia", "Matrimonio", "Jóvenes", "Crisis espiritual", "Persona alejada", "Bautismo"];
const NEEDS = ["Preparar la visita", "Qué decir", "Qué evitar", "Textos bíblicos", "Oración", "Reflexión breve"];

export function VisitScreen({ onBack }: { onBack: () => void }) {
  const [situations, setSituations] = useState<string[]>(["Duelo"]);
  const [details, setDetails] = useState("");
  const [needs, setNeeds] = useState<string[]>(["Preparar la visita"]);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!situations.length) return setError("Seleccioná al menos una situación.");
    if (!details.trim()) return setError("Contame brevemente la situación.");
    if (!needs.length) return setError("Seleccioná al menos una necesidad.");
    setLoading(true); setError(""); setResult("");
    try { const data = await api.visit({ situations, details, needs }); setResult(data.result); }
    catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setLoading(false); }
  };

  return <Page onBack={onBack} eyebrow="Acompañamiento" title="Preparame para una visita">
    <View style={styles.hero}><Text style={styles.badge}>🤝 VISITA PASTORAL</Text><Text style={styles.heroTitle}>Una guía sensible, concreta y lista para usar</Text><Text style={styles.heroText}>Prepará mejor el momento: qué observar, qué decir, qué evitar, qué texto usar y cómo cerrar en oración.</Text></View>
    <SectionIntro text="Combiná varias situaciones y necesidades. La respuesta se adapta al caso real." />
    <Card>
      <Text style={styles.section}>1. Comprendé el caso</Text>
      <MultiChips label="¿Qué situación estás acompañando?" helper="Podés marcar más de una." options={SITUATIONS} values={situations} onChange={setSituations} />
      <Field label="¿Qué está pasando?" value={details} onChangeText={setDetails} placeholder="Ej.: Está internado, la familia está angustiada..." multiline />
      <Text style={styles.section}>2. Definí lo que necesitás</Text>
      <MultiChips label="¿Qué querés que te prepare la app?" options={NEEDS} values={needs} onChange={setNeeds} />
    </Card>
    <PrimaryButton title={loading ? "Preparando guía pastoral…" : "Preparar visita"} onPress={submit} disabled={loading} />
    <ResultBox loading={loading} error={error} result={result} />
  </Page>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: "#0B2944", borderRadius: 24, padding: 20, marginBottom: 18 }, badge: { color: theme.colors.goldBright, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, heroTitle: { color: "#FFFFFF", fontSize: 26, lineHeight: 31, fontWeight: "900", marginTop: 8 }, heroText: { color: "#B6C6D6", fontSize: 14, lineHeight: 21, marginTop: 8 }, section: { color: theme.colors.gold, fontSize: 12, fontWeight: "900", letterSpacing: 1, marginBottom: 12 } });
