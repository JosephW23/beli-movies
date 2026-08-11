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
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyList } from "../api/events";
import type { MyList } from "../api/events";
import { getFeed } from "../api/social";
import type { FeedItem } from "../api/social";
import { getStoredTitle, getTrendingTitles } from "../api/titles";
import { useAuth } from "../auth/AuthContext";
import ActivityCard from "../components/ActivityCard";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import { colors, radii } from "../theme";
import type { AppTabsParamList } from "../navigation/AppTabs";
import type { ExternalTitle } from "../types/title";

const EMPTY_LIST: MyList = { want_to_watch: [], watched: [] };

type Props = BottomTabScreenProps<AppTabsParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [myList, setMyList] = useState<MyList>(EMPTY_LIST);
  const [recommendations, setRecommendations] = useState<ExternalTitle[]>([]);
  const [activities, setActivities] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(
    async (signal?: AbortSignal, refreshing = false) => {
      if (!token) return;
      refreshing ? setIsRefreshing(true) : setIsLoading(true);

      try {
        const [currentList, catalog, feed] = await Promise.all([
          getMyList(token, signal),
          getTrendingTitles(signal),
          getFeed(token, signal),
        ]);
        const savedTmdbSources = new Set([
          ...currentList.want_to_watch.map((title) => `${title.type}:${title.tmdb_id}`),
          ...currentList.watched.map((title) => `${title.type}:${title.tmdb_id}`),
        ]);
        setMyList(currentList);
        setRecommendations(
          catalog.filter(
            (title) => !savedTmdbSources.has(`${title.type}:${title.tmdb_id}`)
          )
        );
        setActivities(feed);
        setError(null);
      } catch (requestError) {
        if (!signal?.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load your feed"
          );
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void loadHome(controller.signal);
      return () => controller.abort();
    }, [loadHome])
  );

  function openExternalTitle(title: ExternalTitle) {
    navigation.navigate("Search", { screen: "TitleDetail", params: { title } });
  }

  async function openStoredTitle(titleId: number) {
    try {
      const title = await getStoredTitle(titleId);
      navigation.navigate("Search", { screen: "TitleDetail", params: { title } });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not open title");
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
      >
        <AppScreenHeader title="Home" subtitle="Feed" />

        <View style={styles.feedTabs}>
          {['For You', 'Following', 'Trending'].map((label, index) => (
            <View key={label} style={[styles.feedTab, index === 0 && styles.activeFeedTab]}>
              <Text style={[styles.feedTabText, index === 0 && styles.activeFeedTabText]}>
                {label}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>What should you watch?</Text>
            <Text style={styles.sectionCaption}>Top picks from your feed</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.ink} />
          </View>
        ) : recommendations.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.posterRow}
          >
            {recommendations.slice(0, 6).map((title) => (
              <Pressable
                key={title.id}
                style={({ pressed }) => [styles.posterItem, pressed && styles.pressed]}
                onPress={() => openExternalTitle(title)}
              >
                <TitlePoster
                  name={title.name}
                  posterUrl={title.poster_url}
                  width={92}
                  height={134}
                />
                <Text style={styles.posterTitle} numberOfLines={2}>{title.name}</Text>
                <Text style={styles.posterMeta}>{title.year ?? title.type}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyRecommendations}>
            <Text style={styles.emptyActivityTitle}>You’re all caught up.</Text>
            <Text style={styles.emptyActivityText}>
              Search the catalog to find another movie, show, or anime.
            </Text>
          </View>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.sectionCaption}>What’s moving on WATCHD</Text>
          </View>
        </View>

        <View style={styles.activityCard}>
          {isLoading ? (
            <View style={styles.activityLoading}>
              <ActivityIndicator size="small" color={colors.ink} />
              <Text style={styles.emptyActivityText}>Loading activity…</Text>
            </View>
          ) : activities.length ? (
            activities.slice(0, 10).map((activity, index, items) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                isLast={index === items.length - 1}
                onPress={() => void openStoredTitle(activity.title.id)}
              />
            ))
          ) : (
            <View style={styles.emptyActivity}>
              <Text style={styles.emptyActivityTitle}>Your feed is ready.</Text>
              <Text style={styles.emptyActivityText}>
                Add friends or rate a title to see activity here.
              </Text>
            </View>
          )}
        </View>

        {error ? (
          <Pressable onPress={() => void loadHome()} style={styles.errorCard}>
            <Text style={styles.errorText}>{error} · Tap to retry</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  feedTabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginTop: 14,
  },
  feedTab: { paddingHorizontal: 10, paddingVertical: 10, marginRight: 6 },
  activeFeedTab: { borderBottomWidth: 1.5, borderBottomColor: colors.ink },
  feedTabText: { color: "#707070", fontSize: 14, fontWeight: "600" },
  activeFeedTabText: { color: colors.ink },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 23,
    marginBottom: 11,
  },
  sectionTitle: { color: colors.ink, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  sectionCaption: { color: "#707070", fontSize: 14, marginTop: 3 },
  arrow: { color: "#707070", fontSize: 24 },
  loading: { height: 150, alignItems: "center", justifyContent: "center" },
  emptyRecommendations: {
    minHeight: 88,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
  },
  posterRow: { gap: 9, paddingRight: 16 },
  posterItem: { width: 92 },
  posterTitle: { color: colors.ink, fontSize: 15, lineHeight: 18, fontWeight: "700", marginTop: 6 },
  posterMeta: { color: "#707070", fontSize: 12, marginTop: 2 },
  activityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  activityLoading: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyActivity: { paddingHorizontal: 13, paddingVertical: 16 },
  emptyActivityTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  emptyActivityText: { color: "#707070", fontSize: 13, lineHeight: 18, marginTop: 4 },
  errorCard: {
    borderWidth: 1,
    borderColor: "#E4C7C3",
    borderRadius: radii.control,
    padding: 9,
    marginTop: 14,
  },
  errorText: { color: colors.error, fontSize: 12, textAlign: "center" },
  pressed: { opacity: 0.7 },
});
