import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { searchTmdbTitles } from "../api/titles";
import AppScreenHeader from "../components/AppScreenHeader";
import TitleRowList from "../components/TitleRowList";
import type { AddStackParamList } from "../navigation/AddStack";
import { colors, radii } from "../theme";
import type { ExternalTitle } from "../types/title";

type Props = NativeStackScreenProps<AddStackParamList, "AddSearch">;

export default function AddSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState("");
  const [titles, setTitles] = useState<ExternalTitle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setTitles([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsLoading(true);
      void searchTmdbTitles(query, controller.signal)
        .then((items) => {
          setTitles(items);
          setError(null);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) {
            setError(requestError instanceof Error ? requestError.message : "Could not load titles");
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

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView style={styles.root} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppScreenHeader
          title="Find a title"
          subtitle="Rate"
          leading={
            <Pressable onPress={navigation.goBack} hitSlop={12}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
          }
        />

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies, shows, anime..."
            placeholderTextColor={colors.secondary}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>

        <View style={styles.heading}>
          <Text style={styles.sectionTitle}>{query ? "Search results" : "Search TMDb"}</Text>
          {isLoading ? <ActivityIndicator size="small" color={colors.ink} /> : null}
        </View>

        {error ? (
          <Text style={styles.error}>{error}</Text>
        ) : (
          <TitleRowList
            titles={titles}
            onPress={(title) => navigation.navigate("TitleDetail", { title })}
            emptyMessage={
              !isLoading
                ? query.trim()
                  ? "No titles found. Try another name."
                  : "Type a movie, show, or anime title to begin."
                : undefined
            }
          />
        )}
        <Text style={styles.attribution}>
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  back: { color: colors.ink, fontSize: 32, lineHeight: 28, marginRight: 8 },
  searchBox: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.control,
    marginTop: 18,
    paddingHorizontal: 12,
  },
  searchIcon: { color: "#707070", fontSize: 23, marginRight: 7 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 14, height: "100%" },
  heading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800" },
  error: { color: colors.error, fontSize: 12, textAlign: "center", marginTop: 18 },
  attribution: { color: "#707070", fontSize: 10, lineHeight: 14, textAlign: "center", marginTop: 24 },
});
