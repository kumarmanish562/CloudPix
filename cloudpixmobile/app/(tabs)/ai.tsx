import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Photo } from "@/lib/api";
import {
  Sparkles,
  Scissors,
  Wand2,
  Maximize2,
  Image as ImageIcon,
  Check,
  ArrowRight,
  RefreshCw,
} from "lucide-react-native";
import { useRouter } from "expo-router";

const AI_TOOLS = [
  {
    id: "REMOVE_BACKGROUND",
    title: "Background Eraser",
    desc: "Isolate subjects and eliminate backgrounds with transparent precision.",
    icon: Scissors,
    color: "#a855f7",
  },
  {
    id: "RETOUCH",
    title: "Portrait Retouch",
    desc: "Smooth skin blemishes, optimize lighting balance, and sharpen facial details.",
    icon: Wand2,
    color: "#ec4899",
  },
  {
    id: "UPSCALE",
    title: "Super Resolution",
    desc: "AI upscaling to enhance clarity, sharpness, and fine textures.",
    icon: Maximize2,
    color: "#3b82f6",
  },
  {
    id: "GENERATIVE_FILL",
    title: "Generative Fill",
    desc: "Seamlessly expand canvas boundaries with realistic contextual content.",
    icon: Sparkles,
    color: "#eab308",
  },
];

export default function AiStudioScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedTool, setSelectedTool] = useState(AI_TOOLS[0].id);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: photosData, isLoading: loadingPhotos } = useQuery({
    queryKey: ["photos", 0],
    queryFn: () => api.getPhotos(0, 30),
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhoto) throw new Error("Select a photo first");
      return api.previewAiTransform(selectedPhoto.id, { type: selectedTool });
    },
    onSuccess: (data) => {
      setPreviewUrl(data.previewUrl);
    },
    onError: (err: any) => {
      Alert.alert("Preview Failed", err?.message || "Could not generate AI preview.");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPhoto) throw new Error("Select a photo first");
      return api.applyAiTransform(selectedPhoto.id, { type: selectedTool });
    },
    onSuccess: (newPhoto) => {
      queryClient.invalidateQueries({ queryKey: ["photos"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      Alert.alert("Success!", "Transformed photo has been saved to your vault.", [
        {
          text: "View Photo",
          onPress: () => router.push(`/photo/${newPhoto.id}`),
        },
        { text: "Done" },
      ]);
    },
    onError: (err: any) => {
      Alert.alert("Apply Failed", err?.message || "Could not save AI transform.");
    },
  });

  const photos = photosData?.content || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.badgeRow}>
            <Sparkles size={14} color="#c084fc" />
            <Text style={styles.badgeText}>AI CREATIVE STUDIO</Text>
          </View>
          <Text style={styles.title}>Neural Photo Enhancer</Text>
          <Text style={styles.subtitle}>
            Select a photo, choose an AI transformation, and watch the neural pipeline work.
          </Text>
        </View>

        {/* Step 1: Select Photo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. SELECT PHOTO TO ENHANCE</Text>
          {loadingPhotos ? (
            <ActivityIndicator color="#c084fc" style={{ padding: 24 }} />
          ) : photos.length === 0 ? (
            <View style={styles.emptyCard}>
              <ImageIcon size={28} color="#64748b" />
              <Text style={styles.emptyText}>No photos found in your vault.</Text>
              <TouchableOpacity
                style={styles.uploadPrompt}
                onPress={() => router.push("/(tabs)")}
              >
                <Text style={styles.uploadPromptText}>Upload Photos First</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoPickerRow}
            >
              {photos.map((item) => {
                const isSelected = selectedPhoto?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setSelectedPhoto(item);
                      setPreviewUrl(null);
                    }}
                    style={[
                      styles.photoThumbWrap,
                      isSelected && styles.photoThumbWrapSelected,
                    ]}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: item.thumbnailUrl || item.url }}
                      style={styles.photoThumb}
                      resizeMode="cover"
                    />
                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Check size={12} color="#ffffff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Step 2: Choose AI Magic Tool */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. CHOOSE AI PIPELINE</Text>
          <View style={styles.toolsGrid}>
            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isSelected = selectedTool === tool.id;
              return (
                <TouchableOpacity
                  key={tool.id}
                  onPress={() => {
                    setSelectedTool(tool.id);
                    setPreviewUrl(null);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.toolCard,
                    isSelected && styles.toolCardSelected,
                  ]}
                >
                  <View style={[styles.toolIconWrap, { backgroundColor: `${tool.color}20` }]}>
                    <Icon size={20} color={tool.color} />
                  </View>
                  <View style={styles.toolTextCol}>
                    <Text style={styles.toolTitle}>{tool.title}</Text>
                    <Text style={styles.toolDesc}>{tool.desc}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 3: Interactive Canvas Preview */}
        {selectedPhoto && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. PREVIEW & EXECUTE</Text>
            <View style={styles.previewContainer}>
              <View style={styles.canvasCard}>
                <Image
                  source={{ uri: previewUrl || selectedPhoto.url }}
                  style={styles.canvasImage}
                  resizeMode="contain"
                />
                <View style={styles.canvasBadge}>
                  <Text style={styles.canvasBadgeText}>
                    {previewUrl ? "AI PREVIEW READY" : "ORIGINAL PHOTO"}
                  </Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[
                    styles.secondaryAction,
                    previewMutation.isPending && styles.buttonDisabled,
                  ]}
                  disabled={previewMutation.isPending}
                  onPress={() => previewMutation.mutate()}
                  activeOpacity={0.8}
                >
                  {previewMutation.isPending ? (
                    <ActivityIndicator size="small" color="#c084fc" />
                  ) : (
                    <>
                      <RefreshCw size={16} color="#c084fc" />
                      <Text style={styles.secondaryActionText}>Generate Preview</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.primaryAction,
                    applyMutation.isPending && styles.buttonDisabled,
                  ]}
                  disabled={applyMutation.isPending}
                  onPress={() => applyMutation.mutate()}
                  activeOpacity={0.85}
                >
                  {applyMutation.isPending ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Text style={styles.primaryActionText}>Save Transformed</Text>
                      <ArrowRight size={16} color="#ffffff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(168, 85, 247, 0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    marginBottom: 10,
  },
  badgeText: {
    color: "#d8b4fe",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    lineHeight: 18,
  },
  section: {
    marginBottom: 26,
  },
  sectionTitle: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  photoPickerRow: {
    gap: 12,
    paddingVertical: 4,
  },
  photoThumbWrap: {
    width: 72,
    height: 72,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    position: "relative",
  },
  photoThumbWrapSelected: {
    borderColor: "#c084fc",
  },
  photoThumb: {
    width: "100%",
    height: "100%",
  },
  selectedCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#9333ea",
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
  },
  uploadPrompt: {
    backgroundColor: "rgba(192, 132, 252, 0.15)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  uploadPromptText: {
    color: "#c084fc",
    fontSize: 12,
    fontWeight: "600",
  },
  toolsGrid: {
    gap: 10,
  },
  toolCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    padding: 14,
    gap: 14,
  },
  toolCardSelected: {
    backgroundColor: "rgba(147, 51, 234, 0.14)",
    borderColor: "rgba(192, 132, 252, 0.5)",
  },
  toolIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  toolTextCol: {
    flex: 1,
  },
  toolTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  toolDesc: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 16,
  },
  previewContainer: {
    gap: 14,
  },
  canvasCard: {
    width: "100%",
    height: 240,
    borderRadius: 18,
    backgroundColor: "#06040a",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  canvasImage: {
    width: "100%",
    height: "100%",
  },
  canvasBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  canvasBadgeText: {
    color: "#c084fc",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  secondaryActionText: {
    color: "#c084fc",
    fontSize: 14,
    fontWeight: "600",
  },
  primaryAction: {
    flex: 1.2,
    backgroundColor: "#7c3aed",
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

