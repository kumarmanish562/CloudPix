import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Cloud, FolderOpen, Heart, Images, Sparkles, ShieldCheck, AlertCircle } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export default function DashboardScreen() {
  const { data: summary, isLoading } = useQuery({
    queryKey: ["mobile", "dashboard"],
    queryFn: api.getDashboardSummary,
  });

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  const used = summary?.storageUsedBytes || 0;
  const quota = summary?.storageQuotaBytes || 5 * 1024 * 1024 * 1024;
  const pct = Math.min(100, Math.round((used / quota) * 100));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <Text style={styles.headerSubtitle}>Storage and library metrics</Text>
        </View>

        {/* Verification banner */}
        {!summary?.emailVerified ? (
          <View style={styles.alertBanner}>
            <AlertCircle size={18} color="#f59e0b" />
            <Text style={styles.alertText}>
              Email not verified. Verify on web or profile to protect your account.
            </Text>
          </View>
        ) : (
          <View style={styles.verifiedBanner}>
            <ShieldCheck size={18} color="#10b981" />
            <Text style={styles.verifiedText}>Account & Email Verified</Text>
          </View>
        )}

        {/* Storage Card */}
        <View style={styles.storageCard}>
          <View style={styles.storageCardHeader}>
            <View style={styles.storageIconBox}>
              <Cloud size={20} color="#38bdf8" />
            </View>
            <View>
              <Text style={styles.cardTitle}>Cloud Storage</Text>
              <Text style={styles.cardSub}>ImageKit secure storage</Text>
            </View>
            <Text style={styles.pctBadge}>{pct}%</Text>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${Math.max(4, pct)}%` }]} />
          </View>

          <View style={styles.storageNumbers}>
            <Text style={styles.storageNumText}>{formatBytes(used)} used</Text>
            <Text style={styles.storageNumText}>of {formatBytes(quota)}</Text>
          </View>
        </View>

        {/* 2x2 Metric Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Images size={20} color="#a78bfa" />
            <Text style={styles.statNumber}>{summary?.totalPhotos ?? 0}</Text>
            <Text style={styles.statLabel}>Total Photos</Text>
          </View>

          <View style={styles.statBox}>
            <FolderOpen size={20} color="#c084fc" />
            <Text style={styles.statNumber}>{summary?.totalAlbums ?? 0}</Text>
            <Text style={styles.statLabel}>Albums</Text>
          </View>

          <View style={styles.statBox}>
            <Heart size={20} color="#f43f5e" fill="#f43f5e" />
            <Text style={styles.statNumber}>{summary?.totalFavorites ?? 0}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>

          <View style={styles.statBox}>
            <Sparkles size={20} color="#e879f9" />
            <Text style={styles.statNumber}>{summary?.totalAiTransformed ?? 0}</Text>
            <Text style={styles.statLabel}>AI Creations</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#110c1c",
  },
  scroll: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 4,
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
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
    padding: 12,
    borderRadius: 16,
  },
  alertText: {
    flex: 1,
    color: "#fcd34d",
    fontSize: 12,
    lineHeight: 16,
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    padding: 10,
    borderRadius: 16,
  },
  verifiedText: {
    color: "#6ee7b7",
    fontSize: 12,
    fontWeight: "500",
  },
  storageCard: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 18,
    gap: 14,
  },
  storageCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  storageIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  cardSub: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 2,
  },
  pctBadge: {
    marginLeft: "auto",
    color: "#a78bfa",
    fontWeight: "700",
    fontSize: 16,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#7c3aed",
  },
  storageNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  storageNumText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statBox: {
    width: "48%",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    padding: 16,
    gap: 8,
  },
  statNumber: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: 12,
  },
});

