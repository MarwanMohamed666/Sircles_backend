import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/useColorScheme";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";

import { PaperProvider, MD3LightTheme } from "react-native-paper";
import { en, registerTranslation } from "react-native-paper-dates";

registerTranslation("en", en);

const MyCustomLightTheme = {
  ...MD3LightTheme, 
  colors: {
    ...MD3LightTheme.colors,
    primary: "#198F4B", 
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  const navigationTheme =
    colorScheme === "dark" ? NavigationDarkTheme : NavigationDefaultTheme;

  return (
    <PaperProvider theme={MyCustomLightTheme}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider value={navigationTheme}>
            <Stack>
              {/* ...Your screens... */}
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen
                name="setup-password"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="admin" options={{ headerShown: false }} />
              <Stack.Screen
                name="circle/[id]"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="settings" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
              <Stack.Screen
                name="onboarding"
                options={{ headerShown: false }}
              />
              <Stack.Screen name="splash" options={{ headerShown: false }} />
              <Stack.Screen name="interests" options={{ headerShown: false }} />
              <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
            </Stack>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </PaperProvider>
  );
}
