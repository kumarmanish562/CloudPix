import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Share,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  X,
  Heart,
  Sparkles,
  Trash2,
  Share2,
  Calendar,
  Layers,
  Tag,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { height } = Dimensions.get("window");

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
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
    queryFn: () => api.getPhoto(id!),
    enabled: !!id,
  });

  const favoriteMutation = useMutation({
    mutationFn: (fav: boolean) => api.toggleFavorite(id!, fav),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "photo", id] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (err: unknown) => {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not update favorite");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deletePhoto(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert("Deleted", "Photo removed from your vault.");
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Delete Failed", err?.message || "Could not delete photo");
    },
  });

  const handleShare = async () => {
    if (!photo) return;
    try {
      await Share.share({
        message: `Check out this photo on CloudPix: ${photo.url}`,
        url: photo.url,
      });
    } catch {
      Alert.alert("Share URL", photo.url);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to delete this photo from your vault? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  if (!photo) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: "#ffffff" }}>Photo not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.nav}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.navRight}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Share2 size={18} color="#c084fc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => favoriteMutation.mutate(!photo.favorite)}
            activeOpacity={0.7}
          >
            <Heart
              size={18}
              color={photo.favorite ? "#f43f5e" : "#ffffff"}
              fill={photo.favorite ? "#f43f5e" : "transparent"}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, styles.deleteBtn]}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Image Display */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: photo.url }}
          style={styles.mainImage}
          contentFit="contain"
          transition={300}
        />
      </View>

      {/* Info Card Drawer */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.fileName} numberOfLines={1}>
            {photo.fileName}
          </Text>
          {photo.aiTransformType && (
            <View style={styles.aiTag}>
              <Sparkles size={12} color="#c084fc" />
              <Text style={styles.aiTagText}>{photo.aiTransformType}</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {photo.width && photo.height && (
            <>
              <Text style={styles.metaText}>{photo.width} × {photo.height}</Text>
              <Text style={styles.metaDivider}>•</Text>
            </>
          )}
          <Text style={styles.metaText}>{formatBytes(photo.sizeBytes)}</Text>
          <Text style={styles.metaDivider}>•</Text>
          <Text style={styles.metaText}>
            {new Date(photo.createdAt).toLocaleDateString()}
          </Text>
        </View>

        {/* AI Action Shortcut */}
        <TouchableOpacity
          style={styles.aiActionPill}
          activeOpacity={0.85}
          onPress={() => {
            router.push("/(tabs)/ai");
          }}
        >
          <Sparkles size={15} color="#ffffff" />
          <Text style={styles.aiActionText}>Enhance in AI Studio</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#07040d",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#07040d",
  },
  nav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  navRight: {
    flexDirection: "row",
    gap: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.14)",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mainImage: {
    width: "100%",
    height: height * 0.62,
  },
  infoCard: {
    backgroundColor: "#130d21",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  fileName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiTagText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "700",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "#94a3b8",
    fontSize: 13,
  },
  metaDivider: {
    color: "#475569",
    fontSize: 12,
  },
  aiActionPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 12,
    marginTop: 4,
  },
  aiActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
