import React, { useCallback, useMemo, useState } from "react";
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
import { getFeed, getFriends } from "../api/social";
import type { FeedItem, SocialUser } from "../api/social";
import { getStoredTitle, getTrendingTitles } from "../api/titles";
import { useAuth } from "../auth/AuthContext";
import ActivityCard from "../components/ActivityCard";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import type { AppTabsParamList } from "../navigation/AppTabs";
import type { HomeStackParamList } from "../navigation/HomeStack";
import { colors, radii } from "../theme";
import type { ExternalTitle } from "../types/title";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeFeed">;
type FeedTab = "for-you" | "following" | "trending";

const tabs: { key: FeedTab; label: string }[] = [
  { key: "for-you", label: "For You" },
  { key: "following", label: "Following" },
  { key: "trending", label: "Trending" },
];

export default function HomeScreen({ navigation }: Props) {
  const { token } = useAuth();
  const tabNavigation = navigation.getParent<BottomTabNavigationProp<AppTabsParamList>>();
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activities, setActivities] = useState<FeedItem[]>([]);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [trending, setTrending] = useState<ExternalTitle[]>([]);
  const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(true);
  const [isSocialLoading, setIsSocialLoading] = useState(true);
  const [isTrendingLoading, setIsTrendingLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [trendingError, setTrendingError] = useState<string | null>(null);
  const [recommendationPage, setRecommendationPage] = useState(1);
  const [trendingPage, setTrendingPage] = useState(1);
  const [isLoadingMoreRecommendations, setIsLoadingMoreRecommendations] = useState(false);
  const [isLoadingMoreTrending, setIsLoadingMoreTrending] = useState(false);
  const [hasMoreRecommendations, setHasMoreRecommendations] = useState(true);
  const [hasMoreTrending, setHasMoreTrending] = useState(true);

  const friendActivities = useMemo(() => {
    const friendIds = new Set(friends.map((friend) => friend.id));
    return activities.filter((activity) => friendIds.has(activity.user.id));
  }, [activities, friends]);

  const loadRecommendations = useCallback(async (
    page = 1,
    append = false,
    signal?: AbortSignal
  ) => {
    if (!token) return;
    if (append) setIsLoadingMoreRecommendations(true);
    else setIsRecommendationsLoading(true);
    try {
      const next = await getRecommendations(token, 20, page, signal);
      setRecommendations((current) => append ? mergeUnique(current, next) : next);
      setRecommendationPage(page);
      setHasMoreRecommendations(next.length > 0);
      setRecommendationsError(null);
    } catch (requestError) {
      if (!signal?.aborted) {
        setRecommendationsError(requestError instanceof Error ? requestError.message : "Could not load recommendations.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsRecommendationsLoading(false);
        setIsLoadingMoreRecommendations(false);
      }
    }
  }, [token]);

  const loadSocial = useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    setIsSocialLoading(true);
    try {
      const [nextActivities, nextFriends] = await Promise.all([
        getFeed(token, signal),
        getFriends(token, signal),
      ]);
      setActivities(nextActivities);
      setFriends(nextFriends);
      setSocialError(null);
    } catch (requestError) {
      if (!signal?.aborted) {
        setSocialError(requestError instanceof Error ? requestError.message : "Could not load activity.");
      }
    } finally {
      if (!signal?.aborted) setIsSocialLoading(false);
    }
  }, [token]);

  const loadTrending = useCallback(async (
    page = 1,
    append = false,
    signal?: AbortSignal
  ) => {
    if (append) setIsLoadingMoreTrending(true);
    else setIsTrendingLoading(true);
    try {
      const next = await getTrendingTitles(page, signal);
      setTrending((current) => append ? mergeUnique(current, next) : next);
      setTrendingPage(page);
      setHasMoreTrending(next.length > 0);
      setTrendingError(null);
    } catch (requestError) {
      if (!signal?.aborted) {
        setTrendingError(requestError instanceof Error ? requestError.message : "Could not load trending titles.");
      }
    } finally {
      if (!signal?.aborted) {
        setIsTrendingLoading(false);
        setIsLoadingMoreTrending(false);
      }
    }
  }, []);

  const loadHome = useCallback(async (signal?: AbortSignal, refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    await Promise.all([
      loadRecommendations(1, false, signal),
      loadSocial(signal),
      loadTrending(1, false, signal),
    ]);
    if (!signal?.aborted) setIsRefreshing(false);
  }, [loadRecommendations, loadSocial, loadTrending]);

  useFocusEffect(useCallback(() => {
    const controller = new AbortController();
    void loadHome(controller.signal);
    return () => controller.abort();
  }, [loadHome]));

  function loadMoreRecommendations() {
    if (!hasMoreRecommendations || isLoadingMoreRecommendations || isRecommendationsLoading) return;
    void loadRecommendations(recommendationPage + 1, true);
  }

  function loadMoreTrending() {
    if (!hasMoreTrending || isLoadingMoreTrending || isTrendingLoading) return;
    void loadTrending(trendingPage + 1, true);
  }

  function openExternalTitle(title: ExternalTitle) {
    tabNavigation?.navigate("Search", { screen: "TitleDetail", params: { title } });
  }

  async function openStoredTitle(titleId: number) {
    try {
      const title = await getStoredTitle(titleId);
      tabNavigation?.navigate("Search", { screen: "TitleDetail", params: { title } });
    } catch (requestError) {
      setSocialError(requestError instanceof Error ? requestError.message : "Could not open title.");
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => void loadHome(undefined, true)}
            tintColor={colors.ink}
          />
        }
        scrollEventThrottle={200}
        onScroll={({ nativeEvent }) => {
          if (
            activeTab === "trending" &&
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
              nativeEvent.contentSize.height - 280
          ) {
            loadMoreTrending();
          }
        }}
      >
        <AppScreenHeader title="Home" subtitle="Feed" />

        <View style={styles.feedTabs}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.feedTab, isActive && styles.activeFeedTab]}
              >
                <Text style={[styles.feedTabText, isActive && styles.activeFeedTabText]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {activeTab === "for-you" ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.sectionHeading, pressed && styles.pressed]}
              onPress={() => navigation.navigate("Recommendations")}
            >
              <View>
                <Text style={styles.sectionTitle}>For You</Text>
                <Text style={styles.sectionCaption}>Picked from your rankings</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </Pressable>

            {isRecommendationsLoading ? (
              <LoadingState label="Loading recommendations…" />
            ) : recommendationsError ? (
              <ErrorState message={recommendationsError} onRetry={() => void loadRecommendations()} />
            ) : recommendations.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.posterRow}
                onMomentumScrollEnd={({ nativeEvent }) => {
                  if (
                    nativeEvent.layoutMeasurement.width + nativeEvent.contentOffset.x >=
                    nativeEvent.contentSize.width - 180
                  ) loadMoreRecommendations();
                }}
              >
                {recommendations.map((title) => (
                  <PosterCard key={title.id} title={title} reason={title.reason} onPress={() => openExternalTitle(title)} />
                ))}
                {isLoadingMoreRecommendations ? <MoreLoader /> : null}
              </ScrollView>
            ) : (
              <EmptyState title="Build your taste profile" body="Rank more titles to improve your recommendations." />
            )}

            <SectionHeading title="Activity" caption="What’s moving on WATCHD" />
            <ActivityList
              loading={isSocialLoading}
              activities={activities}
              emptyTitle="Your feed is ready."
              emptyBody="Add friends or rate a title to see activity here."
              onOpenTitle={openStoredTitle}
            />
            {socialError ? <ErrorState message={socialError} onRetry={() => void loadSocial()} compact /> : null}
          </>
        ) : null}

        {activeTab === "following" ? (
          <>
            <SectionHeading title="Following" caption="What your friends are watching" />
            {isSocialLoading ? (
              <LoadingState label="Loading friends…" />
            ) : socialError ? (
              <ErrorState message={socialError} onRetry={() => void loadSocial()} />
            ) : friends.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>Your friends will appear here</Text>
                <Text style={styles.emptyText}>Add friends to see what they watch, rate, and rank.</Text>
                <Pressable style={styles.primaryButton} onPress={() => tabNavigation?.navigate("Profile")}>
                  <Text style={styles.primaryButtonText}>Add friends</Text>
                </Pressable>
              </View>
            ) : (
              <ActivityList
                loading={false}
                activities={friendActivities}
                emptyTitle="Nothing new yet"
                emptyBody="Your friends haven’t logged a title yet."
                onOpenTitle={openStoredTitle}
              />
            )}
          </>
        ) : null}

        {activeTab === "trending" ? (
          <>
            <SectionHeading title="Trending Now" caption="Popular this week on TMDb" />
            {isTrendingLoading ? (
              <LoadingState label="Loading what’s trending…" />
            ) : trendingError ? (
              <ErrorState message={trendingError} onRetry={() => void loadTrending()} />
            ) : trending.length ? (
              <View style={styles.trendingGrid}>
                {trending.map((title) => (
                  <PosterCard key={title.id} title={title} onPress={() => openExternalTitle(title)} wide />
                ))}
                {isLoadingMoreTrending ? <MoreLoader wide /> : null}
              </View>
            ) : (
              <EmptyState title="Nothing is trending yet" body="Pull down to check again." />
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function mergeUnique<T extends { id: string }>(current: T[], next: T[]): T[] {
  const seen = new Set(current.map((item) => item.id));
  return [...current, ...next.filter((item) => !seen.has(item.id))];
}

function MoreLoader({ wide = false }: { wide?: boolean }) {
  return (
    <View style={wide ? styles.wideMoreLoader : styles.moreLoader}>
      <ActivityIndicator size="small" color={colors.ink} />
    </View>
  );
}

function SectionHeading({ title, caption }: { title: string; caption: string }) {
  return (
    <View style={styles.sectionHeading}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCaption}>{caption}</Text>
      </View>
    </View>
  );
}

function PosterCard({
  title,
  reason,
  onPress,
  wide = false,
}: {
  title: ExternalTitle;
  reason?: string;
  onPress: () => void;
  wide?: boolean;
}) {
  return (
    <Pressable style={({ pressed }) => [wide ? styles.widePosterItem : styles.posterItem, pressed && styles.pressed]} onPress={onPress}>
      <TitlePoster name={title.name} posterUrl={title.poster_url} width={wide ? 160 : 100} height={wide ? 234 : 146} />
      <Text style={styles.posterTitle} numberOfLines={2}>{title.name}</Text>
      <Text style={styles.posterMeta}>
        {[title.year, title.type === "tv" ? "TV" : "Movie"].filter(Boolean).join(" · ")}
      </Text>
      {reason ? <Text style={styles.reason} numberOfLines={2}>{reason}</Text> : null}
    </Pressable>
  );
}

function ActivityList({
  loading,
  activities,
  emptyTitle,
  emptyBody,
  onOpenTitle,
}: {
  loading: boolean;
  activities: FeedItem[];
  emptyTitle: string;
  emptyBody: string;
  onOpenTitle: (titleId: number) => void;
}) {
  return (
    <View style={styles.activityCard}>
      {loading ? (
        <View style={styles.activityLoading}>
          <ActivityIndicator size="small" color={colors.ink} />
          <Text style={styles.emptyText}>Loading activity…</Text>
        </View>
      ) : activities.length ? (
        activities.slice(0, 20).map((activity, index, items) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            isLast={index === items.length - 1}
            onPress={() => onOpenTitle(activity.title.id)}
          />
        ))
      ) : (
        <View style={styles.emptyActivity}>
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptyText}>{emptyBody}</Text>
        </View>
      )}
    </View>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="small" color={colors.ink} />
      <Text style={styles.loadingText}>{label}</Text>
    </View>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{body}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry, compact = false }: { message: string; onRetry: () => void; compact?: boolean }) {
  return (
    <Pressable onPress={onRetry} style={[styles.errorCard, compact && styles.compactError]}>
      <Text style={styles.errorText}>{message}</Text>
      <Text style={styles.retryText}>Tap to retry</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 32 },
  feedTabs: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border, marginTop: 14 },
  feedTab: { paddingHorizontal: 10, paddingVertical: 11, marginRight: 7 },
  activeFeedTab: { borderBottomWidth: 2, borderBottomColor: colors.ink },
  feedTabText: { color: "#707070", fontSize: 14, fontWeight: "600" },
  activeFeedTabText: { color: colors.ink, fontWeight: "800" },
  sectionHeading: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 23, marginBottom: 11 },
  sectionTitle: { color: colors.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  sectionCaption: { color: "#707070", fontSize: 14, marginTop: 3 },
  arrow: { color: colors.ink, fontSize: 30, lineHeight: 30, paddingHorizontal: 7 },
  loading: { minHeight: 150, alignItems: "center", justifyContent: "center", gap: 8 },
  loadingText: { color: "#707070", fontSize: 13 },
  posterRow: { gap: 10, paddingRight: 16 },
  posterItem: { width: 100 },
  widePosterItem: { width: 160, marginBottom: 24 },
  moreLoader: { width: 70, height: 146, alignItems: "center", justifyContent: "center" },
  wideMoreLoader: { width: 160, height: 234, alignItems: "center", justifyContent: "center" },
  trendingGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  posterTitle: { color: colors.ink, fontSize: 15, lineHeight: 19, fontWeight: "700", marginTop: 6 },
  posterMeta: { color: "#707070", fontSize: 12, marginTop: 2 },
  reason: { color: "#5F5A55", fontSize: 11, lineHeight: 14, marginTop: 4 },
  activityCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.surface, overflow: "hidden" },
  activityLoading: { minHeight: 78, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  emptyActivity: { paddingHorizontal: 14, paddingVertical: 18 },
  emptyCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.surface, padding: 18 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  emptyText: { color: "#707070", fontSize: 14, lineHeight: 20, marginTop: 4 },
  primaryButton: { backgroundColor: colors.ink, borderRadius: radii.control, alignItems: "center", paddingVertical: 12, marginTop: 16 },
  primaryButtonText: { color: colors.background, fontSize: 14, fontWeight: "800" },
  errorCard: { minHeight: 90, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#E4C7C3", borderRadius: radii.card, padding: 13 },
  compactError: { minHeight: 58, marginTop: 14 },
  errorText: { color: colors.error, fontSize: 13, textAlign: "center" },
  retryText: { color: colors.error, fontSize: 12, fontWeight: "800", marginTop: 3 },
  pressed: { opacity: 0.68 },
});
