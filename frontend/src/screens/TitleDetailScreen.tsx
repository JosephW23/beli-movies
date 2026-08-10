import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { saveTitleStatus } from "../api/events";
import type { WatchStatus } from "../api/events";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import { formatTitleType } from "../components/TitleRowList";
import TitlePoster from "../components/TitlePoster";
import type { AddStackParamList } from "../navigation/AddStack";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<AddStackParamList, "TitleDetail">;

const ACTIONS: Array<{ label: string; status: WatchStatus; primary?: boolean }> = [
  { label: "Mark as Watched", status: "WATCHED", primary: true },
  { label: "Want to Watch", status: "WANT" },
  { label: "Currently Watching", status: "WATCHING" },
];

export default function TitleDetailScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { title } = route.params;
  const [savingStatus, setSavingStatus] = useState<WatchStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function saveStatus(status: WatchStatus) {
    if (!token) return;
    setSavingStatus(status);
    setError(null);
    setSuccess(null);
    try {
      await saveTitleStatus(token, title.id, status);
      const label = ACTIONS.find((action) => action.status === status)?.label;
      setSuccess(`${title.name} · ${label}`);
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
        />

        <View style={styles.selectedCard}>
          <TitlePoster name={title.name} posterUrl={title.poster_url} width={88} height={128} />
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTitle}>{title.name}</Text>
            <Text style={styles.metadata}>
              {[title.year, formatTitleType(title.type)].filter(Boolean).join(" · ")}
            </Text>
            {title.genres ? (
              <Text style={styles.genres} numberOfLines={3}>
                {title.genres.split(",").join("  ·  ")}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  back: { color: colors.ink, fontSize: 32, lineHeight: 28, marginRight: 8 },
  selectedCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.card,
    padding: 10,
    marginTop: 16,
    marginBottom: 20,
  },
  selectedInfo: { flex: 1, justifyContent: "center", marginLeft: 13 },
  selectedTitle: { color: colors.ink, fontSize: 19, lineHeight: 23, fontWeight: "800" },
  metadata: { color: "#707070", fontSize: 12, marginTop: 4 },
  genres: { color: "#5F5A55", fontSize: 12, lineHeight: 17, marginTop: 10 },
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
});
