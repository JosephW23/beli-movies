import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { DimensionValue } from "react-native";

type Props = {
  name: string;
  posterUrl: string | null;
  width?: DimensionValue;
  height?: DimensionValue;
};

export default function TitlePoster({
  name,
  posterUrl,
  width = 82,
  height = 122,
}: Props) {
  const [failed, setFailed] = useState(false);
  const palette = ["#272321", "#433A34", "#34413D", "#3F3B46", "#4A4031"];
  const colorIndex = Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  );

  useEffect(() => setFailed(false), [posterUrl]);

  return (
    <View style={[styles.frame, { width, height }]}>
      {posterUrl && !failed ? (
        <Image
          source={{ uri: posterUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { backgroundColor: palette[colorIndex % palette.length] },
          ]}
        >
          <Text style={styles.fallbackIcon}>▷</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderRadius: 6,
    backgroundColor: "#F0F0F0",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#E5E5E5",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  fallbackIcon: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "500",
  },
});
