import { Stack } from "expo-router";
import React from "react";

import Colors from "@/constants/colors";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: Colors.headerText,
        headerTitleStyle: { fontWeight: "700" as const, fontSize: 15 },
        headerTitleAlign: "left" as const,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Profil",
          headerShown: false,
        }}
      />
    </Stack>
  );
}
