import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";
import { useAuth } from "../auth/AuthContext";
import { colors } from "../theme";

export default function RootNavigator() {
  const { token, isRestoring } = useAuth();

  if (isRestoring) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return token ? <AppTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
