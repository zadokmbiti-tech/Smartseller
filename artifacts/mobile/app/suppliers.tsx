import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useListSuppliers } from "@workspace/api-client-react";

export default function SuppliersScreen() {
  const colors = useColors();
  const { data: suppliers, isLoading } = useListSuppliers();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={suppliers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
              {item.contactName && (
                <Text style={[styles.contact, { color: colors.mutedForeground }]}>{item.contactName}</Text>
              )}
              {item.phone && (
                <Text style={[styles.contact, { color: colors.mutedForeground }]}>{item.phone}</Text>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="users" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No suppliers found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  name: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  contact: { fontSize: 14, marginBottom: 2 },
  empty: { padding: 48, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 16, fontWeight: "500" },
});