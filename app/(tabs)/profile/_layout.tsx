import { Stack, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

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
          headerLeft: () => {
            const router = useRouter();
            return (
              <TouchableOpacity
                onPress={() => router.back()}
                style={{ marginRight: 8, padding: 4 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={24} color={Colors.headerText} />
              </TouchableOpacity>
            );
          },
        }}
      />
    </Stack>
  );
}
