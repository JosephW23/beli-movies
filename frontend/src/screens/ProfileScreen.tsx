import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyList } from "../api/events";
import type { MyList } from "../api/events";
import { getMe } from "../api/me";
import type { CurrentUser } from "../api/me";
import { addFriend, getFriends } from "../api/social";
import type { SocialUser } from "../api/social";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import TitlePoster from "../components/TitlePoster";
import { colors, radii } from "../theme";

const EMPTY_LIST: MyList = { want_to_watch: [], watched: [] };

export default function ProfileScreen() {
  const { token, signOut, isLoading } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [myList, setMyList] = useState<MyList>(EMPTY_LIST);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [friendUsername, setFriendUsername] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const controller = new AbortController();
      void Promise.all([
        getMe(token, controller.signal),
        getMyList(token, controller.signal),
        getFriends(token, controller.signal),
      ])
        .then(([currentUser, list, currentFriends]) => {
          setUser(currentUser);
          setMyList(list);
          setFriends(currentFriends);
        })
        .catch(() => undefined);
      return () => controller.abort();
    }, [token])
  );

  const email = user?.email ?? "WATCHD member";
  const displayName = user?.full_name ?? user?.username ?? "Your profile";
  const taste = useMemo(
    () =>
      Array.from(
        new Set(
          [...myList.watched, ...myList.want_to_watch].flatMap(
            (title) => title.genres?.split(",") ?? []
          )
        )
      ).slice(0, 5),
    [myList]
  );

  async function handleAddFriend() {
    const usernameToAdd = friendUsername.trim().replace(/^@/, "");
    if (!token || !usernameToAdd) return;

    Keyboard.dismiss();
    setIsAddingFriend(true);
    setFriendError(null);
    setFriendSuccess(null);
    try {
      const friend = await addFriend(token, usernameToAdd);
      setFriends(await getFriends(token));
      setFriendUsername("");
      setFriendSuccess(`${friend.full_name} is now your friend.`);
    } catch (requestError) {
      setFriendError(
        requestError instanceof Error ? requestError.message : "Could not add friend"
      );
    } finally {
      setIsAddingFriend(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <AppScreenHeader title="Profile" subtitle="You" />

        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.slice(0, 1).toUpperCase()}</Text>
          </View>
          <View style={styles.identityCopy}>
            <Text style={styles.name}>{displayName}</Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.username ? `@${user.username}` : email}
            </Text>
          </View>
          <Text style={styles.settingsIcon}>⚙︎</Text>
        </View>

        <View style={styles.stats}>
          {[
            [myList.watched.length, "Watched"],
            [myList.want_to_watch.length, "Want"],
            [0, "Reviews"],
            [friends.length, "Friends"],
          ].map(([value, label], index) => (
            <React.Fragment key={label}>
              {index > 0 ? <View style={styles.statDivider} /> : null}
              <View style={styles.stat}>
                <Text style={styles.statValue}>{value}</Text>
                <Text style={styles.statLabel}>{label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Your Taste</Text>
        <View style={styles.tasteCard}>
          <Text style={styles.tasteCaption}>Based on what you watch</Text>
          {taste.length ? (
            <View style={styles.tasteChips}>
              {taste.map((genre) => (
                <View key={genre} style={styles.tasteChip}>
                  <Text style={styles.tasteText}>{genre}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.tasteEmpty}>Your taste profile grows as you log titles.</Text>
          )}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Top 4 of All Time</Text>
          <Text style={styles.arrow}>›</Text>
        </View>
        {myList.watched.length ? (
          <View style={styles.topFour}>
            {myList.watched.slice(0, 4).map((title, index) => (
              <View key={title.event_id} style={styles.topItem}>
                <View style={styles.rankBadge}><Text style={styles.rankText}>{index + 1}</Text></View>
                <TitlePoster name={title.name} posterUrl={title.poster_url} width={74} height={108} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.topEmpty}>
            <Text style={styles.topEmptyText}>Mark titles as watched to build your Top 4.</Text>
          </View>
        )}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Friends</Text>
          <Text style={styles.friendCount}>{friends.length}</Text>
        </View>
        <View style={styles.addFriendCard}>
          <Text style={styles.friendCaption}>Find a WATCHD friend by name or username</Text>
          <View style={styles.friendForm}>
            <TextInput
              value={friendUsername}
              onChangeText={setFriendUsername}
              onSubmitEditing={() => void handleAddFriend()}
              placeholder="Full name or @username"
              placeholderTextColor={colors.secondary}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              style={styles.friendInput}
            />
            <Pressable
              onPress={() => void handleAddFriend()}
              disabled={isAddingFriend || !friendUsername.trim()}
              style={({ pressed }) => [
                styles.addFriendButton,
                pressed && styles.pressed,
                (isAddingFriend || !friendUsername.trim()) && styles.disabled,
              ]}
            >
              {isAddingFriend ? (
                <ActivityIndicator size="small" color={colors.background} />
              ) : (
                <Text style={styles.addFriendButtonText}>Add Friend</Text>
              )}
            </Pressable>
          </View>
          {friendError ? <Text style={styles.friendError}>{friendError}</Text> : null}
          {friendSuccess ? <Text style={styles.friendSuccess}>{friendSuccess}</Text> : null}
        </View>

        <View style={styles.friendList}>
          {friends.length ? (
            friends.map((friend, index) => (
              <View
                key={friend.id}
                style={[styles.friendRow, index === friends.length - 1 && styles.lastFriendRow]}
              >
                <View style={styles.friendAvatar}>
                  <Text style={styles.friendAvatarText}>
                    {friend.full_name.slice(0, 1).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.friendCopy}>
                  <Text style={styles.friendName}>{friend.full_name}</Text>
                  <Text style={styles.friendUsername}>@{friend.username}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.noFriends}>No friends yet. Add someone to build your feed.</Text>
          )}
        </View>

        <View style={styles.menu}>
          {["Your Reviews", "Your Lists", "Activity", "Account"].map((item) => (
            <View key={item} style={styles.menuRow}>
              <Text style={styles.menuText}>{item}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => void signOut()}
          disabled={isLoading}
          style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}
        >
          <Text style={styles.signOutText}>{isLoading ? "Signing out…" : "Sign Out"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  identity: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  avatarText: { color: colors.background, fontSize: 17, fontWeight: "800" },
  identityCopy: { flex: 1, marginLeft: 11 },
  name: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  email: { color: colors.secondary, fontSize: 10, marginTop: 2 },
  settingsIcon: { color: colors.ink, fontSize: 16 },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    paddingVertical: 11,
    marginTop: 16,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  statLabel: { color: colors.secondary, fontSize: 7, marginTop: 2 },
  statDivider: { width: 1, height: 23, backgroundColor: colors.border },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", marginTop: 22 },
  tasteCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: 11,
    marginTop: 8,
  },
  tasteCaption: { color: colors.secondary, fontSize: 8 },
  tasteChips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  tasteChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tasteText: { color: colors.ink, fontSize: 8, textTransform: "capitalize" },
  tasteEmpty: { color: colors.secondary, fontSize: 9, marginTop: 7 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { color: colors.secondary, fontSize: 19, marginTop: 15 },
  friendCount: { color: colors.secondary, fontSize: 10, marginTop: 22 },
  topFour: { flexDirection: "row", gap: 8, marginTop: 8 },
  topItem: { position: "relative" },
  rankBadge: {
    position: "absolute",
    zIndex: 1,
    top: 4,
    left: 4,
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  rankText: { color: colors.background, fontSize: 7, fontWeight: "800" },
  topEmpty: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 11,
    marginTop: 8,
  },
  topEmptyText: { color: colors.secondary, fontSize: 9 },
  addFriendCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    padding: 11,
    marginTop: 8,
  },
  friendCaption: { color: colors.secondary, fontSize: 9 },
  friendForm: { flexDirection: "row", gap: 8, marginTop: 9 },
  friendInput: {
    flex: 1,
    height: 38,
    color: colors.ink,
    fontSize: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 10,
    backgroundColor: colors.subtle,
  },
  addFriendButton: {
    minWidth: 88,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.control,
    backgroundColor: colors.ink,
    paddingHorizontal: 11,
  },
  addFriendButtonText: { color: colors.background, fontSize: 10, fontWeight: "700" },
  disabled: { opacity: 0.45 },
  friendError: { color: colors.error, fontSize: 9, marginTop: 8 },
  friendSuccess: { color: colors.success, fontSize: 9, marginTop: 8 },
  friendList: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    marginTop: 9,
    overflow: "hidden",
  },
  friendRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  lastFriendRow: { borderBottomWidth: 0 },
  friendAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink,
  },
  friendAvatarText: { color: colors.background, fontSize: 10, fontWeight: "800" },
  friendCopy: { flex: 1, marginLeft: 10 },
  friendName: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  friendUsername: { color: colors.secondary, fontSize: 8, marginTop: 2 },
  noFriends: { color: colors.secondary, fontSize: 9, padding: 13 },
  menu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    marginTop: 22,
    overflow: "hidden",
  },
  menuRow: {
    minHeight: 39,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuText: { color: colors.ink, fontSize: 10, fontWeight: "600" },
  chevron: { color: colors.secondary, fontSize: 18 },
  signOut: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: radii.control,
    marginTop: 12,
  },
  signOutText: { color: colors.ink, fontSize: 10, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});
