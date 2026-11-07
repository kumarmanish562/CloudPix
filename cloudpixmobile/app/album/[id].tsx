import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
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
  ArrowLeft,
  Share2,
  Trash2,
  FolderOpen,
  Calendar,
  Sparkles,
  Heart,
  Images,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const GAP = 12;
const ITEM_SIZE = (width - 32 - GAP) / COLUMN_COUNT;

export default function AlbumDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: album, isLoading: loadingAlbum } = useQuery({
    queryKey: ["album", id],
    queryFn: () => api.getAlbum(id!),
    enabled: !!id,
  });

  const { data: photosData, isLoading: loadingPhotos } = useQuery({
    queryKey: ["album-photos", id],
    queryFn: () => api.getAlbumPhotos(id!, 0, 50),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAlbum(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "albums"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert("Deleted", "Album has been removed.");
      router.back();
    },
    onError: (err: any) => {
      Alert.alert("Delete Failed", err?.message || "Could not delete album");
    },
  });

  const shareMutation = useMutation({
    mutationFn: () => api.shareAlbum(id!, 7),
    onSuccess: async (res) => {
      try {
        await Share.share({
          message: `Check out my photo collection "${album?.title || "Album"}" on CloudPix:\n${res.shareUrl}`,
          url: res.shareUrl,
        });
      } catch {
        Alert.alert("Share URL", res.shareUrl);
      }
    },
    onError: (err: any) => {
      Alert.alert("Share Error", err?.message || "Could not generate share link");
    },
  });

  const handleDeletePrompt = () => {
    Alert.alert(
      "Delete Album",
      `Are you sure you want to delete "${album?.title}"? Photos inside will remain in your vault.`,
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

  const photos = photosData?.content || [];

  if (loadingAlbum) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c084fc" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.circleBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            style={styles.circleBtn}
            onPress={() => shareMutation.mutate()}
            activeOpacity={0.7}
          >
            <Share2 size={18} color="#c084fc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.circleBtn, styles.deleteBtn]}
            onPress={handleDeletePrompt}
            activeOpacity={0.7}
          >
            <Trash2 size={18} color="#f43f5e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Album Hero Info */}
      <View style={styles.heroInfo}>
        <View style={styles.badgeRow}>
          <FolderOpen size={14} color="#c084fc" />
          <Text style={styles.badgeText}>COLLECTION</Text>
        </View>
        <Text style={styles.albumTitle}>{album?.title || "Album"}</Text>
        {album?.description && (
          <Text style={styles.albumDesc}>{album.description}</Text>
        )}
        <Text style={styles.metaText}>
          {photos.length} {photos.length === 1 ? "photo" : "photos"} in album
        </Text>
      </View>

      {/* Photos Grid */}
      {loadingPhotos ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c084fc" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Images size={44} color="#475569" />
          <Text style={styles.emptyTitle}>No photos in this album</Text>
          <Text style={styles.emptySubtitle}>
            Add photos from your main library to build this collection.
          </Text>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.photoCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/photo/${item.id}`)}
            >
              <Image
                source={{ uri: item.thumbnailUrl || item.url }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
              {item.favorite && (
                <View style={styles.heartBadge}>
                  <Heart size={12} color="#f43f5e" fill="#f43f5e" />
                </View>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0814",
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  topRightActions: {
    flexDirection: "row",
    gap: 10,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "rgba(244, 63, 94, 0.12)",
  },
  heroInfo: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  badgeText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  albumTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  albumDesc: {
    fontSize: 14,
    color: "#94a3b8",
    lineHeight: 20,
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    color: "#64748b",
  },
  grid: {
    padding: 20,
  },
  columnWrapper: {
    gap: GAP,
    marginBottom: GAP,
  },
  photoCard: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.25,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  heartBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 12,
    padding: 6,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});

