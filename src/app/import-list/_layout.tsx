import { Stack } from 'expo-router/stack';

export default function ImportListLayout() {
  return (
    <Stack>
      <Stack.Screen name="import-list" options={{ headerShown: false }} />
    </Stack>
  );
}
