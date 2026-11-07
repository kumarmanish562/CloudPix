import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "@/lib/auth-store";
import { api, API_URL } from "@/lib/api";
import { CheckCircle2, LogOut, Mail, ShieldAlert, User as UserIcon } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  async function handleVerifyCode() {
    if (!code.trim() || code.trim().length !== 6) {
      Alert.alert("Invalid code", "Please enter a valid 6-digit verification code");
      return;
    }
    setVerifying(true);
    try {
      await api.verifyEmail({ code: code.trim(), email: user?.email });
      Alert.alert("Success", "Your email has been verified!");
      setCode("");
      await refreshUser();
    } catch (err: unknown) {
      Alert.alert("Verification Failed", err instanceof Error ? err.message : "Error verifying code");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!user?.email) return;
    setResending(true);
    try {
      await api.resendVerification(user.email);
      Alert.alert("Sent", "A new verification code was sent to your email.");
    } catch (err: unknown) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not send verification email");
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
      </View>

      <View style={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <UserIcon size={32} color="#c4b5fd" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.displayName || "CloudPix User"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.badgeRow}>
              {user?.emailVerified ? (
                <View style={styles.verifiedBadge}>
                  <CheckCircle2 size={12} color="#10b981" />
                  <Text style={styles.verifiedBadgeText}>Verified</Text>
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

        {/* Verification Card if unverified */}
        {!user?.emailVerified && (
          <View style={styles.verifyBox}>
            <Text style={styles.verifyTitle}>Verify Your Email</Text>
            <Text style={styles.verifySub}>
              Enter the 6-digit code sent to your email inbox:
            </Text>
            <TextInput
              style={styles.codeInput}
              placeholder="123456"
              placeholderTextColor="#6b7280"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.verifyBtn, verifying && { opacity: 0.6 }]}
                onPress={handleVerifyCode}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.verifyBtnText}>Submit Code</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={handleResend}
                disabled={resending}
              >
                {resending ? (
                  <ActivityIndicator color="#a78bfa" size="small" />
                ) : (
                  <Text style={styles.resendBtnText}>Resend</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Server Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Connected Backend API:</Text>
          <Text style={styles.infoValue}>{API_URL}</Text>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={18} color="#f43f5e" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
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
  content: {
    padding: 16,
    gap: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 20,
    padding: 18,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  userEmail: {
    color: "#9ca3af",
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    marginTop: 6,
    flexDirection: "row",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedBadgeText: {
    color: "#34d399",
    fontSize: 11,
    fontWeight: "600",
  },
  unverifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  unverifiedBadgeText: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "600",
  },
  verifyBox: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  verifyTitle: {
    color: "#fbbf24",
    fontSize: 15,
    fontWeight: "600",
  },
  verifySub: {
    color: "#9ca3af",
    fontSize: 12,
  },
  codeInput: {
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: 8,
  },
  verifyBtn: {
    flex: 1,
    backgroundColor: "#7c3aed",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  verifyBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  resendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resendBtnText: {
    color: "#c4b5fd",
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 14,
    gap: 4,
  },
  infoLabel: {
    color: "#6b7280",
    fontSize: 11,
  },
  infoValue: {
    color: "#9ca3af",
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(244, 63, 94, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(244, 63, 94, 0.2)",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutText: {
    color: "#fb7185",
    fontSize: 15,
    fontWeight: "600",
  },
});

