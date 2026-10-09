import { TextStyle } from "react-native";

export const fonts = {
  heading: "BarlowCondensed-Bold",
  headingMedium: "BarlowCondensed-SemiBold",
  body: "IBMPlexSans-Regular",
  bodyMedium: "IBMPlexSans-Medium",
} as const;

export const typography = {
  h1: {
    fontFamily: fonts.heading,
    fontSize: 32,
    lineHeight: 36,
    color: "#EDEFF3",
    letterSpacing: 0.5,
  } as TextStyle,
  h2: {
    fontFamily: fonts.heading,
    fontSize: 24,
    lineHeight: 28,
    color: "#EDEFF3",
  } as TextStyle,
  h3: {
    fontFamily: fonts.headingMedium,
    fontSize: 18,
    lineHeight: 22,
    color: "#EDEFF3",
  } as TextStyle,
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 20,
    color: "#EDEFF3",
  } as TextStyle,
  bodyMuted: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 19,
    color: "#8791A6",
  } as TextStyle,
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    lineHeight: 16,
    color: "#8791A6",
    letterSpacing: 0.3,
  } as TextStyle,
  button: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 20,
  } as TextStyle,
} as const;
