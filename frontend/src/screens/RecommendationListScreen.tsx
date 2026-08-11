import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { getRecommendations } from "../api/recommendations";
import type { Recommendation } from "../api/recommendations";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import type { AppTabsParamList } from "../navigation/AppTabs";
import type { HomeStackParamList } from "../navigation/HomeStack";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "Recommendations">;

export default function RecommendationListScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [titles, setTitles] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const load = useCallback(async (
    nextPage = 1,
    append = false,
    signal?: AbortSignal,
    refreshing = false
  ) => {
    if (!token) return;
    if (refreshing) setIsRefreshing(true);
    else if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      const next = await getRecommendations(token, 40, nextPage, signal);
      setTitles((current) => append ? mergeUnique(current, next) : next);
      setPage(nextPage);
      setHasMore(next.length > 0);
      setError(null);
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(requestError instanceof Error ? requestError.message : "Could not load recommendations.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  }, [token]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void load(1, false, controller.signal);
    return () => controller.abort();
  }, [load]));

  function loadMore() {
    if (isLoading || isLoadingMore || !hasMore) return;
    void load(page + 1, true);
  }

  function openTitle(title: Recommendation) {
    navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>()?.navigate("Search", {
      screen: "TitleDetail",
      params: { title },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void load(1, false, undefined, true)}
            tintColor={colors.ink}
          />
        }
        scrollEventThrottle={200}
        onScroll={({ nativeEvent }) => {
          if (
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - 300
          ) loadMore();
        }}
      >
        <AppScreenHeader
          title="For You"
          subtitle="Recommended from your taste"
          leading={
            <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
          }
        />

        {isLoading ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.ink} />
            <Text style={styles.statusText}>Finding titles for you…</Text>
          </View>
        ) : error ? (
          <Pressable style={styles.errorCard} onPress={() => void load()}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.retry}>Tap to retry</Text>
          </Pressable>
        ) : titles.length ? (
          <View style={styles.grid}>
            {titles.map((title) => (
              <Pressable
                key={title.id}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
                onPress={() => openTitle(title)}
              >
                <TitlePoster name={title.name} posterUrl={title.poster_url} width="100%" height={220} />
                <Text style={styles.title} numberOfLines={2}>{title.name}</Text>
                <Text style={styles.meta}>
                  {[title.year, title.type === "tv" ? "TV" : "Movie"].filter(Boolean).join(" · ")}
                </Text>
                <Text style={styles.reason} numberOfLines={3}>{title.reason}</Text>
              </Pressable>
            ))}
            {isLoadingMore ? (
              <View style={styles.moreLoader}><ActivityIndicator color={colors.ink} /></View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Build your taste profile</Text>
            <Text style={styles.statusText}>Rank more titles to unlock recommendations.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function mergeUnique(current: Recommendation[], next: Recommendation[]) {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 34 },
  back: { color: colors.ink, fontSize: 38, lineHeight: 38, fontWeight: "400" },
  status: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 10 },
  statusText: { color: "#707070", fontSize: 14, lineHeight: 20, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 22 },
  card: { width: "48%", marginBottom: 24 },
  moreLoader: { width: "48%", minHeight: 220, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontSize: 16, lineHeight: 20, fontWeight: "700", marginTop: 7 },
  meta: { color: "#707070", fontSize: 13, marginTop: 2 },
  reason: { color: "#5F5A55", fontSize: 12, lineHeight: 16, marginTop: 5 },
  errorCard: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#E4C7C3",
    borderRadius: radii.card,
    padding: 18,
    alignItems: "center",
  },
  errorText: { color: colors.error, fontSize: 13, textAlign: "center" },
  retry: { color: colors.error, fontSize: 13, fontWeight: "800", marginTop: 5 },
  emptyCard: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 20,
    backgroundColor: colors.surface,
  },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "800", textAlign: "center", marginBottom: 5 },
  pressed: { opacity: 0.7 },
});
