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
import { useListPurchaseOrders } from "@workspace/api-client-react";

export default function PurchaseOrdersScreen() {
  const colors = useColors();
  const { data: pos, isLoading } = useListPurchaseOrders();

  const formatCurrency = (amount: number | string) => `KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={pos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.row}>
                <Text style={[styles.supplierName, { color: colors.foreground }]}>{item.supplierName}</Text>
                <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                  <Text style={[styles.badgeText, { color: colors.foreground }]}>{item.status}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <Text style={[styles.date, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
                <Text style={[styles.total, { color: colors.primary }]}>{formatCurrency(item.totalAmount)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="file-text" size={48} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No purchase orders</Text>
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
  card: { padding: 16, borderRadius: 12, borderWidth: 1, gap: 12 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  supplierName: { fontSize: 16, fontWeight: "600" },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  date: { fontSize: 14 },
  total: { fontSize: 16, fontWeight: "700" },
  empty: { padding: 48, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontSize: 16, fontWeight: "500" },
});