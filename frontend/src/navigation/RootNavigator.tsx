import React from "react";
import AuthStack from "./AuthStack";
import AppTabs from "./AppTabs";
import { useAuth } from "../auth/AuthContext";

export default function RootNavigator() {
  const { token, isRestoring } = useAuth();

  if (isRestoring) return null;

  return token ? <AppTabs /> : <AuthStack />;
}
