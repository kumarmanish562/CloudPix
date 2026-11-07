import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Cloud,
  FolderOpen,
  Heart,
  Images,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Share2,
  ArrowRight,
  TrendingUp,
  PieChart,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: summary, isLoading, refetch } = useQuery({
    queryKey: ["mobile", "dashboard"],
    queryFn: api.getDashboardSummary,
  });

  async function onRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  const used = summary?.storageUsedBytes || 0;
  const quota = summary?.storageQuotaBytes || 5 * 1024 * 1024 * 1024;
  const pct = Math.min(100, Math.round((used / quota) * 100));
  const recentPhotos = summary?.recentPhotos || [];
  const formatDistribution = summary?.formatDistribution || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c084fc"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>System Dashboard</Text>
          <Text style={styles.headerSubtitle}>Real-time vault & AI analytics</Text>
        </View>

        {/* Email Verification Banner */}
        {!summary?.emailVerified ? (
          <TouchableOpacity
            style={styles.alertBanner}
            activeOpacity={0.85}
            onPress={() => router.push("/(auth)/verify-email")}
          >
            <View style={styles.alertLeft}>
              <AlertCircle size={20} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Email Not Verified</Text>
                <Text style={styles.alertText}>
                  Tap here to enter your 6-digit verification code.
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color="#fbbf24" />
          </TouchableOpacity>
        ) : (
          <View style={styles.verifiedBanner}>
            <ShieldCheck size={18} color="#10b981" />
            <Text style={styles.verifiedText}>Account & Email Authenticated</Text>
          </View>
        )}

        {/* Storage Meter Card */}
        <View style={styles.storageCard}>
          <View style={styles.storageCardHeader}>
            <View style={styles.storageIconBox}>
              <Cloud size={20} color="#c084fc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.storageLabel}>ENCRYPTED CLOUD STORAGE</Text>
              <Text style={styles.storageValue}>
                {formatBytes(used)}{" "}
                <Text style={styles.storageQuota}>/ {formatBytes(quota)}</Text>
              </Text>
            </View>
            <View style={styles.pctBadge}>
              <Text style={styles.pctText}>{pct}%</Text>
            </View>
          </View>

          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${Math.max(5, pct)}%` }]} />
          </View>

          <View style={styles.storageFooter}>
            <Text style={styles.storageFooterText}>
              {formatBytes(Math.max(0, quota - used))} remaining capacity
            </Text>
          </View>
        </View>

        {/* Metric Grid Cards */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
              <Images size={18} color="#c084fc" />
            </View>
            <Text style={styles.statValue}>{summary?.totalPhotos || 0}</Text>
            <Text style={styles.statLabel}>Total Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/albums")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
              <FolderOpen size={18} color="#60a5fa" />
            </View>
            <Text style={styles.statValue}>{summary?.totalAlbums || 0}</Text>
            <Text style={styles.statLabel}>Collections</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.85}
            onPress={() => router.push("/(tabs)/ai")}
          >
            <View style={[styles.statIconBox, { backgroundColor: "rgba(236, 72, 153, 0.15)" }]}>
              <Sparkles size={18} color="#f472b6" />
            </View>
            <Text style={styles.statValue}>{summary?.totalAiTransformed || 0}</Text>
            <Text style={styles.statLabel}>AI Enhanced</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
              <Share2 size={18} color="#fbbf24" />
            </View>
            <Text style={styles.statValue}>{summary?.activeShares || 0}</Text>
            <Text style={styles.statLabel}>Active Shares</Text>
          </View>
        </View>

        {/* Recent Uploads Section */}
        {recentPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>RECENT VAULT ACTIVITY</Text>
              <TouchableOpacity onPress={() => router.push("/(tabs)")}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentPhotosRow}
            >
              {recentPhotos.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.recentPhotoCard}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/photo/${p.id}`)}
                >
                  <Image
                    source={{ uri: p.thumbnailUrl || p.url }}
                    style={styles.recentPhotoImage}
                  />
                  {p.aiTransformType && (
                    <View style={styles.recentAiBadge}>
                      <Sparkles size={10} color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Format Breakdown */}
        {formatDistribution.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FILE FORMAT DISTRIBUTION</Text>
            <View style={styles.formatList}>
              {formatDistribution.map((item) => (
                <View key={item.format} style={styles.formatItem}>
                  <View style={styles.formatInfo}>
                    <Text style={styles.formatName}>{item.format}</Text>
                    <Text style={styles.formatCount}>
                      {item.count} {item.count === 1 ? "file" : "files"} ({item.percentage}%)
                    </Text>
                  </View>
                  <View style={styles.formatBarTrack}>
                    <View
                      style={[
                        styles.formatBarFill,
                        { width: `${Math.max(4, item.percentage)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0814",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0c0814",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 36,
  },
  header: {
    marginBottom: 20,
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
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  alertLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  alertTitle: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "700",
  },
  alertText: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    borderRadius: 16,
    padding: 12,
    marginBottom: 20,
  },
  verifiedText: {
    color: "#34d399",
    fontSize: 13,
    fontWeight: "600",
  },
  storageCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  storageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  storageIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  storageLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
  },
  storageValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginTop: 2,
  },
  storageQuota: {
    fontSize: 13,
    fontWeight: "500",
    color: "#64748b",
  },
  pctBadge: {
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pctText: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "700",
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 10,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 4,
  },
  storageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  storageFooterText: {
    color: "#64748b",
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 26,
  },
  statCard: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    padding: 16,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  viewAllText: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "600",
  },
  recentPhotosRow: {
    gap: 10,
  },
  recentPhotoCard: {
    width: 90,
    height: 90,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  recentPhotoImage: {
    width: "100%",
    height: "100%",
  },
  recentAiBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#9333ea",
    borderRadius: 8,
    padding: 4,
  },
  formatList: {
    gap: 10,
  },
  formatItem: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  formatInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  formatName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  formatCount: {
    color: "#94a3b8",
    fontSize: 12,
  },
  formatBarTrack: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 3,
    overflow: "hidden",
  },
  formatBarFill: {
    height: "100%",
    backgroundColor: "#a855f7",
    borderRadius: 3,
  },
});
