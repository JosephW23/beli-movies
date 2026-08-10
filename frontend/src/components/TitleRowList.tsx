import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../theme";
import type { Title } from "../types/title";
import TitlePoster from "./TitlePoster";

type Props = {
  titles: Title[];
  onPress: (title: Title) => void;
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
  chevron: { color: "#B4B4B4", fontSize: 22, marginHorizontal: 3 },
  empty: { color: "#707070", fontSize: 12, textAlign: "center", paddingVertical: 24 },
  pressed: { opacity: 0.72 },
});
