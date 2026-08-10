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
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyList } from "../api/events";
import type { MyList, SavedTitle } from "../api/events";
import { searchTitles } from "../api/titles";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import { colors, radii } from "../theme";
import type { Title } from "../types/title";

const EMPTY_LIST: MyList = { want_to_watch: [], watched: [] };

export default function HomeScreen() {
  const { token } = useAuth();
  const [myList, setMyList] = useState<MyList>(EMPTY_LIST);
  const [recommendations, setRecommendations] = useState<Title[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHome = useCallback(
    async (signal?: AbortSignal, refreshing = false) => {
      if (!token) return;
      refreshing ? setIsRefreshing(true) : setIsLoading(true);

      try {
        const [currentList, catalog] = await Promise.all([
          getMyList(token, signal),
          searchTitles("", signal),
        ]);
        const savedIds = new Set([
          ...currentList.want_to_watch.map((title) => title.id),
          ...currentList.watched.map((title) => title.id),
        ]);
        setMyList(currentList);
        setRecommendations(catalog.filter((title) => !savedIds.has(title.id)));
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

  const savedActivity = [...myList.watched, ...myList.want_to_watch]
    .sort((left, right) => right.saved_at.localeCompare(left.saved_at))
    .slice(0, 3);

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
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.posterRow}
          >
            {recommendations.slice(0, 6).map((title) => (
              <View key={title.id} style={styles.posterItem}>
                <TitlePoster
                  name={title.name}
                  posterUrl={title.poster_url}
                  width={92}
                  height={134}
                />
                <Text style={styles.posterTitle} numberOfLines={2}>{title.name}</Text>
                <Text style={styles.posterMeta}>{title.year ?? title.type}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Activity</Text>
            <Text style={styles.sectionCaption}>What’s moving on WATCHD</Text>
          </View>
        </View>

        <View style={styles.activityCard}>
          {savedActivity.length > 0
            ? savedActivity.map((title, index) => (
                <ActivityRow
                  key={title.event_id}
                  title={title}
                  action={title.status === 'WATCHED' ? 'marked as watched' : 'saved for later'}
                  isLast={index === savedActivity.length - 1}
                />
              ))
            : recommendations.slice(2, 5).map((title, index, items) => (
                <ActivityRow
                  key={title.id}
                  title={title}
                  action="is popular on WATCHD"
                  isLast={index === items.length - 1}
                />
              ))}
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

function ActivityRow({
  title,
  action,
  isLast,
}: {
  title: Title | SavedTitle;
  action: string;
  isLast: boolean;
}) {
  return (
    <View style={[styles.activityRow, isLast && styles.lastActivityRow]}>
      <View style={styles.avatar}><Text style={styles.avatarText}>W</Text></View>
      <TitlePoster name={title.name} posterUrl={title.poster_url} width={34} height={48} />
      <View style={styles.activityCopy}>
        <Text style={styles.activityName} numberOfLines={1}>{title.name}</Text>
        <Text style={styles.activityText}>{action}</Text>
      </View>
      <Text style={styles.activityTime}>now</Text>
    </View>
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
  feedTab: { paddingHorizontal: 10, paddingVertical: 8, marginRight: 6 },
  activeFeedTab: { borderBottomWidth: 1.5, borderBottomColor: colors.ink },
  feedTabText: { color: colors.secondary, fontSize: 9, fontWeight: "600" },
  activeFeedTabText: { color: colors.ink },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 23,
    marginBottom: 11,
  },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800" },
  sectionCaption: { color: colors.secondary, fontSize: 9, marginTop: 2 },
  arrow: { color: colors.secondary, fontSize: 19 },
  loading: { height: 150, alignItems: "center", justifyContent: "center" },
  posterRow: { gap: 9, paddingRight: 16 },
  posterItem: { width: 92 },
  posterTitle: { color: colors.ink, fontSize: 10, lineHeight: 13, fontWeight: "700", marginTop: 5 },
  posterMeta: { color: colors.secondary, fontSize: 8, marginTop: 2 },
  activityCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  activityRow: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastActivityRow: { borderBottomWidth: 0 },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    marginRight: 8,
  },
  avatarText: { color: colors.background, fontSize: 9, fontWeight: "800" },
  activityCopy: { flex: 1, marginLeft: 9 },
  activityName: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  activityText: { color: colors.secondary, fontSize: 9, marginTop: 2 },
  activityTime: { color: colors.secondary, fontSize: 8 },
  errorCard: {
    borderWidth: 1,
    borderColor: "#E4C7C3",
    borderRadius: radii.control,
    padding: 9,
    marginTop: 14,
  },
  errorText: { color: colors.error, fontSize: 9, textAlign: "center" },
});
