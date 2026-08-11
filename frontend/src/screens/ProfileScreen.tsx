import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";

import { getMyList } from "../api/events";
import type { MyList } from "../api/events";
import { getMe } from "../api/me";
import type { CurrentUser } from "../api/me";
import { getMyRankings } from "../api/ranking";
import { getMyReviews } from "../api/personal";
import type { Review } from "../api/personal";
import { getStoredTitle } from "../api/titles";
import { addFriend, getFriends } from "../api/social";
import type { SocialUser } from "../api/social";
import { useAuth } from "../auth/AuthContext";
import AppScreenHeader from "../components/AppScreenHeader";
import FriendsSection from "../components/FriendsSection";
import RankingList from "../components/RankingList";
import TitleRowList from "../components/TitleRowList";
import TitlePoster from "../components/TitlePoster";
import { colors, radii } from "../theme";
import type { AppTabsParamList } from "../navigation/AppTabs";
import type { PersonalRanking } from "../types/ranking";

const EMPTY_LIST: MyList = { want_to_watch: [], watched: [] };
type RankingFilter = "all" | "movie" | "tv";
type ListFilter = "want" | "watched";

type Props = BottomTabScreenProps<AppTabsParamList, "Profile">;

export default function ProfileScreen({ navigation }: Props) {
  const { token, signOut, isLoading } = useAuth();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [myList, setMyList] = useState<MyList>(EMPTY_LIST);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [friendUsername, setFriendUsername] = useState("");
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  const [friendError, setFriendError] = useState<string | null>(null);
  const [friendSuccess, setFriendSuccess] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [rankings, setRankings] = useState<PersonalRanking[]>([]);
  const [rankingFilter, setRankingFilter] = useState<RankingFilter>("all");
  const [isRankingsLoading, setIsRankingsLoading] = useState(true);
  const [rankingsError, setRankingsError] = useState<string | null>(null);
  const [listFilter, setListFilter] = useState<ListFilter>("want");
  const [reviews, setReviews] = useState<Review[]>([]);

  const loadProfile = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      setIsProfileLoading(true);
      try {
        const [currentUser, list, currentFriends, currentReviews] = await Promise.all([
          getMe(token, signal),
          getMyList(token, signal),
          getFriends(token, signal),
          getMyReviews(token, signal),
        ]);
        setUser(currentUser);
        setMyList(list);
        setFriends(currentFriends);
        setReviews(currentReviews);
        setProfileError(null);
      } catch (requestError) {
        if (!signal?.aborted) {
          setProfileError(
            requestError instanceof Error ? requestError.message : "Could not load profile"
          );
        }
      } finally {
        if (!signal?.aborted) setIsProfileLoading(false);
      }
    },
    [token]
  );

  const loadRankings = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) return;
      setIsRankingsLoading(true);
      try {
        setRankings(
          await getMyRankings(
            token,
            20,
            rankingFilter === "all" ? undefined : rankingFilter,
            signal
          )
        );
        setRankingsError(null);
      } catch (requestError) {
        if (!signal?.aborted) {
          setRankingsError(
            requestError instanceof Error
              ? requestError.message
              : "Could not load rankings."
          );
        }
      } finally {
        if (!signal?.aborted) setIsRankingsLoading(false);
      }
    },
    [rankingFilter, token]
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const controller = new AbortController();
      void loadProfile(controller.signal);
      return () => controller.abort();
    }, [loadProfile, token])
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      const controller = new AbortController();
      void loadRankings(controller.signal);
      return () => controller.abort();
    }, [loadRankings, token])
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
  const rankedTitles = useMemo(
    () =>
      myList.watched
        .filter((title) => title.personal_rank != null && title.personal_score != null)
        .sort((left, right) => (left.personal_rank ?? 0) - (right.personal_rank ?? 0)),
    [myList.watched]
  );

  async function handleAddFriend() {
    const usernameToAdd = friendUsername.trim().replace(/^@/, "");
    if (!token || !usernameToAdd) return;

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

  async function openStoredTitle(titleId: number) {
    try {
      const title = await getStoredTitle(titleId);
      navigation.navigate("Search", { screen: "TitleDetail", params: { title } });
    } catch (requestError) {
      setProfileError(
        requestError instanceof Error ? requestError.message : "Could not open title"
      );
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

        {isProfileLoading ? (
          <View style={styles.profileLoading}>
            <ActivityIndicator size="small" color={colors.ink} />
            <Text style={styles.profileLoadingText}>Loading your profile…</Text>
          </View>
        ) : null}
        {profileError ? (
          <Pressable style={styles.profileError} onPress={() => void loadProfile()}>
            <Text style={styles.profileErrorText}>{profileError}</Text>
            <Text style={styles.profileErrorText}>Tap to retry</Text>
          </Pressable>
        ) : null}

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
            [reviews.length, "Reviews"],
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

        <Text style={styles.sectionTitle}>My List</Text>
        <View style={styles.listFilters}>
          {([
            ["want", "Want to Watch"],
            ["watched", "Watched"],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setListFilter(value)}
              style={[
                styles.listFilter,
                listFilter === value && styles.activeListFilter,
              ]}
            >
              <Text
                style={[
                  styles.listFilterText,
                  listFilter === value && styles.activeListFilterText,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.profileList}>
          <TitleRowList
            titles={listFilter === "want" ? myList.want_to_watch : myList.watched}
            onPress={(title) => void openStoredTitle(Number(title.id))}
            emptyMessage={
              !isProfileLoading
                ? listFilter === "want"
                  ? "Your Want to Watch list is empty."
                  : "You haven't marked anything as watched yet."
                : undefined
            }
          />
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
        {rankedTitles.length ? (
          <View style={styles.topFour}>
            {rankedTitles.slice(0, 4).map((title) => (
              <Pressable
                key={title.event_id}
                style={({ pressed }) => [styles.topItem, pressed && styles.pressed]}
                onPress={() => void openStoredTitle(title.id)}
              >
                <View style={styles.rankBadge}><Text style={styles.rankText}>{title.personal_rank}</Text></View>
                <TitlePoster name={title.name} posterUrl={title.poster_url} width={74} height={108} />
                <Text style={styles.topScore}>{title.personal_score?.toFixed(1)}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.topEmpty}>
            <Text style={styles.topEmptyText}>Mark titles as watched to build your Top 4.</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>My Rankings</Text>
        <View style={styles.rankingFilters}>
          {([
            ["all", "All"],
            ["movie", "Movies"],
            ["tv", "TV"],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setRankingFilter(value)}
              style={[
                styles.rankingFilter,
                rankingFilter === value && styles.activeRankingFilter,
              ]}
            >
              <Text
                style={[
                  styles.rankingFilterText,
                  rankingFilter === value && styles.activeRankingFilterText,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {isRankingsLoading ? (
          <View style={styles.rankingsLoading}>
            <ActivityIndicator size="small" color={colors.ink} />
            <Text style={styles.rankingsLoadingText}>Loading rankings…</Text>
          </View>
        ) : rankingsError ? (
          <Pressable style={styles.rankingsError} onPress={() => void loadRankings()}>
            <Text style={styles.rankingsErrorText}>Could not load rankings.</Text>
            <Text style={styles.rankingsRetry}>Tap to retry</Text>
          </Pressable>
        ) : (
          <RankingList
            titles={rankings}
            onPress={(title) => void openStoredTitle(title.title_id)}
          />
        )}

        <FriendsSection
          friends={friends}
          username={friendUsername}
          onChangeUsername={setFriendUsername}
          onAdd={() => void handleAddFriend()}
          isLoading={isProfileLoading}
          isAdding={isAddingFriend}
          error={friendError}
          success={friendSuccess}
        />

        <Text style={styles.sectionTitle}>Your Reviews</Text>
        {reviews.length ? (
          <View style={styles.reviewsCard}>
            {reviews.map((review, index) => (
              <Pressable
                key={review.id}
                onPress={() => void openStoredTitle(review.title_id)}
                style={({ pressed }) => [
                  styles.reviewRow,
                  index < reviews.length - 1 && styles.reviewDivider,
                  pressed && styles.pressed,
                ]}
              >
                <TitlePoster name={review.title_name} posterUrl={review.poster_url} width={44} height={64} />
                <View style={styles.reviewCopy}>
                  <View style={styles.reviewHeading}>
                    <Text style={styles.reviewTitle} numberOfLines={1}>{review.title_name}</Text>
                    {review.score != null ? <Text style={styles.reviewScore}>{review.score.toFixed(1)}</Text> : null}
                  </View>
                  <Text style={styles.reviewBody} numberOfLines={3}>{review.body}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.topEmpty}>
            <Text style={styles.topEmptyText}>Your written reviews will appear here.</Text>
          </View>
        )}

        <View style={styles.menu}>
          {["Activity", "Account"].map((item) => (
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
  profileLoading: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  profileLoadingText: { color: "#707070", fontSize: 12 },
  profileError: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.control,
    padding: 10,
    marginTop: 12,
  },
  profileErrorText: { color: colors.error, fontSize: 12, marginTop: 2 },
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
  email: { color: "#707070", fontSize: 12, marginTop: 2 },
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
  statValue: { color: colors.ink, fontSize: 16, fontWeight: "800" },
  statLabel: { color: "#707070", fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 23, backgroundColor: colors.border },
  listFilters: { flexDirection: "row", gap: 8, marginTop: 9 },
  listFilter: {
    flex: 1,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.subtle,
  },
  activeListFilter: { backgroundColor: colors.ink, borderColor: colors.ink },
  listFilterText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  activeListFilterText: { color: colors.background },
  profileList: { marginTop: 9 },
  sectionTitle: { color: colors.ink, fontSize: 20, fontWeight: "800", marginTop: 22 },
  tasteCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    padding: 11,
    marginTop: 8,
  },
  tasteCaption: { color: "#707070", fontSize: 11 },
  tasteChips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  tasteChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  tasteText: { color: colors.ink, fontSize: 11, textTransform: "capitalize" },
  tasteEmpty: { color: "#707070", fontSize: 12, marginTop: 7 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  arrow: { color: "#707070", fontSize: 23, marginTop: 15 },
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
  rankText: { color: colors.background, fontSize: 9, fontWeight: "800" },
  topScore: { color: colors.ink, fontSize: 12, fontWeight: "800", textAlign: "center", marginTop: 5 },
  topEmpty: {
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    paddingHorizontal: 11,
    marginTop: 8,
  },
  topEmptyText: { color: "#707070", fontSize: 12 },
  rankingFilters: { flexDirection: "row", gap: 8, marginTop: 10 },
  rankingFilter: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.control,
    backgroundColor: colors.subtle,
    paddingHorizontal: 14,
  },
  activeRankingFilter: { backgroundColor: colors.ink, borderColor: colors.ink },
  rankingFilterText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  activeRankingFilterText: { color: colors.background },
  rankingsLoading: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    marginTop: 9,
  },
  rankingsLoadingText: { color: "#707070", fontSize: 12 },
  rankingsError: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radii.card,
    padding: 12,
    marginTop: 9,
  },
  rankingsErrorText: { color: colors.error, fontSize: 12 },
  rankingsRetry: { color: colors.error, fontSize: 12, fontWeight: "800", marginTop: 3 },
  reviewsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    backgroundColor: colors.surface,
    marginTop: 9,
    overflow: "hidden",
  },
  reviewRow: { flexDirection: "row", padding: 11 },
  reviewDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  reviewCopy: { flex: 1, marginLeft: 11 },
  reviewHeading: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewTitle: { flex: 1, color: colors.ink, fontSize: 14, fontWeight: "800", marginRight: 8 },
  reviewScore: { color: colors.ink, fontSize: 14, fontWeight: "900" },
  reviewBody: { color: "#5F5A55", fontSize: 12, lineHeight: 17, marginTop: 5 },
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
  menuText: { color: colors.ink, fontSize: 13, fontWeight: "600" },
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
  signOutText: { color: colors.ink, fontSize: 13, fontWeight: "700" },
  pressed: { opacity: 0.65 },
});
