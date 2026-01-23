import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "../screens/HomeScreen";
import AddScreen from "../screens/AddScreen";
import ProfileScreen from "../screens/ProfileScreen";

export type AppTabsParamList = {
  Home: undefined;
  Add: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AppTabsParamList>();

export default function AppTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Add" component={AddScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
