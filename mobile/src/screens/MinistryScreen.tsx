import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { Card, Chips, Field, Page, PrimaryButton, ResultBox, SectionIntro } from "../components/UI";
import { theme } from "../theme";
import { ResultActions } from "../components/ResultActions";

const quickAreas = ["Visita", "Duelo", "Enfermedad", "Familia", "Matrimonio", "Jóvenes", "Bautismo", "Santa Cena", "Crisis espiritual"];

export function MinistryScreen({ onBack }: { onBack: () => void }) {
  const [area, setArea] = useState("Duelo");
  const [request, setRequest] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!request.trim()) return setError("Escribí qué necesitás resolver.");
    setLoading(true); setError(""); setResult("");
    try { const data = await api.ministry({ area, request }); setResult(data.result); }
    catch (e) { setError(e instanceof Error ? e.message : "Ocurrió un error."); }
    finally { setLoading(false); }
  };

  return <Page onBack={onBack} eyebrow="Ministerio" title="Ministerio pastoral">
    <View style={styles.hero}><Text style={styles.eyebrow}>🛡️ CUIDADO PASTORAL</Text><Text style={styles.title}>Herramientas para casos reales del ministerio</Text><Text style={styles.text}>Situaciones delicadas, decisiones pastorales y acompañamiento espiritual con una respuesta clara y útil.</Text></View>
    <SectionIntro text="Elegí el área y describí lo que necesitás. La app busca devolverte una ayuda accionable, no una respuesta genérica." />
    <Card><Chips label="¿Sobre qué tema trabajamos?" options={quickAreas} value={area} onChange={setArea} /><Field label="¿Qué necesitás?" value={request} onChangeText={setRequest} placeholder="Describí la situación, el material o el problema que querés resolver." multiline /></Card>
    <PrimaryButton title={loading ? "Preparando ayuda pastoral…" : "Ayudarme con esto"} onPress={submit} disabled={loading} />
    <ResultBox loading={loading} error={error} result={result} />
    <ResultActions title={`Ministerio pastoral: ${area}`} content={result} type="ministerio" topic={area} context={{ area, request }} />
  </Page>;
}

const styles = StyleSheet.create({ hero: { backgroundColor: "#0D2941", borderRadius: 24, borderWidth: 1, borderColor: "#294A66", padding: 20, marginBottom: 18 }, eyebrow: { color: theme.colors.gold, fontSize: 11, fontWeight: "900", letterSpacing: 1.1 }, title: { color: theme.colors.ink, fontSize: 26, lineHeight: 30, fontWeight: "900", marginTop: 8 }, text: { color: theme.colors.muted, fontSize: 14, lineHeight: 21, marginTop: 8 } });
