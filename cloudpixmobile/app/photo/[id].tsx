import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ArrowLeft, Heart, Sparkles, X } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function PhotoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: photo, isLoading } = useQuery({
    queryKey: ["mobile", "photo", id],
    queryFn: () => api.getPhoto(id),
  });

  const favoriteMutation = useMutation({
    mutationFn: (fav: boolean) => api.toggleFavorite(id, fav),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "photo", id] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
    },
    onError: (err: unknown) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not update favorite");
    },
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  if (!photo) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#fff" }}>Photo not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.nav}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <X size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => favoriteMutation.mutate(!photo.favorite)}
        >
          <Heart
            size={20}
            color={photo.favorite ? "#f43f5e" : "#fff"}
            fill={photo.favorite ? "#f43f5e" : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {/* Main Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: photo.url }}
          style={styles.mainImage}
          contentFit="contain"
          transition={300}
        />
      </View>

      {/* Info card footer */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {photo.fileName}
          </Text>
          {photo.aiTransformType && (
            <View style={styles.aiTag}>
              <Sparkles size={12} color="#c084fc" />
              <Text style={styles.aiTagText}>AI</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {photo.width && photo.height && (
            <Text style={styles.metaText}>{photo.width} × {photo.height}</Text>
          )}
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{formatBytes(photo.sizeBytes)}</Text>
          <Text style={styles.metaText}>•</Text>
          <Text style={styles.metaText}>{new Date(photo.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0b0813",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0b0813",
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainImage: {
    width: "100%",
    height: height * 0.7,
  },
  infoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 20,
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  fileName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  aiTagText: {
    color: "#c084fc",
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  metaText: {
    color: "#9ca3af",
    fontSize: 12,
  },
});

