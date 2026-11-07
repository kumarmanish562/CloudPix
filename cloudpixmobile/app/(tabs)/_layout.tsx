import { Tabs } from "expo-router";
import { FolderOpen, Images, LayoutDashboard, Sparkles, User as UserIcon } from "lucide-react-native";
import { Platform } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#130e1f",
          borderTopColor: "rgba(255, 255, 255, 0.08)",
          height: Platform.OS === "ios" ? 88 : 64,
          paddingBottom: Platform.OS === "ios" ? 28 : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: "#c084fc",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Photos",
          tabBarIcon: ({ color, size }) => <Images color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: "Albums",
          tabBarIcon: ({ color, size }) => <FolderOpen color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: "AI Studio",
          tabBarIcon: ({ color, size }) => <Sparkles color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <UserIcon color={color} size={size - 2} />,
        }}
      />
    </Tabs>
  );
}
