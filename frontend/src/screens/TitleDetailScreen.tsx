import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveTitleStatus } from "../api/events";
import type { WatchStatus } from "../api/events";
import { getPersonalTitle } from "../api/personal";
import type { PersonalTitle } from "../api/personal";
import {
  getTitleRatingSummary,
  getStoredTitle,
  getTmdbTitleDetails,
  importTmdbTitle,
} from "../api/titles";
import type { RatingSummary } from "../api/titles";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import { formatTitleType } from "../components/TitleRowList";
import TitlePoster from "../components/TitlePoster";
import type { SearchStackParamList } from "../navigation/SearchStack";
import { colors, radii } from "../theme";
import type { SelectableTitle, Title } from "../types/title";
import { isExternalTitle } from "../types/title";

type Props = NativeStackScreenProps<SearchStackParamList, "TitleDetail">;

const ACTIONS: Array<{ label: string; status: WatchStatus; primary?: boolean }> = [
  { label: "Mark as Watched", status: "WATCHED", primary: true },
  { label: "Want to Watch", status: "WANT" },
  { label: "Currently Watching", status: "WATCHING" },
];

export default function TitleDetailScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { title } = route.params;
  const [displayTitle, setDisplayTitle] = useState<SelectableTitle>(title);
  const [savingStatus, setSavingStatus] = useState<WatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);
  const [personal, setPersonal] = useState<PersonalTitle | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const localTitleId = useMemo(() => {
    if (!isExternalTitle(displayTitle)) return displayTitle.id;
    return displayTitle.local_title_id;
  }, [displayTitle]);

  useEffect(() => {
    const controller = new AbortController();
    setDisplayTitle(title);
    setIsSummaryLoading(true);
    const request = isExternalTitle(title)
      ? getTmdbTitleDetails(title.type, title.tmdb_id, controller.signal).then((details) => {
          setDisplayTitle(details);
          return {
            average_score: details.average_score,
            rating_count: details.rating_count,
          };
        })
      : getTitleRatingSummary(title.id, controller.signal);

    void request.then((summary) => {
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
  }, [title]);

  useFocusEffect(
    useCallback(() => {
      if (!token || !localTitleId) {
        setPersonal(null);
        return;
      }
      const controller = new AbortController();
      void Promise.all([
        getPersonalTitle(token, localTitleId, controller.signal),
        getTitleRatingSummary(localTitleId, controller.signal),
      ]).then(([nextPersonal, summary]) => {
        setPersonal(nextPersonal);
        setRatingSummary(summary);
      }).catch(() => {
        if (!controller.signal.aborted) setPersonal(null);
      });
      return () => controller.abort();
    }, [localTitleId, token])
  );

  async function resolveLocalTitle(): Promise<Title> {
    if (!isExternalTitle(displayTitle)) return displayTitle;
    if (!displayTitle.local_title_id) {
      throw new Error("Mark this title as watched and finish rating it first.");
    }
    return getStoredTitle(displayTitle.local_title_id);
  }

  async function openScoreEditor() {
    setIsMenuOpen(false);
    if (personal?.personal_score == null) {
      setError("Mark this title as watched and finish rating it before changing its score.");
      return;
    }
    try {
      const localTitle = await resolveLocalTitle();
      navigation.navigate("EditScore", { title: localTitle, currentScore: personal.personal_score });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not open score editor.");
    }
  }

  async function openReviewEditor() {
    setIsMenuOpen(false);
    if (personal?.status !== "WATCHED") {
      setError("Mark this title as watched before writing a review.");
      return;
    }
    try {
      navigation.navigate("WriteReview", { title: await resolveLocalTitle() });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not open review editor.");
    }
  }

  async function saveStatus(status: WatchStatus) {
    if (!token) return;
    setSavingStatus(status);
    setError(null);
    setSuccess(null);
    try {
      const localTitle: Title = isExternalTitle(displayTitle)
        ? await importTmdbTitle(token, displayTitle.tmdb_id, displayTitle.type)
        : displayTitle;
      await saveTitleStatus(token, localTitle.id, status);
      if (status === "WATCHED") {
        navigation.replace("Compare", { title: localTitle });
        return;
      }
      const label = ACTIONS.find((action) => action.status === status)?.label;
      setDisplayTitle(localTitle);
      setSuccess(`${localTitle.name} · ${label}`);
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
          trailing={
            <Pressable onPress={() => setIsMenuOpen(true)} hitSlop={12} style={styles.moreButton}>
              <Text style={styles.moreText}>•••</Text>
            </Pressable>
          }
        />

        <View style={styles.selectedCard}>
          <TitlePoster name={displayTitle.name} posterUrl={displayTitle.poster_url} width={88} height={128} />
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTitle}>{displayTitle.name}</Text>
            <Text style={styles.metadata}>
              {[
                displayTitle.year,
                formatTitleType(displayTitle.type),
                displayTitle.runtime_minutes ? `${displayTitle.runtime_minutes} min` : null,
              ].filter(Boolean).join(" · ")}
            </Text>
            {isExternalTitle(displayTitle) && displayTitle.genres.length ? (
              <Text style={styles.genres} numberOfLines={3}>
                {displayTitle.genres.join("  ·  ")}
              </Text>
            ) : !isExternalTitle(displayTitle) && displayTitle.genres ? (
              <Text style={styles.genres} numberOfLines={3}>
                {displayTitle.genres.split(",").join("  ·  ")}
              </Text>
            ) : null}
          </View>
        </View>

        {displayTitle.overview ? (
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>About</Text>
            <Text style={styles.overview}>{displayTitle.overview}</Text>
          </View>
        ) : null}

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

        {personal?.personal_score != null ? (
          <View style={styles.yourRating}>
            <View>
              <Text style={styles.yourRatingLabel}>Your score</Text>
              <Text style={styles.yourRatingHint}>Use ••• to change it or write a review</Text>
            </View>
            <Text style={styles.yourRatingScore}>{personal.personal_score.toFixed(1)}</Text>
          </View>
        ) : null}

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

      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsMenuOpen(false)}>
          <View style={styles.actionSheet}>
            <Text style={styles.sheetTitle}>{displayTitle.name}</Text>
            <Pressable style={styles.sheetAction} onPress={() => void openScoreEditor()}>
              <Text style={styles.sheetActionText}>Change score</Text>
              <Text style={styles.sheetActionMeta}>
                {personal?.personal_score != null ? personal.personal_score.toFixed(1) : "Rate first"}
              </Text>
            </Pressable>
            <Pressable style={styles.sheetAction} onPress={() => void openReviewEditor()}>
              <Text style={styles.sheetActionText}>
                {personal?.review ? "Edit review" : "Write review"}
              </Text>
              <Text style={styles.sheetChevron}>›</Text>
            </Pressable>
            <Pressable style={styles.cancelAction} onPress={() => setIsMenuOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  back: { color: colors.ink, fontSize: 32, lineHeight: 28, marginRight: 8 },
  moreButton: { minWidth: 42, minHeight: 34, alignItems: "center", justifyContent: "center" },
  moreText: { color: colors.ink, fontSize: 19, fontWeight: "900", letterSpacing: 1 },
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
  overviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: 13,
    marginBottom: 12,
  },
  overviewTitle: { color: colors.ink, fontSize: 14, fontWeight: "800", marginBottom: 5 },
  overview: { color: "#5F5A55", fontSize: 12, lineHeight: 18 },
  ratingCopy: { flex: 1 },
  ratingLabel: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  ratingCaption: { color: "#707070", fontSize: 11, marginTop: 3 },
  averageScore: { color: colors.ink, fontSize: 24, fontWeight: "900", marginLeft: 12 },
  yourRating: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.card,
    paddingHorizontal: 13,
    marginTop: -10,
    marginBottom: 20,
  },
  yourRatingLabel: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  yourRatingHint: { color: "#707070", fontSize: 11, marginTop: 3 },
  yourRatingScore: { color: colors.ink, fontSize: 23, fontWeight: "900" },
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
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(17,17,17,0.28)",
    padding: 12,
  },
  actionSheet: {
    borderRadius: 16,
    backgroundColor: colors.background,
    padding: 10,
    paddingBottom: 14,
  },
  sheetTitle: { color: "#707070", fontSize: 12, textAlign: "center", paddingVertical: 10 },
  sheetAction: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12,
  },
  sheetActionText: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  sheetActionMeta: { color: "#707070", fontSize: 14, fontWeight: "700" },
  sheetChevron: { color: "#707070", fontSize: 24 },
  cancelAction: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    marginTop: 9,
  },
  cancelText: { color: colors.background, fontSize: 14, fontWeight: "800" },
});
