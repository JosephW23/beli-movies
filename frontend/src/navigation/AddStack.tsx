import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AddScreen from "../screens/AddScreen";
import AddSearchScreen from "../screens/AddSearchScreen";
import CompareScreen from "../screens/CompareScreen";
import TitleDetailScreen from "../screens/TitleDetailScreen";
import type { SelectableTitle, Title } from "../types/title";

export type AddStackParamList = {
  AddHome: undefined;
  AddSearch: undefined;
  TitleDetail: { title: SelectableTitle };
  Compare: { title: Title };
};

const Stack = createNativeStackNavigator<AddStackParamList>();

export default function AddStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddHome" component={AddScreen} />
      <Stack.Screen name="AddSearch" component={AddSearchScreen} />
      <Stack.Screen name="TitleDetail" component={TitleDetailScreen} />
      <Stack.Screen name="Compare" component={CompareScreen} />
    </Stack.Navigator>
  );
}
