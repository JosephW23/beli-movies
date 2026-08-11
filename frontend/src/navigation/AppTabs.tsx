import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import type { NavigatorScreenParams } from "@react-navigation/native";

import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchStack from "./SearchStack";
import type { SearchStackParamList } from "./SearchStack";
import { colors } from "../theme";

export type AppTabsParamList = {
  Home: undefined;
  Search: NavigatorScreenParams<SearchStackParamList> | undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const searchRoute = route.name === "Search" ? getFocusedRouteNameFromRoute(route) : undefined;
        return {
          headerShown: false,
          tabBarActiveTintColor: colors.ink,
          tabBarInactiveTintColor: "#737373",
          tabBarLabelStyle: { fontSize: 13, fontWeight: "700", marginTop: 2 },
          tabBarStyle: {
            display: searchRoute === "Compare" ? "none" : "flex",
            height: 82,
            paddingTop: 8,
            paddingBottom: 10,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
          tabBarIcon: ({ color, focused }) => (
            <TabGlyph name={route.name} color={color} focused={focused} />
          ),
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function TabGlyph({
  name,
  color,
  focused,
}: {
  name: keyof AppTabsParamList;
  color: string;
  focused: boolean;
}) {
  const glyphs: Record<keyof AppTabsParamList, string> = {
    Home: "⌂",
    Search: "⌕",
    Profile: "○",
  };

  return (
    <Text
      style={{
        color,
        fontSize: 28,
        fontWeight: focused ? "800" : "500",
        lineHeight: 31,
      }}
    >
      {glyphs[name]}
    </Text>
  );
}
