import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { getComparisonCandidate, savePreference, saveTooTough } from "../api/ranking";
import { useAuth } from "../auth/AuthContext";
import BrandLogo from "../components/BrandLogo";
import TitlePoster from "../components/TitlePoster";
import { formatTitleType } from "../components/TitleRowList";
import type { SearchStackParamList } from "../navigation/SearchStack";
import { colors, radii } from "../theme";
import type { ComparisonTitle, RankingProgress } from "../types/ranking";

type Props = NativeStackScreenProps<SearchStackParamList, "Compare">;

export default function CompareScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { width } = useWindowDimensions();
  const [enjoyed, setEnjoyed] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<RankingProgress | null>(null);
  const [excludedIds, setExcludedIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardWidth = Math.min(188, (width - 54) / 2);
  const posterWidth = Math.max(108, cardWidth - 28);
  const posterHeight = Math.round(posterWidth * 1.48);

  const loadCandidate = useCallback(
    async (
      didEnjoy: boolean,
      nextExcludedIds: number[] = [],
      signal?: AbortSignal
    ) => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const next = await getComparisonCandidate(
          token,
          route.params.title.id,
          didEnjoy,
          nextExcludedIds,
          signal
        );
        setProgress(next);
      } catch (requestError) {
        if (!signal?.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load comparison."
          );
        }
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [route.params.title.id, token]
  );

  function answerEnjoyment(didEnjoy: boolean) {
    if (isLoading || isSubmitting) return;
    setEnjoyed(didEnjoy);
    setProgress(null);
    setExcludedIds([]);
    void loadCandidate(didEnjoy);
  }

  async function choose(preferredTitleId: number) {
    const comparisonTitle = progress?.comparison_title;
    if (!token || !comparisonTitle || enjoyed === null || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const next = await savePreference(
        token,
        progress.new_title.id,
        comparisonTitle.id,
        preferredTitleId,
        enjoyed
      );
      setProgress(next);
      setExcludedIds([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save preference."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function skipComparison() {
    const comparisonId = progress?.comparison_title?.id;
    if (!comparisonId || isLoading || isSubmitting) return;
    if (excludedIds.length + 1 >= progress.total_ranked) {
      setError("No other titles are available. Choose one or tap Too tough.");
      return;
    }
    const nextExcluded = [...excludedIds, comparisonId];
    setExcludedIds(nextExcluded);
    if (enjoyed !== null) void loadCandidate(enjoyed, nextExcluded);
  }

  async function chooseTooTough() {
    const comparisonTitle = progress?.comparison_title;
    if (!token || !comparisonTitle || enjoyed === null || isSubmitting) return;
    if (excludedIds.length + 1 < progress.total_ranked) {
      const nextExcluded = [...excludedIds, comparisonTitle.id];
      setExcludedIds(nextExcluded);
      void loadCandidate(enjoyed, nextExcluded);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      setProgress(
        await saveTooTough(
          token,
          progress.new_title.id,
          comparisonTitle.id,
          enjoyed
        )
      );
      setExcludedIds([]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save close comparison."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const dots = useMemo(
    () => Math.min(5, Math.max(1, progress?.estimated_comparisons ?? 1)),
    [progress?.estimated_comparisons]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={navigation.goBack} hitSlop={12} style={styles.headerButton}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <BrandLogo style={styles.logo} />
          <View style={styles.headerButton} />
        </View>

        {enjoyed === null ? (
          <>
            <WatchedTitleCard
              title={route.params.title}
              onClose={() => navigation.navigate("SearchHome")}
            />
            <View style={styles.enjoymentCard}>
              <Text style={styles.enjoymentQuestion}>Did you enjoy the WATCHD?</Text>
              <View style={styles.enjoymentActions}>
                <Pressable
                  onPress={() => answerEnjoyment(true)}
                  style={({ pressed }) => [styles.yesButton, pressed && styles.pressed]}
                >
                  <Text style={styles.yesButtonText}>Yes</Text>
                </Pressable>
                <Pressable
                  onPress={() => answerEnjoyment(false)}
                  style={({ pressed }) => [styles.noButton, pressed && styles.pressed]}
                >
                  <Text style={styles.noButtonText}>No</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : isLoading && !progress ? (
          <>
            <WatchedTitleCard
              title={route.params.title}
              onClose={() => navigation.navigate("SearchHome")}
            />
            <View style={styles.centerState}>
              <ActivityIndicator color={colors.ink} />
              <Text style={styles.stateText}>Preparing your comparisons…</Text>
            </View>
          </>
        ) : progress?.complete ? (
          <CompletionCard
            progress={progress}
            onDone={() => navigation.navigate("SearchHome")}
            onReview={() => navigation.navigate("WriteReview", {
              title: route.params.title,
              finishFlow: true,
            })}
          />
        ) : progress?.comparison_title ? (
          <>
            <WatchedTitleCard
              title={progress.new_title}
              onClose={() => navigation.navigate("SearchHome")}
            />

            <Text style={styles.question}>Which do you prefer?</Text>
            <Text style={styles.helper}>
              Quick comparisons help us place this title in your rankings and calculate your score.
            </Text>

            <View style={styles.choices}>
              <TitleChoice
                title={progress.new_title}
                width={cardWidth}
                posterWidth={posterWidth}
                posterHeight={posterHeight}
                disabled={isSubmitting}
                onPress={() => void choose(progress.new_title.id)}
              />
              <TitleChoice
                title={progress.comparison_title}
                width={cardWidth}
                posterWidth={posterWidth}
                posterHeight={posterHeight}
                disabled={isSubmitting}
                onPress={() => void choose(progress.comparison_title?.id ?? 0)}
              />
              <View style={styles.orBadge}><Text style={styles.orText}>OR</Text></View>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.dots}>
                {Array.from({ length: dots }).map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.dot,
                      index === Math.min(progress.comparison_number - 1, dots - 1) && styles.activeDot,
                    ]}
                  />
                ))}
              </View>
              <Text style={styles.progressText}>
                Comparison {progress.comparison_number} of about {progress.estimated_comparisons}
              </Text>
            </View>

            <View style={styles.actions}>
              <Pressable onPress={navigation.goBack} hitSlop={8}>
                <Text style={styles.secondaryAction}>‹ Back</Text>
              </Pressable>
              <Pressable
                onPress={() => void chooseTooTough()}
                disabled={isLoading || isSubmitting}
                style={({ pressed }) => [styles.toughButton, pressed && styles.pressed]}
              >
                <Text style={styles.toughText}>Too tough</Text>
              </Pressable>
              <Pressable onPress={skipComparison} disabled={isLoading || isSubmitting} hitSlop={8}>
                <Text style={styles.secondaryAction}>Skip ›</Text>
              </Pressable>
            </View>

            {isSubmitting || isLoading ? (
              <View style={styles.savingRow}>
                <ActivityIndicator size="small" color={colors.ink} />
                <Text style={styles.stateText}>
                  {isSubmitting ? "Saving your preference…" : "Finding another title…"}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}

        {error ? (
          <Pressable
            style={styles.errorCard}
            onPress={() => enjoyed !== null && void loadCandidate(enjoyed, excludedIds)}
          >
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retryText}>Tap to retry</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      {!progress?.complete ? (
        <View style={styles.footer}>
          <Text style={styles.sparkle}>✧</Text>
          <Text style={styles.footerText}>
            {enjoyed === null
              ? "Log it your way."
              : "We’ll calculate your rating after a few quick comparisons."}
          </Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function WatchedTitleCard({
  title,
  onClose,
}: {
  title: ComparisonTitle;
  onClose: () => void;
}) {
  return (
    <View style={styles.watchedCard}>
      <TitlePoster
        name={title.name}
        posterUrl={title.poster_url}
        width={58}
        height={84}
      />
      <View style={styles.watchedCopy}>
        <Text style={styles.watchedTitle}>{title.name}</Text>
        <Text style={styles.metadata}>{titleMetadata(title)}</Text>
      </View>
      <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
        <Text style={styles.close}>×</Text>
      </Pressable>
    </View>
  );
}

function TitleChoice({
  title,
  width,
  posterWidth,
  posterHeight,
  disabled,
  onPress,
}: {
  title: ComparisonTitle;
  width: number;
  posterWidth: number;
  posterHeight: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choiceCard,
        { width },
        pressed && styles.choicePressed,
        disabled && styles.disabled,
      ]}
    >
      <TitlePoster
        name={title.name}
        posterUrl={title.poster_url}
        width={posterWidth}
        height={posterHeight}
      />
      <Text style={styles.choiceTitle} numberOfLines={2}>{title.name}</Text>
      <Text style={styles.metadata}>{titleMetadata(title)}</Text>
    </Pressable>
  );
}

function CompletionCard({
  progress,
  onDone,
  onReview,
}: {
  progress: RankingProgress;
  onDone: () => void;
  onReview: () => void;
}) {
  return (
    <View style={styles.completeContent}>
      <View style={styles.successMark}><Text style={styles.successMarkText}>✓</Text></View>
      <Text style={styles.completeEyebrow}>ADDED TO YOUR RANKINGS</Text>
      <TitlePoster
        name={progress.new_title.name}
        posterUrl={progress.new_title.poster_url}
        width={112}
        height={164}
      />
      <Text style={styles.completeTitle}>{progress.new_title.name}</Text>
      <Text style={styles.ratingLabel}>Your rating</Text>
      <Text style={styles.score}>{progress.score?.toFixed(1)}</Text>
      <Text style={styles.rank}>#{progress.rank_position} in your rankings</Text>
      <Text style={styles.reviewPrompt}>Want to say more?</Text>
      <Pressable onPress={onReview} style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}>
        <Text style={styles.doneText}>Write a review</Text>
      </Pressable>
      <Pressable onPress={onDone} style={styles.notNowButton}>
        <Text style={styles.notNowText}>Not now</Text>
      </Pressable>
    </View>
  );
}

function titleMetadata(title: ComparisonTitle) {
  return [title.year, formatTitleType(title.type)].filter(Boolean).join("  •  ");
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 14, paddingBottom: 24 },
  header: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerButton: { width: 42, alignItems: "flex-start" },
  back: { color: colors.ink, fontSize: 38, lineHeight: 38, fontWeight: "300" },
  logo: { fontSize: 27 },
  watchedCard: {
    minHeight: 102,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 10,
    marginTop: 6,
  },
  watchedCopy: { flex: 1, marginLeft: 14 },
  watchedTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  metadata: { color: "#707070", fontSize: 12, marginTop: 5 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  close: { color: colors.ink, fontSize: 24, lineHeight: 25 },
  enjoymentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: 18,
    marginTop: 20,
  },
  enjoymentQuestion: {
    color: colors.ink,
    fontSize: 23,
    fontWeight: "800",
    textAlign: "center",
  },
  enjoymentActions: { flexDirection: "row", gap: 10, marginTop: 22 },
  yesButton: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: colors.ink,
  },
  yesButtonText: { color: colors.background, fontSize: 16, fontWeight: "800" },
  noButton: {
    flex: 1,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
  },
  noButtonText: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  question: { color: colors.ink, fontSize: 22, fontWeight: "800", marginTop: 24 },
  helper: { color: "#707070", fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 12 },
  choices: { flexDirection: "row", justifyContent: "space-between", position: "relative" },
  choiceCard: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingTop: 14,
    paddingBottom: 13,
  },
  choicePressed: { borderColor: colors.ink, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.62 },
  choiceTitle: { color: colors.ink, fontSize: 15, lineHeight: 19, fontWeight: "800", textAlign: "center", marginTop: 10 },
  orBadge: {
    position: "absolute",
    left: "50%",
    top: "42%",
    width: 48,
    height: 48,
    marginLeft: -24,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  orText: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  progressRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 16 },
  dots: { flexDirection: "row", gap: 9, marginRight: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#CFCFCF" },
  activeDot: { backgroundColor: colors.ink },
  progressText: { color: "#707070", fontSize: 11 },
  actions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18 },
  secondaryAction: { color: colors.ink, fontSize: 14, fontWeight: "600" },
  toughButton: {
    minWidth: 132,
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.card,
  },
  toughText: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  savingRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 15 },
  centerState: { minHeight: 440, alignItems: "center", justifyContent: "center", gap: 12 },
  stateText: { color: "#707070", fontSize: 13 },
  errorCard: { borderWidth: 1, borderColor: colors.error, borderRadius: radii.card, padding: 12, marginTop: 16 },
  errorText: { color: colors.error, fontSize: 13, textAlign: "center" },
  retryText: { color: colors.error, fontSize: 12, fontWeight: "700", textAlign: "center", marginTop: 4 },
  footer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 18,
  },
  sparkle: { color: "#D89B2B", fontSize: 24, marginRight: 10 },
  footerText: { flexShrink: 1, color: "#707070", fontSize: 11 },
  completeContent: { alignItems: "center", paddingTop: 44 },
  successMark: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.success },
  successMarkText: { color: colors.background, fontSize: 18, fontWeight: "800" },
  completeEyebrow: { color: colors.success, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginTop: 13, marginBottom: 18 },
  completeTitle: { color: colors.ink, fontSize: 23, fontWeight: "800", textAlign: "center", marginTop: 14 },
  ratingLabel: { color: "#707070", fontSize: 14, marginTop: 20 },
  score: { color: colors.ink, fontSize: 58, lineHeight: 66, fontWeight: "900" },
  rank: { color: colors.ink, fontSize: 15, fontWeight: "700", marginTop: 2 },
  reviewPrompt: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 24 },
  doneButton: { width: "100%", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: colors.ink, marginTop: 12 },
  doneText: { color: colors.background, fontSize: 15, fontWeight: "800" },
  notNowButton: { minHeight: 42, alignItems: "center", justifyContent: "center" },
  notNowText: { color: "#707070", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
