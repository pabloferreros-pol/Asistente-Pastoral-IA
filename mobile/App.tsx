import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
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

function AppShell() {
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
    <SafeAreaView style={styles.safe} edges={["top", "bottom", "left", "right"]}>
      <StatusBar style="light" backgroundColor={theme.colors.background} />
      <Animated.View style={[styles.content, { opacity, transform: [{ translateY }] }]}>
        {content[screen]}
      </Animated.View>
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
});
