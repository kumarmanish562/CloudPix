import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Cloud,
  Sparkles,
  ShieldCheck,
  Share2,
  ArrowRight,
  Zap,
} from "lucide-react-native";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      icon: Cloud,
      title: "Infinite Cloud Vault",
      description: "High-resolution backups with automated zero-loss storage across all your devices.",
      badge: "5 GB Free Cloud",
    },
    {
      icon: Sparkles,
      title: "AI Studio In Your Pocket",
      description: "Erase backgrounds, retouch portraits, and upscale photo quality with a single tap.",
      badge: "Next-Gen AI",
    },
    {
      icon: Share2,
      title: "Time-Expiring Album Shares",
      description: "Create private shared links that expire automatically when you choose.",
      badge: "Zero Leakage",
    },
    {
      icon: ShieldCheck,
      title: "Enterprise Encryption",
      description: "End-to-end token verification, signed ImageKit URLs, and strict access controls.",
      badge: "Bank-Grade Security",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Logo */}
        <View style={styles.header}>
          <View style={styles.logoPill}>
            <View style={styles.logoIcon}>
              <Cloud size={20} color="#c084fc" />
            </View>
            <Text style={styles.logoText}>CloudPix</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v2.0</Text>
            </View>
          </View>
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.ambientGlow} />
          <View style={styles.badgeRow}>
            <Zap size={14} color="#f59e0b" />
            <Text style={styles.badgeLabel}>PRODUCTION READY PHOTO SUITE</Text>
          </View>
          <Text style={styles.heroTitle}>
            Your Memories,{"\n"}
            <Text style={styles.heroGradient}>Supercharged by AI.</Text>
          </Text>
          <Text style={styles.heroSubtitle}>
            A unified creative cloud library with real-time AI transformations,
            smart album curations, and secure instant sharing.
          </Text>
        </View>

        {/* Feature Carousel Cards */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionHeader}>WHAT'S INSIDE</Text>
          <View style={styles.featureGrid}>
            {features.map((feat, index) => {
              const Icon = feat.icon;
              const isSelected = activeFeature === index;
              return (
                <TouchableOpacity
                  key={index}
                  activeOpacity={0.8}
                  onPress={() => setActiveFeature(index)}
                  style={[
                    styles.featureCard,
                    isSelected && styles.featureCardActive,
                  ]}
                >
                  <View style={styles.featureHeader}>
                    <View
                      style={[
                        styles.iconWrap,
                        isSelected && styles.iconWrapActive,
                      ]}
                    >
                      <Icon size={20} color={isSelected ? "#ffffff" : "#c084fc"} />
                    </View>
                    <View style={styles.featureBadge}>
                      <Text style={styles.featureBadgeText}>{feat.badge}</Text>
                    </View>
                  </View>
                  <Text style={styles.featureTitle}>{feat.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feat.description}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.85}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.primaryButtonText}>Get Started Free</Text>
            <ArrowRight size={18} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.85}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryButtonText}>I already have an account</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            CloudPix • Spring Boot 4 Backend & Expo Mobile
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0c0814",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  logoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 30,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 8,
  },
  logoIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  versionBadge: {
    backgroundColor: "rgba(168, 85, 247, 0.25)",
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  versionText: {
    color: "#d8b4fe",
    fontSize: 10,
    fontWeight: "700",
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
  },
  ambientGlow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(147, 51, 234, 0.18)",
    top: -20,
    zIndex: -1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  badgeLabel: {
    color: "#fbbf24",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    lineHeight: 42,
    marginBottom: 12,
  },
  heroGradient: {
    color: "#c084fc",
  },
  heroSubtitle: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  sectionHeader: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 14,
    marginLeft: 4,
  },
  featureGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 18,
    padding: 16,
  },
  featureCardActive: {
    backgroundColor: "rgba(147, 51, 234, 0.12)",
    borderColor: "rgba(168, 85, 247, 0.4)",
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#9333ea",
  },
  featureBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  featureBadgeText: {
    color: "#cbd5e1",
    fontSize: 10,
    fontWeight: "600",
  },
  featureTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureDescription: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    paddingTop: 8,
  },
  footerText: {
    color: "#475569",
    fontSize: 11,
  },
});

