import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Album } from "@/lib/api";
import {
  FolderOpen,
  Images,
  Plus,
  Share2,
  Calendar,
  X,
  Sparkles,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AlbumsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data: albums = [], isLoading, refetch } = useQuery({
    queryKey: ["mobile", "albums"],
    queryFn: api.getAlbums,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description?: string }) =>
      api.createAlbum(data),
    onSuccess: (newAlbum) => {
      queryClient.invalidateQueries({ queryKey: ["mobile", "albums"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setModalVisible(false);
      setNewTitle("");
      setNewDescription("");
      router.push(`/album/${newAlbum.id}`);
    },
    onError: (err: any) => {
      Alert.alert("Error", err?.message || "Could not create album");
    },
  });

  const shareMutation = useMutation({
    mutationFn: (albumId: string) => api.shareAlbum(albumId, 7),
    onSuccess: (res) => {
      Alert.alert(
        "Album Shared!",
        `Shareable link created (expires in 7 days):\n\n${res.shareUrl || "Link ready in your clipboard"}`
      );
    },
    onError: (err: any) => {
      Alert.alert("Share Failed", err?.message || "Could not generate share link");
    },
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  function handleCreate() {
    if (!newTitle.trim()) {
      Alert.alert("Title Required", "Please enter a name for the album.");
      return;
    }
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Albums</Text>
          <Text style={styles.headerSubtitle}>
            {albums.length} {albums.length === 1 ? "collection" : "collections"} curated
          </Text>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
        >
          <Plus size={16} color="#ffffff" />
          <Text style={styles.createBtnText}>New Album</Text>
        </TouchableOpacity>
      </View>

      {/* Album List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#c084fc" />
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FolderOpen size={48} color="#475569" />
          <Text style={styles.emptyTitle}>No albums yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your first collection to organize memories and generate private share links.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Plus size={18} color="#ffffff" />
            <Text style={styles.emptyBtnText}>Create Your First Album</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c084fc"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.albumCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/album/${item.id}`)}
            >
              <View style={styles.coverBox}>
                {item.coverThumbnailUrl ? (
                  <Image
                    source={{ uri: item.coverThumbnailUrl }}
                    style={styles.coverImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    <FolderOpen size={36} color="#a855f7" opacity={0.6} />
                  </View>
                )}

                <View style={styles.countBadge}>
                  <Images size={12} color="#ffffff" />
                  <Text style={styles.countBadgeText}>{item.photoCount}</Text>
                </View>
              </View>

              <View style={styles.albumInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.albumTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.albumSub}>
                    {item.photoCount} {item.photoCount === 1 ? "photo" : "photos"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.shareIconBtn}
                  activeOpacity={0.7}
                  onPress={(e) => {
                    e.stopPropagation();
                    shareMutation.mutate(item.id);
                  }}
                >
                  <Share2 size={16} color="#c084fc" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Album Modal Dialog */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <FolderOpen size={20} color="#c084fc" />
                <Text style={styles.modalTitle}>New Collection</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>ALBUM NAME</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="e.g. Summer Roadtrip 2026"
                  placeholderTextColor="#475569"
                  autoFocus
                />
              </View>

              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>DESCRIPTION (OPTIONAL)</Text>
                <TextInput
                  style={[styles.modalInput, styles.textArea]}
                  value={newDescription}
                  onChangeText={setNewDescription}
                  placeholder="Add a few details about this collection..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitModalBtn,
                  createMutation.isPending && styles.btnDisabled,
                ]}
                disabled={createMutation.isPending}
                onPress={handleCreate}
                activeOpacity={0.85}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Sparkles size={16} color="#ffffff" />
                    <Text style={styles.submitModalBtnText}>Create Collection</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 16,
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
  createBtn: {
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
  createBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 14,
  },
  albumCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    overflow: "hidden",
  },
  coverBox: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(147, 51, 234, 0.06)",
  },
  countBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  albumInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  albumTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  albumSub: {
    fontSize: 13,
    color: "#94a3b8",
  },
  shareIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7c3aed",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#161024",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
  modalForm: {
    gap: 16,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  modalInput: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 15,
  },
  textArea: {
    height: 72,
    textAlignVertical: "top",
  },
  submitModalBtn: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitModalBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
