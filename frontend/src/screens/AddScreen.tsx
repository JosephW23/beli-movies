import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyList } from "../api/events";
import type { MyList } from "../api/events";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitleRowList from "../components/TitleRowList";
import TitlePoster from "../components/TitlePoster";
import type { AddStackParamList } from "../navigation/AddStack";
import { colors, radii } from "../theme";
import type { Title } from "../types/title";

type Props = NativeStackScreenProps<AddStackParamList, "AddHome">;
type AddMode = "RATE" | "WANT" | "WATCHED";

const EMPTY_LIST: MyList = { want_to_watch: [], watched: [] };

export default function AddScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [myList, setMyList] = useState<MyList>(EMPTY_LIST);
  const [isListLoading, setIsListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<AddMode>("RATE");

  const refreshList = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      setIsListLoading(true);
      try {
        setMyList(await getMyList(token, signal));
      } finally {
        if (!signal?.aborted) setIsListLoading(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void refreshList(controller.signal).catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Could not load your list");
        }
      });
      return () => controller.abort();
    }, [refreshList])
  );

  function chooseTitle(title: Title) {
    navigation.navigate("TitleDetail", { title });
  }

  const listTitles = mode === "WANT" ? myList.want_to_watch : myList.watched;

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppScreenHeader title="Add" subtitle="Rate" />

        <Pressable style={styles.searchBox} onPress={() => navigation.navigate("AddSearch")}>
          <Text style={styles.searchIcon}>⌕</Text>
          <Text style={styles.searchPlaceholder}>Search movies, shows, anime...</Text>
        </Pressable>

        <View style={styles.modeTabs}>
          {(["RATE", "WANT", "WATCHED"] as const).map((value) => {
            const label = value === "RATE" ? "Rate" : value === "WANT" ? "Want to Watch" : "Watched";
            return (
              <Pressable
                key={value}
                onPress={() => setMode(value)}
                style={[styles.modeTab, mode === value && styles.activeModeTab]}
              >
                <Text style={[styles.modeText, mode === value && styles.activeModeText]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {mode === "RATE" && myList.watched.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recently watched</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRow}>
              {myList.watched.slice(0, 6).map((title) => (
                <Pressable key={title.event_id} onPress={() => chooseTitle(title)} style={styles.posterItem}>
                  <TitlePoster name={title.name} posterUrl={title.poster_url} width={68} height={100} />
                  <Text style={styles.posterName} numberOfLines={2}>{title.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {mode === "RATE" ? (
          <Pressable style={styles.findCard} onPress={() => navigation.navigate("AddSearch")}>
            <View>
              <Text style={styles.findTitle}>Find a title</Text>
              <Text style={styles.findCaption}>Choose something to rate or add to your list.</Text>
            </View>
            <Text style={styles.findArrow}>›</Text>
          </Pressable>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{mode === "WANT" ? "Want to Watch" : "Watched"}</Text>
              {isListLoading ? <ActivityIndicator size="small" color={colors.ink} /> : null}
            </View>
            <TitleRowList
              titles={listTitles}
              onPress={chooseTitle}
              emptyMessage={
                !isListLoading
                  ? mode === "WANT"
                    ? "Nothing in your Want to Watch list yet."
                    : "You haven't marked anything as watched yet."
                  : undefined
              }
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
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
  searchPlaceholder: { color: "#707070", fontSize: 14 },
  modeTabs: { flexDirection: "row", gap: 8, marginTop: 12 },
  modeTab: {
    flex: 1,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.subtle,
  },
  activeModeTab: { backgroundColor: colors.ink, borderColor: colors.ink },
  modeText: { color: colors.ink, fontSize: 12, fontWeight: "600" },
  activeModeText: { color: colors.background },
  section: { marginTop: 23 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800", marginBottom: 11 },
  posterRow: { gap: 9, paddingRight: 16 },
  posterItem: { width: 68 },
  posterName: { color: colors.ink, fontSize: 12, lineHeight: 15, fontWeight: "600", marginTop: 5 },
  findCard: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    paddingHorizontal: 13,
    marginTop: 24,
  },
  findTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  findCaption: { color: "#707070", fontSize: 12, marginTop: 4 },
  findArrow: { color: colors.secondary, fontSize: 22 },
  error: { color: colors.error, fontSize: 12, textAlign: "center", marginTop: 18 },
});
