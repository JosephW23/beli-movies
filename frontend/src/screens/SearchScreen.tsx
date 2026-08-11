import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";

import { searchTitles } from "../api/titles";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import type { AppTabsParamList } from "../navigation/AppTabs";
import { colors, radii } from "../theme";
import type { Title } from "../types/title";

type Filter = "All" | "Movies" | "TV Shows" | "Anime";
type Props = BottomTabScreenProps<AppTabsParamList, "Search">;
const FILTERS: Filter[] = ["All", "Movies", "TV Shows", "Anime"];

export default function SearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [titles, setTitles] = useState<Title[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsLoading(true);
      void searchTitles(query, controller.signal)
        .then((items) => {
          setTitles(items);
          setError(null);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) {
            setError(requestError instanceof Error ? requestError.message : "Search failed");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visibleTitles = useMemo(() => {
    if (filter === "Movies") return titles.filter((title) => title.type === "movie");
    if (filter === "TV Shows") return titles.filter((title) => title.type === "tv");
    if (filter === "Anime") {
      return titles.filter((title) => title.genres?.includes("animation"));
    }
    return titles;
  }, [filter, titles]);

  const genres = Array.from(
    new Set(titles.flatMap((title) => title.genres?.split(",") ?? []))
  ).slice(0, 6);

  function openTitle(title: Title) {
    navigation.navigate("Add", { screen: "TitleDetail", params: { title } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <AppScreenHeader title="Search" subtitle="Discover" />

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies, shows, anime..."
            placeholderTextColor={colors.secondary}
            autoCorrect={false}
            style={styles.searchInput}
          />
        </View>

        <View style={styles.filters}>
          {FILTERS.map((label) => (
            <Text
              key={label}
              onPress={() => setFilter(label)}
              style={[styles.filter, filter === label && styles.activeFilter]}
            >
              {label}
            </Text>
          ))}
        </View>

        {isLoading ? (
          <View style={styles.loading}><ActivityIndicator size="small" color={colors.ink} /></View>
        ) : query ? (
          <CatalogGrid title="Search results" titles={visibleTitles} onPress={openTitle} />
        ) : (
          <>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Trending Now</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trending}>
              {visibleTitles.slice(0, 4).map((title) => (
                <Pressable key={title.id} style={styles.trendingItem} onPress={() => openTitle(title)}>
                  <TitlePoster name={title.name} posterUrl={title.poster_url} width={88} height={128} />
                  <Text style={styles.posterTitle} numberOfLines={2}>{title.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <CatalogGrid title="Popular on WATCHD" titles={visibleTitles.slice(4, 10)} onPress={openTitle} />

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Genres</Text>
            </View>
            <View style={styles.genres}>
              {genres.map((genre) => (
                <View key={genre} style={styles.genreChip}>
                  <Text style={styles.genreText}>{genre}</Text>
                </View>
              ))}
            </View>

            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Top This Week</Text>
              <Text style={styles.arrow}>›</Text>
            </View>
            <View style={styles.topList}>
              {visibleTitles.slice(10, 13).map((title, index) => (
                <Pressable key={title.id} style={styles.topRow} onPress={() => openTitle(title)}>
                  <Text style={styles.rank}>{index + 1}</Text>
                  <TitlePoster name={title.name} posterUrl={title.poster_url} width={30} height={44} />
                  <View style={styles.topCopy}>
                    <Text style={styles.topName}>{title.name}</Text>
                    <Text style={styles.topMeta}>{title.year ?? title.type}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CatalogGrid({
  title,
  titles,
  onPress,
}: {
  title: string;
  titles: Title[];
  onPress: (title: Title) => void;
}) {
  return (
    <View>
      <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>{title}</Text></View>
      {titles.length ? (
        <View style={styles.grid}>
          {titles.map((item) => (
            <Pressable key={item.id} style={styles.gridItem} onPress={() => onPress(item)}>
              <TitlePoster name={item.name} posterUrl={item.poster_url} width={96} height={140} />
              <Text style={styles.posterTitle} numberOfLines={2}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.empty}>No titles found.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  searchBox: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    marginTop: 18,
  },
  searchIcon: { color: "#707070", fontSize: 23, marginRight: 6 },
  searchInput: { flex: 1, height: "100%", color: colors.ink, fontSize: 14 },
  filters: { flexDirection: "row", gap: 8, marginTop: 12 },
  filter: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: "600",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.subtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    overflow: "hidden",
  },
  activeFilter: { color: colors.background, backgroundColor: colors.ink, borderColor: colors.ink },
  loading: { height: 180, alignItems: "center", justifyContent: "center" },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 23,
    marginBottom: 11,
  },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  arrow: { color: "#707070", fontSize: 23 },
  trending: { gap: 9, paddingRight: 16 },
  trendingItem: { width: 88 },
  posterTitle: { color: colors.ink, fontSize: 13, lineHeight: 16, fontWeight: "700", marginTop: 5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  gridItem: { width: 104 },
  genres: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  genreChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  genreText: { color: colors.ink, fontSize: 11, textTransform: "capitalize" },
  topList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  topRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rank: { width: 22, color: colors.ink, fontSize: 13, fontWeight: "800" },
  topCopy: { marginLeft: 9 },
  topName: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  topMeta: { color: "#707070", fontSize: 11, marginTop: 2 },
  empty: { color: "#707070", fontSize: 12, paddingVertical: 18 },
  error: { color: colors.error, fontSize: 12, textAlign: "center", marginTop: 14 },
});
