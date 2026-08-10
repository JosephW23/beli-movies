import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { brandFont } from "../../theme";

type Props = {
  navigation: any; // we’ll type this later
};

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.logo}>WATCHD</Text>
        <Text style={styles.subtitle}>Track what you watch</Text>

        <View style={styles.buttons}>
          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>Log In</Text>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("Signup")}
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>Sign Up</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const BG = "#FFFFFF";
const BLACK = "#111111";
const GRAY = "#8A8A8A";

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
  },
  subtitle: {
    marginTop: 10,
    marginBottom: 28,
    color: GRAY,
    fontSize: 14,
    fontWeight: "500",
  },
  buttons: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: BLACK,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryText: {
    color: BG,
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: BLACK,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  secondaryText: {
    color: BLACK,
    fontSize: 16,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});
