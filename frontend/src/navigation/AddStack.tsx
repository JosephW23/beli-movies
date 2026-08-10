import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AddScreen from "../screens/AddScreen";
import AddSearchScreen from "../screens/AddSearchScreen";
import TitleDetailScreen from "../screens/TitleDetailScreen";
import type { Title } from "../types/title";

export type AddStackParamList = {
  AddHome: undefined;
  AddSearch: undefined;
  TitleDetail: { title: Title };
};

const Stack = createNativeStackNavigator<AddStackParamList>();

export default function AddStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddHome" component={AddScreen} />
      <Stack.Screen name="AddSearch" component={AddSearchScreen} />
      <Stack.Screen name="TitleDetail" component={TitleDetailScreen} />
    </Stack.Navigator>
  );
}
