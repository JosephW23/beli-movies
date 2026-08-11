import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme";
import type { Title } from "../types/title";
import TitlePoster from "./TitlePoster";

type DisplayTitle = Title & {
  personal_rank?: number | null;
  personal_score?: number | null;
};

type Props = {
  titles: DisplayTitle[];
  onPress: (title: DisplayTitle) => void;
  emptyMessage?: string;
};

export function formatTitleType(type: string) {
  return type === "tv" ? "TV Show" : type.charAt(0).toUpperCase() + type.slice(1);
}

export default function TitleRowList({ titles, onPress, emptyMessage }: Props) {
  if (!titles.length && emptyMessage) {
    return <Text style={styles.empty}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.list}>
      {titles.map((title) => (
        <Pressable
          key={title.id}
          onPress={() => onPress(title)}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <TitlePoster name={title.name} posterUrl={title.poster_url} width={44} height={64} />
          <View style={styles.copy}>
            <Text style={styles.title}>{title.name}</Text>
            <Text style={styles.metadata}>
              {[title.year, formatTitleType(title.type)].filter(Boolean).join(" · ")}
            </Text>
          </View>
          {title.personal_score != null && title.personal_rank != null ? (
            <View style={styles.scoreBlock}>
              <Text style={styles.score}>{title.personal_score.toFixed(1)}</Text>
              <Text style={styles.rank}>#{title.personal_rank}</Text>
            </View>
          ) : null}
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 11,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  copy: { flex: 1, marginLeft: 12 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  metadata: { color: "#707070", fontSize: 12, marginTop: 4 },
  scoreBlock: { minWidth: 42, alignItems: "center", marginLeft: 8 },
  score: { color: colors.ink, fontSize: 15, fontWeight: "800" },
  rank: { color: "#707070", fontSize: 10, marginTop: 2 },
  chevron: { color: "#B4B4B4", fontSize: 22, marginHorizontal: 3 },
  empty: { color: "#707070", fontSize: 12, textAlign: "center", paddingVertical: 24 },
  pressed: { opacity: 0.72 },
});
