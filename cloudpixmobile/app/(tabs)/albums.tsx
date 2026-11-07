import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FolderOpen, Images } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AlbumsScreen() {
  const { data: albums = [], isLoading } = useQuery({
    queryKey: ["mobile", "albums"],
    queryFn: api.getAlbums,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Albums</Text>
        <Text style={styles.headerSubtitle}>
          {albums.length} {albums.length === 1 ? "collection" : "collections"}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#a78bfa" />
        </View>
      ) : albums.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FolderOpen size={40} color="#6b7280" />
          <Text style={styles.emptyTitle}>No albums yet</Text>
          <Text style={styles.emptySubtitle}>
            Create your albums in the CloudPix web client or add photos to group them.
          </Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.albumCard} activeOpacity={0.8}>
              <View style={styles.coverBox}>
                {item.coverThumbnailUrl ? (
                  <Image source={{ uri: item.coverThumbnailUrl }} style={styles.coverImage} contentFit="cover" />
                ) : (
                  <View style={styles.placeholderBox}>
                    <FolderOpen size={32} color="#a78bfa" opacity={0.6} />
                  </View>
                )}
                <View style={styles.countBadge}>
                  <Images size={12} color="#fff" />
                  <Text style={styles.countBadgeText}>{item.photoCount}</Text>
                </View>
              </View>
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.albumSub}>
                  {item.photoCount} photo{item.photoCount === 1 ? "" : "s"}
                </Text>
              </View>
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
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
    gap: 16,
  },
  albumCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 12,
    gap: 14,
  },
  coverBox: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  placeholderBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  countBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  countBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  albumSub: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 4,
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
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#9ca3af",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
});

