import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Page } from "../components/UI";
import { ScreenKey } from "../types";
import { theme } from "../theme";

const tools: { key: ScreenKey; icon: string; title: string; subtitle: string }[] = [
  { key: "visit", icon: "🤝", title: "Preparame para una visita", subtitle: "Guía sensible y práctica" },
  { key: "ministry", icon: "🛡️", title: "Ministerio pastoral", subtitle: "Duelo, familia, jóvenes y más" },
  { key: "concordance", icon: "🔎", title: "Concordancia temática", subtitle: "Encontrá textos por tema" },
  { key: "biblicalWorld", icon: "🏺", title: "Mundo bíblico", subtitle: "Costumbres y contexto" },
  { key: "library", icon: "📚", title: "Biblioteca", subtitle: "Investigá en tus fuentes" },
  { key: "materials", icon: "🗂️", title: "Mis materiales", subtitle: "Sermones y recursos guardados" },
];

export function HomeScreen({ onNavigate }: { onNavigate: (screen: ScreenKey) => void }) {
  return (
    <Page>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>ASISTENTE PASTORAL IA</Text>
        <Text style={styles.tagline}>SABIDURÍA · GUÍA · MINISTERIO</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.welcome}>👋 ¡Bienvenido, Pastor!</Text>
        <Text style={styles.question}>¿En qué puedo ayudarte hoy?</Text>
        <Text style={styles.promise}>Menos tiempo buscando. Más tiempo pastoreando.</Text>
      </View>

      <Pressable onPress={() => onNavigate("saturday")} style={({ pressed }) => [styles.mainAction, pressed && styles.pressed]}>
        <View style={styles.mainIcon}><Text style={styles.mainIconText}>🔥</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.mainEyebrow}>PREPARACIÓN PRINCIPAL</Text>
          <Text style={styles.mainTitle}>Preparame para este sábado</Text>
          <Text style={styles.mainSubtitle}>3 caminos bíblicos + investigación + sermón final</Text>
        </View>
        <Text style={styles.arrow}>→</Text>
      </Pressable>

      <Text style={styles.sectionTitle}>HERRAMIENTAS PASTORALES</Text>
      <View style={styles.grid}>
        {tools.map((tool) => (
          <Pressable key={tool.key} onPress={() => onNavigate(tool.key)} style={({ pressed }) => [styles.tool, pressed && styles.pressed]}>
            <Text style={styles.toolIcon}>{tool.icon}</Text>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolSubtitle}>{tool.subtitle}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.verse}>
        <Text style={styles.quote}>“Todo lo puedo en Cristo que me fortalece.”</Text>
        <Text style={styles.reference}>Filipenses 4:13</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  brandBlock: { marginTop: 6, marginBottom: 20 },
  brand: { color: "#FFFFFF", fontSize: 21, lineHeight: 26, fontWeight: "900", letterSpacing: 0.8 },
  tagline: { color: theme.colors.goldBright, fontSize: 12, lineHeight: 17, fontWeight: "900", letterSpacing: 1.2, marginTop: 5 },
  hero: { minHeight: 210, borderRadius: 26, borderWidth: 1, borderColor: theme.colors.borderGold, backgroundColor: "#0B2944", padding: 22, justifyContent: "flex-end", marginBottom: 14 },
  welcome: { color: theme.colors.goldBright, fontWeight: "900", fontSize: 15 },
  question: { color: "#FFFFFF", fontSize: 33, lineHeight: 39, fontWeight: "900", marginTop: 8 },
  promise: { color: "#E1E8EF", fontSize: 16, lineHeight: 23, marginTop: 10 },
  mainAction: { flexDirection: "row", alignItems: "center", backgroundColor: "#0B2741", borderWidth: 1.5, borderColor: theme.colors.gold, borderRadius: 22, padding: 17, marginBottom: 22 },
  mainIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: "#132F48", borderWidth: 1, borderColor: theme.colors.borderGold, alignItems: "center", justifyContent: "center", marginRight: 12 },
  mainIconText: { fontSize: 27 }, mainEyebrow: { color: theme.colors.goldBright, fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  mainTitle: { color: "#FFFFFF", fontSize: 20, lineHeight: 25, fontWeight: "900", marginTop: 5 },
  mainSubtitle: { color: "#C8D5E0", fontSize: 13, lineHeight: 19, marginTop: 5 },
  arrow: { color: theme.colors.gold, fontSize: 24, fontWeight: "900", marginLeft: 8 },
  sectionTitle: { color: theme.colors.goldBright, fontSize: 13, fontWeight: "900", letterSpacing: 1, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  tool: { width: "48.5%", minHeight: 132, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 20, padding: 14, marginBottom: 11 },
  toolIcon: { fontSize: 26, marginBottom: 12 }, toolTitle: { color: "#FFFFFF", fontSize: 16, lineHeight: 21, fontWeight: "900" },
  toolSubtitle: { color: "#C2D0DC", fontSize: 13, lineHeight: 19, marginTop: 5 },
  verse: { backgroundColor: "#071D31", borderWidth: 1, borderColor: theme.colors.borderGold, borderRadius: 22, padding: 20, alignItems: "center", marginTop: 4, marginBottom: 12 },
  quote: { color: theme.colors.ink, fontSize: 17, lineHeight: 25, fontStyle: "italic", textAlign: "center" }, reference: { color: theme.colors.goldBright, fontSize: 13, fontWeight: "900", marginTop: 9 },
  pressed: { opacity: 0.78 },
});
