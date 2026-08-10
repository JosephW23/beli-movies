import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import AddScreen from "../screens/AddScreen";
import SearchScreen from "../screens/SearchScreen";
import ProfileScreen from "../screens/ProfileScreen";
import { colors } from "../theme";

export type AppTabsParamList = {
  Home: undefined;
  Add: undefined;
  Search: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: "#9A9A9A",
        tabBarLabelStyle: { fontSize: 9, fontWeight: "600" },
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 7,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarIcon: ({ color, focused }) => (
          <TabGlyph name={route.name} color={color} focused={focused} />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
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
    Add: "+",
    Search: "⌕",
    Profile: "○",
  };

  return (
    <Text
      style={{
        color,
        fontSize: name === "Add" ? 20 : 18,
        fontWeight: focused ? "800" : "500",
        lineHeight: 20,
      }}
    >
      {glyphs[name]}
    </Text>
  );
}
