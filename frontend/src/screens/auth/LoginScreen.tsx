import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useAuth } from "../../auth/AuthContext";
import { friendlyAuthError } from "../../lib/authErrors";


type Props = {
  navigation: any; // we’ll type this later
};

export default function LoginScreen({ navigation }: Props) {
  const { signIn, error, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function onLogin() {
    await signIn(email.trim(), password);
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>WATCHD</Text>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={GRAY}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={GRAY}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error ? (<Text style={styles.error}>{friendlyAuthError(error)}</Text>) : null}

          <Pressable
            onPress={onLogin}
            disabled={isLoading}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              isLoading && styles.disabled,
            ]}
          >
            <Text style={styles.primaryText}>
              {isLoading ? "Logging in..." : "Log In"}
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don’t have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Signup")}>
              <Text style={styles.footerLink}>Sign up</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const BG = "#F7F2EC";
const BLACK = "#111111";
const GRAY = "#9A9A9A";
const BORDER = "#E2DDD6";
const ERROR = "#B54747";

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 32,
    alignItems: "center",
  },
  logo: {
    color: BLACK,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginBottom: 18,
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    backgroundColor: BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: BLACK,
    marginBottom: 10,
  },
  error: {
    width: "100%",
    color: ERROR,
    fontSize: 12,
    marginTop: 2,
    marginBottom: 10,
  },
  primaryBtn: {
    width: "100%",
    backgroundColor: BLACK,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  primaryText: {
    color: BG,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  footerRow: {
    flexDirection: "row",
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "#6F6F6F",
    fontSize: 12,
  },
  footerLink: {
    color: BLACK,
    fontSize: 12,
    fontWeight: "700",
  },
});
