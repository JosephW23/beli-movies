import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { getMyList, saveTitleStatus } from "../api/events";
import type { MyList, WatchStatus } from "../api/events";
import { searchTitles } from "../api/titles";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import { colors, radii } from "../theme";
import type { Title } from "../types/title";

const EMPTY_LIST: MyList = { want_to_watch: [], watched: [] };
type AddMode = "LOG" | "WANT" | "WATCHED";

const ACTIONS: Array<{
  label: string;
  status: WatchStatus;
  primary?: boolean;
}> = [
  { label: "Mark as Watched", status: "WATCHED", primary: true },
  { label: "Want to Watch", status: "WANT" },
  { label: "Currently Watching", status: "WATCHING" },
];

function formatType(type: string) {
  if (type === "tv") return "TV Show";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

export default function AddScreen() {
  const { token } = useAuth();
  const [query, setQuery] = useState("");
  const [titles, setTitles] = useState<Title[]>([]);
  const [selected, setSelected] = useState<Title | null>(null);
  const [myList, setMyList] = useState<MyList>(EMPTY_LIST);
  const [isSearching, setIsSearching] = useState(true);
  const [savingStatus, setSavingStatus] = useState<WatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<AddMode>("LOG");

  const refreshList = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      setMyList(await getMyList(token, signal));
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      const controller = new AbortController();
      void refreshList(controller.signal).catch((requestError) => {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load your recent titles"
          );
        }
      });
      return () => controller.abort();
    }, [refreshList])
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setIsSearching(true);
      void searchTitles(query, controller.signal)
        .then((items) => {
          setTitles(items);
          setError(null);
        })
        .catch((requestError) => {
          if (!controller.signal.aborted) {
            setError(
              requestError instanceof Error
                ? requestError.message
                : "Could not search titles"
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function chooseTitle(title: Title) {
    Keyboard.dismiss();
    setSelected(title);
    setSuccess(null);
    setError(null);
  }

  async function saveStatus(status: WatchStatus) {
    if (!token || !selected) return;

    setSavingStatus(status);
    setError(null);
    setSuccess(null);
    try {
      await saveTitleStatus(token, selected.id, status);
      await refreshList();
      const actionLabel = ACTIONS.find((action) => action.status === status)?.label;
      setSuccess(`${selected.name} · ${actionLabel}`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not save this title"
      );
    } finally {
      setSavingStatus(null);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppScreenHeader
          title={selected ? "Rate title" : "Add"}
          subtitle={selected ? "Choose a status" : "Rate"}
          leading={selected ? (
            <Pressable onPress={() => setSelected(null)} hitSlop={12}>
              <Text style={styles.back}>‹</Text>
            </Pressable>
          ) : undefined}
        />

        {selected ? (
          <View>
            <View style={styles.selectedCard}>
              <TitlePoster
                name={selected.name}
                posterUrl={selected.poster_url}
                width={88}
                height={128}
              />
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedTitle}>{selected.name}</Text>
                <Text style={styles.metadata}>
                  {[selected.year, formatType(selected.type)]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
                {selected.genres ? (
                  <Text style={styles.genres} numberOfLines={3}>
                    {selected.genres.split(",").join("  ·  ")}
                  </Text>
                ) : null}
              </View>
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
                      <ActivityIndicator color={action.primary ? BG : INK} />
                    ) : (
                      <Text
                        style={[
                          styles.actionText,
                          action.primary && styles.primaryText,
                        ]}
                      >
                        {action.label}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
            {success ? <Text style={styles.success}>✓ {success}</Text> : null}
          </View>
        ) : (
          <View>
            <View style={styles.searchBox}>
              <Text style={styles.searchIcon}>⌕</Text>
              <TextInput
                value={query}
                onChangeText={(value) => {
                  setQuery(value);
                  setMode("LOG");
                }}
                placeholder="Search movies, shows, anime..."
                placeholderTextColor={MUTED}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                style={styles.searchInput}
              />
            </View>

            <View style={styles.modeTabs}>
              {([
                ["LOG", "Rate"],
                ["WANT", "Want to Watch"],
                ["WATCHED", "Watched"],
              ] as const).map(([value, label]) => (
                <Pressable
                  key={value}
                  onPress={() => setMode(value)}
                  style={[styles.modeTab, mode === value && styles.activeModeTab]}
                >
                  <Text style={[styles.modeText, mode === value && styles.activeModeText]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "LOG" && myList.watched.length > 0 && !query ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recently watched</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.posterRow}
                >
                  {myList.watched.slice(0, 6).map((title) => (
                    <Pressable
                      key={title.event_id}
                      onPress={() => chooseTitle(title)}
                      style={styles.posterItem}
                    >
                      <TitlePoster
                        name={title.name}
                        posterUrl={title.poster_url}
                        width={68}
                        height={100}
                      />
                      <Text style={styles.posterName} numberOfLines={2}>
                        {title.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {mode === "LOG" ? (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {query ? "Search results" : "Find a title"}
                  </Text>
                  {isSearching ? <ActivityIndicator size="small" color={INK} /> : null}
                </View>

                {!isSearching && titles.length === 0 ? (
                  <Text style={styles.empty}>No titles found. Try another name.</Text>
                ) : null}

                <TitleRows titles={titles} onChoose={chooseTitle} />
              </>
            ) : (
              <View>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>
                    {mode === "WANT" ? "Want to Watch" : "Recently watched"}
                  </Text>
                </View>
                <TitleRows
                  titles={mode === "WANT" ? myList.want_to_watch : myList.watched}
                  onChoose={chooseTitle}
                  emptyMessage={
                    mode === "WANT"
                      ? "Nothing saved for later yet."
                      : "No watched titles yet."
                  }
                />
              </View>
            )}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TitleRows({
  titles,
  onChoose,
  emptyMessage,
}: {
  titles: Title[];
  onChoose: (title: Title) => void;
  emptyMessage?: string;
}) {
  if (titles.length === 0 && emptyMessage) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.results}>
      {titles.map((title) => (
        <Pressable
          key={title.id}
          onPress={() => onChoose(title)}
          style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
        >
          <TitlePoster name={title.name} posterUrl={title.poster_url} width={44} height={64} />
          <View style={styles.resultInfo}>
            <Text style={styles.resultTitle}>{title.name}</Text>
            <Text style={styles.metadata}>
              {[title.year, formatType(title.type)].filter(Boolean).join(" · ")}
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const BG = colors.background;
const SURFACE = colors.surface;
const INK = colors.ink;
const MUTED = colors.secondary;
const BORDER = colors.border;
const GREEN = colors.success;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  root: { flex: 1, backgroundColor: BG },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  back: { color: INK, fontSize: 32, lineHeight: 28, marginRight: 8 },
  searchBox: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: radii.control,
    marginTop: 18,
    paddingHorizontal: 12,
  },
  searchIcon: { color: MUTED, fontSize: 19, marginRight: 6 },
  searchInput: { flex: 1, color: INK, fontSize: 13, height: "100%" },
  modeTabs: { flexDirection: "row", gap: 8, marginTop: 12 },
  modeTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: radii.control,
    backgroundColor: colors.subtle,
  },
  activeModeTab: { backgroundColor: INK, borderColor: INK },
  modeText: { color: INK, fontSize: 9, fontWeight: "600" },
  activeModeText: { color: BG },
  section: { marginTop: 23 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: { color: INK, fontSize: 17, fontWeight: "800", marginBottom: 11 },
  posterRow: { gap: 9, paddingRight: 16 },
  posterItem: { width: 68 },
  posterName: { color: INK, fontSize: 10, lineHeight: 13, marginTop: 5 },
  results: { gap: 10 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: SURFACE,
  },
  resultInfo: { flex: 1, marginLeft: 12 },
  resultTitle: { color: INK, fontSize: 15, fontWeight: "700" },
  metadata: { color: MUTED, fontSize: 10, marginTop: 4 },
  chevron: { color: "#B4B4B4", fontSize: 22, marginHorizontal: 3 },
  empty: { color: MUTED, fontSize: 11, textAlign: "center", paddingVertical: 24 },
  selectedCard: {
    flexDirection: "row",
    backgroundColor: SURFACE,
    borderColor: BORDER,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  selectedInfo: { flex: 1, justifyContent: "center", marginLeft: 13 },
  selectedTitle: { color: INK, fontSize: 19, lineHeight: 23, fontWeight: "800" },
  genres: { color: "#5F5A55", fontSize: 10, lineHeight: 15, marginTop: 10 },
  actions: { gap: 7 },
  actionButton: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    borderColor: INK,
    borderWidth: 1.2,
    backgroundColor: BG,
  },
  primaryButton: { backgroundColor: INK },
  actionText: { color: INK, fontSize: 13, fontWeight: "700" },
  primaryText: { color: BG },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.55 },
  success: {
    color: GREEN,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 16,
  },
  error: {
    color: "#B54747",
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 18,
  },
});
