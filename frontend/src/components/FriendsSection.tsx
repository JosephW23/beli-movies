import React from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { colors, radii } from "../theme";
import type { SocialUser } from "../types/user";

type Props = {
  friends: SocialUser[];
  username: string;
  onChangeUsername: (value: string) => void;
  onAdd: () => void;
  isLoading: boolean;
  isAdding: boolean;
  error: string | null;
  success: string | null;
};

export default function FriendsSection({
  friends,
  username,
  onChangeUsername,
  onAdd,
  isLoading,
  isAdding,
  error,
  success,
}: Props) {
  function submit() {
    Keyboard.dismiss();
    onAdd();
  }

  return (
    <>
      <View style={styles.heading}>
        <Text style={styles.title}>Friends</Text>
        <Text style={styles.count}>{friends.length}</Text>
      </View>
      <View style={styles.addCard}>
        <Text style={styles.caption}>Find a WATCHD friend by name or username</Text>
        <View style={styles.form}>
          <TextInput
            value={username}
            onChangeText={onChangeUsername}
            onSubmitEditing={submit}
            placeholder="Full name or @username"
            placeholderTextColor={colors.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            style={styles.input}
          />
          <Pressable
            onPress={submit}
            disabled={isAdding || !username.trim()}
            style={({ pressed }) => [
              styles.button,
              pressed && styles.pressed,
              (isAdding || !username.trim()) && styles.disabled,
            ]}
          >
            {isAdding ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text style={styles.buttonText}>Add Friend</Text>
            )}
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {success ? <Text style={styles.success}>{success}</Text> : null}
      </View>

      <View style={styles.list}>
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="small" color={colors.ink} />
            <Text style={styles.loadingText}>Loading friends...</Text>
          </View>
        ) : friends.length ? (
          friends.map((friend, index) => (
            <View key={friend.id} style={[styles.row, index === friends.length - 1 && styles.lastRow]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{friend.full_name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.copy}>
                <Text style={styles.name}>{friend.full_name}</Text>
                <Text style={styles.username}>@{friend.username}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>No friends yet. Add someone to build your feed.</Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.ink, fontSize: 17, fontWeight: "800", marginTop: 22 },
  count: { color: "#707070", fontSize: 12, marginTop: 22 },
  addCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 11,
    marginTop: 8,
  },
  caption: { color: "#707070", fontSize: 12 },
  form: { flexDirection: "row", gap: 8, marginTop: 9 },
  input: {
    flex: 1,
    height: 40,
    color: colors.ink,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 10,
    backgroundColor: colors.subtle,
  },
  button: {
    minWidth: 94,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    paddingHorizontal: 11,
  },
  buttonText: { color: colors.background, fontSize: 12, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.45 },
  error: { color: colors.error, fontSize: 12, marginTop: 8 },
  success: { color: colors.success, fontSize: 12, marginTop: 8 },
  list: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    marginTop: 9,
    overflow: "hidden",
  },
  loading: { flexDirection: "row", alignItems: "center", padding: 13 },
  loadingText: { color: "#707070", fontSize: 12, marginLeft: 8 },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastRow: { borderBottomWidth: 0 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  avatarText: { color: colors.background, fontSize: 11, fontWeight: "800" },
  copy: { flex: 1, marginLeft: 10 },
  name: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  username: { color: "#707070", fontSize: 11, marginTop: 2 },
  empty: { color: "#707070", fontSize: 12, padding: 13 },
});
