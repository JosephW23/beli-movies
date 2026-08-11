import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";

import { updatePersonalScore } from "../api/personal";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import type { SearchStackParamList } from "../navigation/SearchStack";
import { colors, radii } from "../theme";

type Props = NativeStackScreenProps<SearchStackParamList, "EditScore">;

export default function EditScoreScreen({ navigation, route }: Props) {
  const { token } = useAuth();
  const { title, currentScore } = route.params;
  const [value, setValue] = useState(currentScore.toFixed(1));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const score = Number(value);
    if (!token || !Number.isFinite(score) || score < 1 || score > 10) {
      setError("Enter a score between 1.0 and 10.0.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await updatePersonalScore(token, title.id, score);
      navigation.goBack();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not change score.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.content}>
          <AppScreenHeader
            title="Change score"
            subtitle="Your rating"
            leading={<Pressable onPress={navigation.goBack} hitSlop={12}><Text style={styles.back}>‹</Text></Pressable>}
          />
          <View style={styles.titleRow}>
            <TitlePoster name={title.name} posterUrl={title.poster_url} width={58} height={84} />
            <Text style={styles.title}>{title.name}</Text>
          </View>
          <Text style={styles.label}>Score from 1.0–10.0</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            keyboardType="decimal-pad"
            maxLength={4}
            selectTextOnFocus
            style={styles.input}
            accessibilityLabel="Personal score"
          />
          <Text style={styles.helper}>
            This changes only this title. Your other saved scores will stay the same.
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable disabled={isSaving} onPress={() => void save()} style={({ pressed }) => [styles.save, pressed && styles.pressed]}>
            {isSaving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.saveText}>Save score</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 18 },
  back: { color: colors.ink, fontSize: 36, lineHeight: 34 },
  titleRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: colors.border, borderRadius: radii.card, backgroundColor: colors.surface, padding: 10, marginTop: 18 },
  title: { flex: 1, color: colors.ink, fontSize: 18, fontWeight: "800", marginLeft: 14 },
  label: { color: colors.ink, fontSize: 15, fontWeight: "800", marginTop: 24 },
  input: { height: 82, borderWidth: 1, borderColor: colors.ink, borderRadius: radii.card, color: colors.ink, fontSize: 42, fontWeight: "900", textAlign: "center", marginTop: 9, backgroundColor: colors.surface },
  helper: { color: "#707070", fontSize: 13, lineHeight: 19, marginTop: 10 },
  error: { color: colors.error, fontSize: 13, marginTop: 12 },
  save: { minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: radii.control, backgroundColor: colors.ink, marginTop: 22 },
  saveText: { color: colors.background, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.72 },
});
