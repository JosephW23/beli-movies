import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SavedTitle } from "../api/events";
import { colors, radii } from "../theme";
import TitlePoster from "./TitlePoster";

type Props = {
  titles: SavedTitle[];
};

export default function RankingList({ titles }: Props) {
  if (!titles.length) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.empty}>Finish ranking a watched title to see your scores.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {titles.map((title, index) => (
        <View key={title.event_id} style={[styles.row, index === titles.length - 1 && styles.lastRow]}>
          <Text style={styles.position}>#{title.personal_rank}</Text>
          <TitlePoster name={title.name} posterUrl={title.poster_url} width={36} height={52} />
          <View style={styles.copy}>
            <Text style={styles.title} numberOfLines={1}>{title.name}</Text>
            <Text style={styles.metadata}>{[title.year, title.type].filter(Boolean).join(" · ")}</Text>
          </View>
          <View style={styles.scoreBadge}>
            <Text style={styles.score}>{title.personal_score?.toFixed(1)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    marginTop: 9,
    overflow: "hidden",
  },
  row: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  position: { width: 34, color: colors.ink, fontSize: 13, fontWeight: "800" },
  copy: { flex: 1, marginLeft: 10 },
  title: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  metadata: { color: "#707070", fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  scoreBadge: {
    minWidth: 48,
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: colors.subtle,
    marginLeft: 8,
  },
  score: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 13,
    marginTop: 9,
  },
  empty: { color: "#707070", fontSize: 12 },
});
