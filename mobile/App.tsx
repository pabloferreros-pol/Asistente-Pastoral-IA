import React, { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "./src/theme";
import { ScreenKey } from "./src/types";
import { HomeScreen } from "./src/screens/HomeScreen";
import { SaturdayScreen } from "./src/screens/SaturdayScreen";
import { VisitScreen } from "./src/screens/VisitScreen";
import { MinistryScreen } from "./src/screens/MinistryScreen";
import { ConcordanceScreen } from "./src/screens/ConcordanceScreen";
import { BiblicalWorldScreen } from "./src/screens/BiblicalWorldScreen";
import { LibraryScreen } from "./src/screens/LibraryScreen";
import { MaterialsScreen } from "./src/screens/MaterialsScreen";

const navItems: { key: ScreenKey; icon: string; label: string }[] = [
  { key: "home", icon: "⌂", label: "Inicio" },
  { key: "saturday", icon: "🔥", label: "Sábado" },
  { key: "library", icon: "📚", label: "Biblioteca" },
  { key: "materials", icon: "🗂️", label: "Materiales" },
];

function AppShell() {
  const insets = useSafeAreaInsets();
  const [screen, setScreen] = useState<ScreenKey>("home");
  const opacity = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0.45);
    translateY.setValue(8);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 190, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, speed: 25, bounciness: 1, useNativeDriver: true }),
    ]).start();
  }, [screen, opacity, translateY]);

  const goHome = () => setScreen("home");

  const content: Record<ScreenKey, React.ReactNode> = {
    home: <HomeScreen onNavigate={setScreen} />,
    saturday: <SaturdayScreen onBack={goHome} />,
    visit: <VisitScreen onBack={goHome} />,
    ministry: <MinistryScreen onBack={goHome} />,
    concordance: <ConcordanceScreen onBack={goHome} />,
    biblicalWorld: <BiblicalWorldScreen onBack={goHome} />,
    library: <LibraryScreen onBack={goHome} />,
    materials: <MaterialsScreen onBack={goHome} />,
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
        {content[screen]}
      </Animated.View>

      <View
        style={[
          styles.navShell,
          {
            paddingBottom: Math.max(insets.bottom, 8),
            minHeight: 64 + Math.max(insets.bottom, 8),
          },
        ]}
      >
        {navItems.map((item) => {
          const selected = screen === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={() => setScreen(item.key)}
              style={({ pressed }) => [styles.navItem, pressed && styles.navPressed]}
            >
              <View style={[styles.navIconWrap, selected && styles.navIconWrapSelected]}>
                <Text style={[styles.navIcon, selected && styles.navIconSelected]}>{item.icon}</Text>
              </View>
              <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  content: { flex: 1 },
  navShell: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    backgroundColor: "#071C2F",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 7,
    paddingHorizontal: 4,
  },
  navItem: { flex: 1, minHeight: 54, alignItems: "center", justifyContent: "center" },
  navPressed: { opacity: 0.72 },
  navIconWrap: { minWidth: 37, height: 29, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  navIconWrapSelected: { backgroundColor: "#213041", borderWidth: 1, borderColor: theme.colors.borderGold },
  navIcon: { color: theme.colors.muted, fontSize: 17, fontWeight: "900" },
  navIconSelected: { color: theme.colors.gold },
  navLabel: { color: theme.colors.muted, fontSize: 9, fontWeight: "800", marginTop: 4 },
  navLabelSelected: { color: theme.colors.goldBright },
});
