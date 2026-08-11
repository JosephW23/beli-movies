import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveTitleStatus } from "../api/events";
import type { WatchStatus } from "../api/events";
import { getTitleRatingSummary } from "../api/titles";
import type { RatingSummary } from "../api/titles";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import { formatTitleType } from "../components/TitleRowList";
import TitlePoster from "../components/TitlePoster";
import type { AddStackParamList } from "../navigation/AddStack";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<AddStackParamList, "TitleDetail">;

const ACTIONS: Array<{ label: string; status: WatchStatus; primary?: boolean }> = [
  { label: "Mark as Watched", status: "WATCHED", primary: true },
  { label: "Want to Watch", status: "WANT" },
  { label: "Currently Watching", status: "WATCHING" },
];

export default function TitleDetailScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { title } = route.params;
  const [savingStatus, setSavingStatus] = useState<WatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setIsSummaryLoading(true);
    void getTitleRatingSummary(title.id, controller.signal)
      .then((summary) => {
        setRatingSummary(summary);
        setSummaryError(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setSummaryError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsSummaryLoading(false);
      });
    return () => controller.abort();
  }, [title.id]);

  async function saveStatus(status: WatchStatus) {
    if (!token) return;
    setSavingStatus(status);
    setError(null);
    setSuccess(null);
    try {
      await saveTitleStatus(token, title.id, status);
      if (status === "WATCHED") {
        navigation.replace("Compare", { title });
        return;
      }
      const label = ACTIONS.find((action) => action.status === status)?.label;
      setSuccess(`${title.name} · ${label}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not update title");
    } finally {
      setSavingStatus(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <AppScreenHeader
          title="Rate title"
          subtitle="Choose a status"
          leading={
            <Pressable onPress={navigation.goBack} hitSlop={12}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
          }
        />

        <View style={styles.selectedCard}>
          <TitlePoster name={title.name} posterUrl={title.poster_url} width={88} height={128} />
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTitle}>{title.name}</Text>
            <Text style={styles.metadata}>
              {[title.year, formatTitleType(title.type)].filter(Boolean).join(" · ")}
            </Text>
            {title.genres ? (
              <Text style={styles.genres} numberOfLines={3}>
                {title.genres.split(",").join("  ·  ")}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.ratingSummary}>
          <View style={styles.ratingCopy}>
            <Text style={styles.ratingLabel}>WATCHD average</Text>
            <Text style={styles.ratingCaption}>
              {summaryError
                ? "Average temporarily unavailable"
                : ratingSummary?.rating_count
                  ? `Based on ${ratingSummary.rating_count} ${ratingSummary.rating_count === 1 ? "rating" : "ratings"}`
                  : "Be the first to score this title"}
            </Text>
          </View>
          {isSummaryLoading ? (
            <ActivityIndicator size="small" color={colors.ink} />
          ) : (
            <Text style={styles.averageScore}>
              {ratingSummary?.average_score?.toFixed(1) ?? "—"}
            </Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Add to your list</Text>
        <View style={styles.actions}>
          {ACTIONS.map((action) => {
            const isSaving = savingStatus === action.status;
            return (
              <Pressable
                key={action.status}
                onPress={() => void saveStatus(action.status)}
                disabled={savingStatus !== null}
                style={({ pressed }) => [
                  styles.actionButton,
                  action.primary && styles.primaryButton,
                  pressed && styles.pressed,
                  savingStatus !== null && styles.disabled,
                ]}
              >
                {isSaving ? (
                  <ActivityIndicator color={action.primary ? colors.background : colors.ink} />
                ) : (
                  <Text style={[styles.actionText, action.primary && styles.primaryText]}>
                    {action.label}
                  </Text>
                )}
              </Pressable>
            );
          })}
        </View>
        {success ? <Text style={styles.success}>✓ {success}</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  back: { color: colors.ink, fontSize: 32, lineHeight: 28, marginRight: 8 },
  selectedCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 10,
    marginTop: 16,
    marginBottom: 12,
  },
  selectedInfo: { flex: 1, justifyContent: "center", marginLeft: 13 },
  selectedTitle: { color: colors.ink, fontSize: 19, lineHeight: 23, fontWeight: "800" },
  metadata: { color: "#707070", fontSize: 12, marginTop: 4 },
  genres: { color: "#5F5A55", fontSize: 12, lineHeight: 17, marginTop: 10 },
  ratingSummary: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    marginBottom: 20,
  },
  ratingCopy: { flex: 1 },
  ratingLabel: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  ratingCaption: { color: "#707070", fontSize: 11, marginTop: 3 },
  averageScore: { color: colors.ink, fontSize: 24, fontWeight: "900", marginLeft: 12 },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginBottom: 11 },
  actions: { gap: 8 },
  actionButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    borderColor: colors.ink,
    borderWidth: 1.2,
    backgroundColor: colors.background,
  },
  primaryButton: { backgroundColor: colors.ink },
  actionText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  primaryText: { color: colors.background },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  success: { color: colors.success, fontSize: 12, textAlign: "center", marginTop: 16 },
  error: { color: colors.error, fontSize: 12, textAlign: "center", marginTop: 16 },
});
