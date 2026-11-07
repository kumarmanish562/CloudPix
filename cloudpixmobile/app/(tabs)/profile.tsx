import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-store";
import { api, API_URL } from "@/lib/api";
import {
  CheckCircle2,
  LogOut,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Server,
  Sparkles,
  ArrowRight,
  RefreshCw,
  HardDrive,
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [pingStatus, setPingStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    checkBackend();
  }, []);

  async function checkBackend() {
    setPingStatus("checking");
    const isOnline = await api.ping();
    setPingStatus(isOnline ? "online" : "offline");
  }

  const handleLogoutPrompt = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out of CloudPix?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => logout(),
      },
    ]);
  };

  const getInitials = (name?: string) => {
    if (!name) return "CP";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Account & Settings</Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(user?.displayName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.displayName || "CloudPix User"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badgeRow}>
              {user?.emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={12} color="#10b981" />
                  <Text style={styles.verifiedBadgeText}>Email Verified</Text>
                </View>
              ) : (
                <View style={styles.unverifiedBadge}>
                  <ShieldAlert size={12} color="#f59e0b" />
                  <Text style={styles.unverifiedBadgeText}>Unverified Email</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Verify Email Callout if unverified */}
        {!user?.emailVerified && (
          <TouchableOpacity
            style={styles.verifyCallout}
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/(auth)/verify-email",
                params: { email: user?.email },
              })
            }
          >
            <View style={styles.verifyCalloutLeft}>
              <Mail size={20} color="#f59e0b" />
              <View style={{ flex: 1 }}>
                <Text style={styles.verifyCalloutTitle}>Complete Email Verification</Text>
                <Text style={styles.verifyCalloutDesc}>
                  Tap to enter your 6-digit confirmation code.
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color="#fbbf24" />
          </TouchableOpacity>
        )}

        {/* Cloud & AI Features Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeader}>CLOUD & AI MEMBERSHIP</Text>
          <View style={styles.featureItem}>
            <View style={[styles.itemIcon, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
              <HardDrive size={18} color="#c084fc" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>Tier: Free Cloud Vault</Text>
              <Text style={styles.itemDesc}>5 GB allocated high-speed encrypted storage</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.itemIcon, { backgroundColor: "rgba(236, 72, 153, 0.15)" }]}>
              <Sparkles size={18} color="#f472b6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>AI Neural Studio</Text>
              <Text style={styles.itemDesc}>Background removal, portrait retouch, upscaling</Text>
            </View>
          </View>
        </View>

        {/* Backend Server Connection Status */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardHeader}>API ENVIRONMENT</Text>
            <TouchableOpacity onPress={checkBackend} style={styles.refreshPingBtn}>
              <RefreshCw size={13} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={styles.serverRow}>
            <Server size={18} color="#64748b" />
            <View style={{ flex: 1 }}>
              <Text style={styles.serverUrl} numberOfLines={1}>
                {API_URL}
              </Text>
            </View>
            <View
              style={[
                styles.pingPill,
                pingStatus === "online" && styles.pingOnline,
                pingStatus === "offline" && styles.pingOffline,
              ]}
            >
              <View
                style={[
                  styles.pingDot,
                  pingStatus === "online" && styles.pingDotOnline,
                  pingStatus === "offline" && styles.pingDotOffline,
                ]}
              />
              <Text style={styles.pingText}>
                {pingStatus === "checking"
                  ? "Checking..."
                  : pingStatus === "online"
                  ? "Connected"
                  : "Unreachable"}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogoutPrompt}
          activeOpacity={0.85}
        >
          <LogOut size={18} color="#f43f5e" />
          <Text style={styles.logoutText}>Sign Out of CloudPix</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 18,
    gap: 16,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: "row",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "600",
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  unverifiedBadgeText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "600",
  },
  verifyCallout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 20,
  },
  verifyCalloutLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  verifyCalloutTitle: {
    color: "#fbbf24",
    fontSize: 14,
    fontWeight: "700",
  },
  verifyCalloutDesc: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 18,
    gap: 14,
    marginBottom: 20,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeader: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
  },
  refreshPingBtn: {
    padding: 4,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  itemIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  itemDesc: {
    color: "#94a3b8",
    fontSize: 12,
  },
  serverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  serverUrl: {
    color: "#cbd5e1",
    fontSize: 12,
    fontFamily: "monospace",
  },
  pingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  pingOnline: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  pingOffline: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  pingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94a3b8",
  },
  pingDotOnline: {
    backgroundColor: "#10b981",
  },
  pingDotOffline: {
    backgroundColor: "#ef4444",
  },
  pingText: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.25)",
    borderRadius: 16,
    paddingVertical: 15,
  },
  logoutText: {
    color: "#f43f5e",
    fontSize: 15,
    fontWeight: "700",
  },
});
