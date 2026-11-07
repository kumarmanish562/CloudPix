import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "@/lib/auth-store";
import { api, getAccessToken, setTokens, clearTokens, User } from "@/lib/api";
import { ActivityIndicator, View } from "react-native";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60,
    },
  },
});

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const segments = useSegments();
  const router = useRouter();

  async function loadUser() {
    try {
      const token = await getAccessToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const me = await api.getMe();
      setUser(me);
    } catch {
      await clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, isLoading, segments]);

  const authValue = {
    user,
    isLoading,
    login: async (credentials: { email: string; password: string }) => {
      const res = await api.login(credentials);
      await setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
    },
    register: async (data: { email: string; password: string; displayName: string }) => {
      const res = await api.register(data);
      await setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
    },
    logout: async () => {
      await clearTokens();
      setUser(null);
    },
    refreshUser: async () => {
      const me = await api.getMe();
      setUser(me);
    },
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#151022" }}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={authValue}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f0b18" } }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="photo/[id]" options={{ presentation: "modal", headerShown: false }} />
        </Stack>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

