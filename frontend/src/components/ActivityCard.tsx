import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { FeedItem } from "../api/social";
import { colors } from "../theme";
import TitlePoster from "./TitlePoster";

type Props = {
  activity: FeedItem;
  isLast?: boolean;
};

const ACTION_COPY = {
  WANT: "wants to watch",
  WATCHED: "watched",
  WATCHING: "is watching",
} as const;

function relativeTime(timestamp: string) {
  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
  );
  if (elapsedSeconds < 60) return "now";
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)}m`;
  if (elapsedSeconds < 86400) return `${Math.floor(elapsedSeconds / 3600)}h`;
  return `${Math.floor(elapsedSeconds / 86400)}d`;
}

export default function ActivityCard({ activity, isLast = false }: Props) {
  const initial = activity.user.full_name.slice(0, 1).toUpperCase() || "W";

  return (
    <View style={[styles.row, isLast && styles.lastRow]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      <TitlePoster
        name={activity.title.name}
        posterUrl={activity.title.poster_url}
        width={36}
        height={52}
      />
      <View style={styles.copy}>
        <Text style={styles.line} numberOfLines={2}>
          <Text style={styles.strong}>{activity.user.full_name}</Text>
          {` ${ACTION_COPY[activity.status]} `}
          <Text style={styles.strong}>{activity.title.name}</Text>
        </Text>
        <Text style={styles.meta}>
          @{activity.user.username} · {[activity.title.year, activity.title.type].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <Text style={styles.time}>{relativeTime(activity.created_at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
    marginRight: 9,
  },
  avatarText: { color: colors.background, fontSize: 11, fontWeight: "800" },
  copy: { flex: 1, marginLeft: 10 },
  line: { color: "#707070", fontSize: 13, lineHeight: 18 },
  strong: { color: colors.ink, fontWeight: "700" },
  meta: { color: "#707070", fontSize: 11, marginTop: 3, textTransform: "capitalize" },
  time: { color: "#707070", fontSize: 11, marginLeft: 8 },
});
