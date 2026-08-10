import React from "react";
import { StyleSheet, Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";

import { brandFont, colors } from "../theme";

type Props = {
  size?: number;
  style?: StyleProp<TextStyle>;
};

export default function BrandLogo({ size = 16, style }: Props) {
  return (
    <Text style={[styles.logo, { fontSize: size }, style]}>WATCHD</Text>
  );
}

const styles = StyleSheet.create({
  logo: {
    color: colors.ink,
    fontFamily: brandFont,
    fontWeight: "900",
    letterSpacing: -0.35,
  },
});
