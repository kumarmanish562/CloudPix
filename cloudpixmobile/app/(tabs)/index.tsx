import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Alert,
  TextInput,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api, Photo } from "@/lib/api";
import {
  Heart,
  Plus,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Search,
  X,
  Filter,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 2;
const GAP = 12;
const ITEM_SIZE = (width - 32 - GAP) / COLUMN_COUNT;

export default function PhotosScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"ALL" | "FAVORITES" | "AI">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mobile", "photos"],
    queryFn: () => api.getPhotos(0, 100),
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      api.toggleFavorite(id, favorite),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const uploadFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Needed", "Please enable photo library access to upload.");
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.9,
    });

    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      try {
        await api.uploadPhoto(
          asset.uri,
          asset.fileName || `mobile_${Date.now()}.jpg`,
          asset.mimeType || "image/jpeg"
        );
        queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
        Alert.alert("Success", "Photo uploaded to your cloud vault!");
      } catch (err: any) {
        Alert.alert("Upload Failed", err?.message || "Failed to upload photo");
      }
    }
  };

  const uploadFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission Needed", "Please enable camera access to take photos.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 0.9,
    });

    if (!res.canceled && res.assets?.[0]) {
      const asset = res.assets[0];
      try {
        await api.uploadPhoto(
          asset.uri,
          `camera_${Date.now()}.jpg`,
          asset.mimeType || "image/jpeg"
        );
        queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
        Alert.alert("Success", "Photo captured & uploaded to cloud vault!");
      } catch (err: any) {
        Alert.alert("Upload Failed", err?.message || "Failed to upload photo");
      }
    }
  };

  const handleUploadMenu = () => {
    Alert.alert("Upload Photo", "Choose an upload source:", [
      { text: "Camera", onPress: uploadFromCamera },
      { text: "Photo Library", onPress: uploadFromLibrary },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const rawPhotos = data?.content || [];

  const filteredPhotos = rawPhotos.filter((p) => {
    if (activeFilter === "FAVORITES" && !p.favorite) return false;
    if (activeFilter === "AI" && !p.aiTransformType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = p.fileName.toLowerCase().includes(q);
      const matchTag = p.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchName && !matchTag) return false;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Photos</Text>
          <Text style={styles.headerSubtitle}>
            {filteredPhotos.length} {filteredPhotos.length === 1 ? "photo" : "photos"} visible
          </Text>
        </View>

        <TouchableOpacity
          style={styles.uploadHeaderBtn}
          onPress={handleUploadMenu}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.uploadHeaderBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search photos or tags..."
            placeholderTextColor="#64748b"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, activeFilter === "ALL" && styles.filterChipActive]}
          onPress={() => setActiveFilter("ALL")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "ALL" && styles.filterChipTextActive,
            ]}
          >
            All Photos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterChip,
            activeFilter === "FAVORITES" && styles.filterChipActive,
          ]}
          onPress={() => setActiveFilter("FAVORITES")}
          activeOpacity={0.8}
        >
          <Heart
            size={12}
            color={activeFilter === "FAVORITES" ? "#ffffff" : "#f43f5e"}
            fill={activeFilter === "FAVORITES" ? "#ffffff" : "transparent"}
          />
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "FAVORITES" && styles.filterChipTextActive,
            ]}
          >
            Favorites
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, activeFilter === "AI" && styles.filterChipActive]}
          onPress={() => setActiveFilter("AI")}
          activeOpacity={0.8}
        >
          <Sparkles
            size={12}
            color={activeFilter === "AI" ? "#ffffff" : "#c084fc"}
          />
          <Text
            style={[
              styles.filterChipText,
              activeFilter === "AI" && styles.filterChipTextActive,
            ]}
          >
            AI Studio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Photos Grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c084fc" />
        </View>
      ) : filteredPhotos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ImageIcon size={44} color="#475569" />
          <Text style={styles.emptyTitle}>No photos found</Text>
          <Text style={styles.emptySubtitle}>
            {searchQuery
              ? "No photos matched your search criteria."
              : "Your vault is currently empty. Start by uploading from your device."}
          </Text>
          <TouchableOpacity
            style={styles.emptyUploadBtn}
            onPress={handleUploadMenu}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.emptyUploadBtnText}>Upload New Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPhotos}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c084fc"
            />
          }
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

              {/* Top AI badge */}
              {item.aiTransformType && (
                <View style={styles.aiBadge}>
                  <Sparkles size={11} color="#c084fc" />
                </View>
              )}

              {/* Bottom Heart Toggle Action */}
              <TouchableOpacity
                style={styles.heartButton}
                activeOpacity={0.7}
                onPress={(e) => {
                  e.stopPropagation();
                  toggleFavoriteMutation.mutate({
                    id: item.id,
                    favorite: !item.favorite,
                  });
                }}
              >
                <Heart
                  size={14}
                  color={item.favorite ? "#f43f5e" : "#ffffff"}
                  fill={item.favorite ? "#f43f5e" : "transparent"}
                />
              </TouchableOpacity>
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  uploadHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: "#7c3aed",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadHeaderBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
  },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: {
    backgroundColor: "rgba(147, 51, 234, 0.25)",
    borderColor: "#a855f7",
  },
  filterChipText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  filterChipTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  grid: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  aiBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 10,
    padding: 5,
  },
  heartButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderRadius: 14,
    padding: 7,
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
    marginTop: 12,
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyUploadBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
