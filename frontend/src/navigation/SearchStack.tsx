import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import CompareScreen from "../screens/CompareScreen";
import EditScoreScreen from "../screens/EditScoreScreen";
import ReviewScreen from "../screens/ReviewScreen";
import SearchScreen from "../screens/SearchScreen";
import TitleDetailScreen from "../screens/TitleDetailScreen";
import type { SelectableTitle, Title } from "../types/title";

export type SearchStackParamList = {
  SearchHome: undefined;
  TitleDetail: { title: SelectableTitle };
  Compare: { title: Title };
  EditScore: { title: Title; currentScore: number };
  WriteReview: { title: Title; finishFlow?: boolean };
};

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchHome" component={SearchScreen} />
      <Stack.Screen name="TitleDetail" component={TitleDetailScreen} />
      <Stack.Screen name="Compare" component={CompareScreen} />
      <Stack.Screen name="EditScore" component={EditScoreScreen} />
      <Stack.Screen name="WriteReview" component={ReviewScreen} />
    </Stack.Navigator>
  );
}
