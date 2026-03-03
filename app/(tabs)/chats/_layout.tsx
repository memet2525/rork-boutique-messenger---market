import { Stack, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity } from "react-native";
import { ChevronLeft } from "lucide-react-native";

import Colors from "@/constants/colors";

export default function ChatsLayout() {
  const router = useRouter();

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
          title: "Sohbetler",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 8 }}>
              <ChevronLeft size={26} color={Colors.headerText} />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
