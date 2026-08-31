import React, { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { theme } from "../theme";

export function ResultActions({ title, content, type, topic, context, allowSave = true }: { title: string; content: string; type: string; topic?: string; context?: any; allowSave?: boolean }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const exportFile = async (format: "pdf" | "word") => {
    setBusy(format); setError("");
    try { const file = await api.exportDocument(format, title, content); await Linking.openURL(file.url); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude generar el archivo."); }
    finally { setBusy(""); }
  };

  const whatsapp = async () => {
    setBusy("whatsapp"); setError("");
    try { await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(`${title}\n\n${content}`)}`); }
    catch { setError("No pude abrir WhatsApp en este dispositivo."); }
    finally { setBusy(""); }
  };

  const save = async () => {
    setBusy("save"); setError("");
    try { await api.saveMaterial({ type, title, topic, content, context }); Alert.alert("Guardado", "El contenido quedó guardado en Mis materiales."); }
    catch (e) { setError(e instanceof Error ? e.message : "No pude guardar el material."); }
    finally { setBusy(""); }
  };

  if (!content.trim()) return null;
  return <View style={styles.wrap}><Text style={styles.title}>Guardá o compartí esta respuesta</Text><View style={styles.grid}><Action icon="📕" label="PDF" busy={busy === "pdf"} onPress={() => exportFile("pdf")} /><Action icon="📄" label="Word" busy={busy === "word"} onPress={() => exportFile("word")} /><Action icon="💬" label="WhatsApp" busy={busy === "whatsapp"} onPress={whatsapp} />{allowSave ? <Action icon="💾" label="Mis materiales" busy={busy === "save"} onPress={save} /> : null}</View>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}

function Action({ icon, label, busy, onPress }: { icon: string; label: string; busy: boolean; onPress: () => void }) { return <Pressable disabled={busy} onPress={onPress} style={({ pressed }) => [styles.action, pressed && { opacity: 0.75 }, busy && { opacity: 0.5 }]}><Text style={styles.icon}>{icon}</Text><Text style={styles.label}>{busy ? "Preparando…" : label}</Text></Pressable>; }

const styles = StyleSheet.create({ wrap: { marginTop: 8, marginBottom: 22 }, title: { color: "#FFFFFF", fontSize: 21, lineHeight: 26, fontWeight: "900", marginBottom: 12 }, grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }, action: { width: "48.5%", minHeight: 88, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 18, padding: 14, marginBottom: 11, justifyContent: "center" }, icon: { fontSize: 25, marginBottom: 8 }, label: { color: theme.colors.ink, fontSize: 15, fontWeight: "900" }, error: { color: theme.colors.danger, fontSize: 14, lineHeight: 20, marginTop: 4 } });
