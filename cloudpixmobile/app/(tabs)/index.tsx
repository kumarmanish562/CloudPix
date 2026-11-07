import { useState } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { api, Photo } from "@/lib/api";
import { Heart, Plus, Sparkles } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_SIZE = (width - 32 - (COLUMN_COUNT - 1) * 8) / COLUMN_COUNT;

export default function PhotosScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["mobile", "photos"],
    queryFn: () => api.getPhotos(0, 50),
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access to upload images.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `upload_${Date.now()}.jpg`;
        await api.uploadPhoto(asset.uri, fileName, asset.mimeType || "image/jpeg");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "photos"] });
      queryClient.invalidateQueries({ queryKey: ["mobile", "dashboard"] });
      Alert.alert("Success", "Photo uploaded successfully to ImageKit!");
    },
    onError: (err: unknown) => {
      Alert.alert("Upload Failed", err instanceof Error ? err.message : "Error uploading photo");
    },
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const photos = data?.content || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Photos</Text>
          <Text style={styles.headerSubtitle}>
            {photos.length} {photos.length === 1 ? "memory" : "memories"} saved
          </Text>
        </View>
        <TouchableOpacity
          style={styles.uploadHeaderBtn}
          onPress={() => uploadMutation.mutate()}
          disabled={uploadMutation.isPending}
        >
          {uploadMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Plus size={16} color="#fff" />
              <Text style={styles.uploadHeaderBtnText}>Upload</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Grid */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap the button below or &ldquo;Upload&rdquo; to add photos from your device.
          </Text>
          <TouchableOpacity
            style={styles.emptyUploadBtn}
            onPress={() => uploadMutation.mutate()}
          >
            <Plus size={18} color="#fff" />
            <Text style={styles.emptyUploadBtnText}>Upload your first photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={COLUMN_COUNT}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.columnWrapper}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#a78bfa"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.photoCard}
              activeOpacity={0.8}
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
              {item.aiTransformType && (
                <View style={styles.aiBadge}>
                  <Sparkles size={10} color="#c4b5fd" />
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
    backgroundColor: "#110c1c",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },
  uploadHeaderBtn: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#7c3aed",
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  uploadHeaderBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  grid: {
    padding: 16,
  },
  columnWrapper: {
    gap: 8,
    marginBottom: 8,
  },
  photoCard: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  heartBadge: {
    position: "absolute",
    bottom: 6,
    left: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 10,
    padding: 4,
  },
  aiBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: 10,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  emptySubtitle: {
    color: "#9ca3af",
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
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

