import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HomeScreen from "../screens/HomeScreen";
import RecommendationListScreen from "../screens/RecommendationListScreen";

export type HomeStackParamList = {
  HomeFeed: undefined;
  Recommendations: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeFeed" component={HomeScreen} />
      <Stack.Screen name="Recommendations" component={RecommendationListScreen} />
    </Stack.Navigator>
  );
}
