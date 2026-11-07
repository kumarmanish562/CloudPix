import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { MailCheck, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react-native";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { refreshUser, user } = useAuth();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || user?.email || "";

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleVerify() {
    if (code.trim().length !== 6) {
      Alert.alert("Invalid Code", "Please enter the 6-digit verification code sent to your email.");
      return;
    }

    try {
      setLoading(true);
      await api.verifyEmail({ code: code.trim(), email });
      setVerifiedSuccess(true);
      await refreshUser();
      setTimeout(() => {
        router.replace("/(tabs)");
      }, 1200);
    } catch (err: any) {
      Alert.alert("Verification Failed", err?.message || "Invalid or expired verification code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || !email) return;

    try {
      setResending(true);
      await api.resendVerification(email);
      setCooldown(60);
      Alert.alert("Code Sent", `A new 6-digit code has been dispatched to ${email}`);
    } catch (err: any) {
      Alert.alert("Resend Failed", err?.message || "Could not resend code. Please try again later.");
    } finally {
      setResending(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconCircle}>
            {verifiedSuccess ? (
              <CheckCircle2 size={40} color="#10b981" />
            ) : (
              <MailCheck size={36} color="#c084fc" />
            )}
          </View>

          <Text style={styles.title}>
            {verifiedSuccess ? "Email Verified!" : "Verify Your Email"}
          </Text>
          <Text style={styles.subtitle}>
            {verifiedSuccess
              ? "Your account is now fully verified. Redirecting to your dashboard..."
              : `We sent a 6-digit verification code to\n`}
            <Text style={styles.emailHighlight}>{email || "your email"}</Text>
          </Text>

          {!verifiedSuccess && (
            <>
              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>6-DIGIT VERIFICATION CODE</Text>
                <TextInput
                  style={styles.codeInput}
                  value={code}
                  onChangeText={(val) => setCode(val.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor="#475569"
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.verifyButton,
                  code.length !== 6 && styles.buttonDisabled,
                ]}
                disabled={code.length !== 6 || loading}
                onPress={handleVerify}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.verifyButtonText}>Verify & Proceed</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resendButton}
                disabled={cooldown > 0 || resending}
                onPress={handleResend}
                activeOpacity={0.7}
              >
                {resending ? (
                  <ActivityIndicator size="small" color="#c084fc" />
                ) : (
                  <View style={styles.resendRow}>
                    <RefreshCw size={15} color={cooldown > 0 ? "#64748b" : "#c084fc"} />
                    <Text
                      style={[
                        styles.resendText,
                        cooldown > 0 && styles.resendTextDisabled,
                      ]}
                    >
                      {cooldown > 0 ? `Resend Code in ${cooldown}s` : "Resend Code"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={() => router.replace("/(tabs)")}
                activeOpacity={0.7}
              >
                <Text style={styles.skipText}>I'll verify this later</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0814",
  },
  keyboardView: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    top: 24,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  emailHighlight: {
    color: "#e2e8f0",
    fontWeight: "700",
  },
  inputCard: {
    width: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    alignItems: "center",
  },
  inputLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  codeInput: {
    fontSize: 32,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 12,
    textAlign: "center",
    width: "100%",
  },
  verifyButton: {
    width: "100%",
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  verifyButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  resendButton: {
    paddingVertical: 10,
    marginBottom: 12,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  resendText: {
    color: "#c084fc",
    fontSize: 14,
    fontWeight: "600",
  },
  resendTextDisabled: {
    color: "#64748b",
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    color: "#64748b",
    fontSize: 13,
  },
});

