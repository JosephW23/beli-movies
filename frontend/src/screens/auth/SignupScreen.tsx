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
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../../auth/AuthContext";
import { friendlyAuthError } from "../../lib/authErrors";
import { usernameFromFullName } from "../../lib/username";
import type { AuthStackParamList } from "../../navigation/AuthStack";
import { brandFont } from "../../theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export default function SignupScreen({ navigation }: Props) {
  const { signUp, error, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const passwordsMatch = password.length > 0 && confirm.length > 0 && password === confirm;
  const showMismatch = confirm.length > 0 && password !== confirm;

  async function onSignup() {
    // Basic client-side check so we don't call Supabase if mismatch
    if (password !== confirm) return;
    await signUp(fullName.trim(), email.trim(), password);
  }

  const showErrorText = showMismatch
  ? "Passwords do not match"
  : friendlyAuthError(error);

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
            placeholder="Full Name"
            placeholderTextColor={GRAY}
            value={fullName}
            onChangeText={setFullName}
          />
          {fullName.trim() ? (
            <Text style={styles.usernamePreview}>
              Friends can find you as @{usernameFromFullName(fullName)}
            </Text>
          ) : null}

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
            textContentType="none"
            value={password}
            onChangeText={setPassword}
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={GRAY}
            secureTextEntry
            textContentType="none"
            value={confirm}
            onChangeText={setConfirm}
          />

          {showErrorText ? <Text style={styles.error}>{showErrorText}</Text> : null}

          <Pressable
            onPress={onSignup}
            disabled={
              isLoading ||
              !passwordsMatch ||
              email.trim().length === 0 ||
              fullName.trim().length === 0
            }
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              (isLoading ||
                !passwordsMatch ||
                email.trim().length === 0 ||
                fullName.trim().length === 0) &&
                styles.disabled,
            ]}
          >
            <Text style={styles.primaryText}>
              {isLoading ? "Signing up..." : "Sign Up"}
            </Text>
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.footerLink}>Log in</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const BG = "#FFFFFF";
const BLACK = "#111111";
const GRAY = "#9A9A9A";
const BORDER = "#E5E5E5";
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
    fontFamily: brandFont,
    fontSize: 44,
    fontWeight: "900",
    letterSpacing: -1,
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
  usernamePreview: {
    width: "100%",
    color: GRAY,
    fontSize: 11,
    marginTop: -3,
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
