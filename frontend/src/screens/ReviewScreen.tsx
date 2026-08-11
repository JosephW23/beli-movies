import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { getPersonalTitle, saveReview } from "../api/personal";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import type { SearchStackParamList } from "../navigation/SearchStack";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<SearchStackParamList, "WriteReview">;

export default function ReviewScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { title, finishFlow = false } = route.params;
  const [body, setBody] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void getPersonalTitle(token, title.id, controller.signal)
      .then((personal) => setBody(personal.review ?? ""))
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "Could not load review.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });
    return () => controller.abort();
  }, [title.id, token]);

  function finish() {
    if (finishFlow) navigation.navigate("SearchHome");
    else navigation.goBack();
  }

  async function save() {
    if (!token || !body.trim()) {
      setError("Write something before saving your review.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await saveReview(token, title.id, body);
      finish();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not save review.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppScreenHeader
            title="Write a review"
            subtitle="Share what you thought"
            leading={<Pressable onPress={finish} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>}
          />
          <View style={styles.titleRow}>
            <TitlePoster name={title.name} posterUrl={title.poster_url} width={58} height={84} />
            <Text style={styles.title}>{title.name}</Text>
          </View>
          {isLoading ? (
            <View style={styles.loading}><ActivityIndicator color={colors.ink} /></View>
          ) : (
            <>
              <TextInput
                value={body}
                onChangeText={setBody}
                multiline
                maxLength={1000}
                placeholder="What did you think?"
                placeholderTextColor="#9A9A9A"
                textAlignVertical="top"
                style={styles.input}
              />
              <Text style={styles.count}>{body.length}/1000</Text>
            </>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={isLoading || isSaving} onPress={() => void save()} style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
            {isSaving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.saveText}>Save review</Text>}
          </Pressable>
          {finishFlow ? (
            <Pressable onPress={finish} style={styles.notNow}><Text style={styles.notNowText}>Not now</Text></Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 30 },
  back: { color: colors.ink, fontSize: 36, lineHeight: 34 },
  titleRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.surface, padding: 10, marginTop: 18 },
  title: { flex: 1, color: colors.ink, fontSize: 18, fontWeight: "800", marginLeft: 14 },
  loading: { minHeight: 180, alignItems: "center", justifyContent: "center" },
  input: { minHeight: 180, borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.surface, color: colors.ink, fontSize: 15, lineHeight: 22, padding: 14, marginTop: 18 },
  count: { color: "#707070", fontSize: 11, textAlign: "right", marginTop: 5 },
  error: { color: colors.error, fontSize: 13, marginTop: 10 },
  save: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: colors.ink, marginTop: 18 },
  saveText: { color: colors.background, fontSize: 15, fontWeight: "800" },
  notNow: { minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 6 },
  notNowText: { color: "#707070", fontSize: 14, fontWeight: "700" },
  pressed: { opacity: 0.72 },
});
