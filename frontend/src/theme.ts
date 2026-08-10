import { Platform } from "react-native";

export const colors = {
  background: "#FFFFFF",
  surface: "#FFFFFF",
  subtle: "#F5F5F5",
  ink: "#111111",
  secondary: "#8A8A8A",
  border: "#E5E5E5",
  error: "#B54747",
  success: "#517047",
};

export const radii = {
  small: 6,
  control: 8,
  card: 10,
};

export const brandFont = Platform.select({
  ios: "Arial Rounded MT Bold",
  android: "sans-serif-rounded",
  default: undefined,
});
