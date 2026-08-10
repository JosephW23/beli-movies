import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { getMe } from "../api/me";
import type { CurrentUser } from "../api/me";
import { useAuth } from "../auth/AuthContext";

export default function HomeScreen() {
  const { token } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const accessToken = token;
    const controller = new AbortController();

    async function loadCurrentUser() {
      try {
        setError(null);
        setUser(await getMe(accessToken, controller.signal));
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load your profile"
          );
        }
      }
    }

    void loadCurrentUser();
    return () => controller.abort();
  }, [token]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Home</Text>
      {!user && !error ? <ActivityIndicator /> : null}
      {user ? (
        <Text style={styles.message}>
          Logged in as: {user.email ?? "Unknown email"}
        </Text>
      ) : null}
      {error ? (
        <Text style={styles.error}>Could not verify login: {error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
  },
  error: {
    color: "#B54747",
    fontSize: 14,
    textAlign: "center",
  },
});
