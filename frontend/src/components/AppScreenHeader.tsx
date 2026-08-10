import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";

import { colors } from "../theme";
import BrandLogo from "./BrandLogo";

type Props = {
  title: string;
  subtitle: string;
  leading?: ReactNode;
  trailing?: ReactNode;
};

export default function AppScreenHeader({
  title,
  subtitle,
  leading,
  trailing,
}: Props) {
  return (
    <>
      <BrandLogo style={styles.brand} />
      <View style={styles.row}>
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  brand: { textAlign: "center", marginTop: 7, marginBottom: 20 },
  row: { flexDirection: "row", alignItems: "center" },
  leading: { marginRight: 8 },
  copy: { flex: 1 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: colors.secondary, fontSize: 11, marginTop: 3 },
  trailing: { marginLeft: 8 },
});
