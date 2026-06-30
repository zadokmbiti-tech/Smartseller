import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { useGetSale } from "@workspace/api-client-react";

export default function SaleDetailScreen() {
  const { id: idString } = useLocalSearchParams<{ id: string }>();
  const id = parseInt(idString || "0", 10);
  const colors = useColors();

  const { data: sale, isLoading } = useGetSale(id, {
    query: { enabled: !!id, queryKey: ["sale", id] },
  });

  const formatCurrency = (amount: number | string) => `KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Sale not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={[styles.receiptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <Feather name="check-circle" size={48} color={colors.success} />
          <Text style={[styles.receiptTitle, { color: colors.foreground }]}>Receipt</Text>
          <Text style={[styles.receiptNo, { color: colors.mutedForeground }]}>{sale.receiptNumber}</Text>
        </View>

        <View style={[styles.divider, { borderBottomColor: colors.border }]} />

        <View style={styles.itemsList}>
          {sale.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: colors.foreground }]}>{item.productName}</Text>
                <Text style={[styles.itemQty, { color: colors.mutedForeground }]}>
                  {item.quantity} x {formatCurrency(item.unitPrice)}
                </Text>
              </View>
              <Text style={[styles.itemTotal, { color: colors.foreground }]}>
                {formatCurrency(item.lineTotal)}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.divider, { borderBottomColor: colors.border }]} />

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Subtotal</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatCurrency(sale.subtotal)}</Text>
          </View>
          {sale.discountAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Discount</Text>
              <Text style={[styles.totalValue, { color: colors.destructive }]}>-{formatCurrency(sale.discountAmount)}</Text>
            </View>
          )}
          <View style={[styles.grandTotalRow, { borderTopColor: colors.border }]}>
            <Text style={[styles.grandTotalLabel, { color: colors.foreground }]}>Total</Text>
            <Text style={[styles.grandTotalValue, { color: colors.primary }]}>{formatCurrency(sale.totalAmount)}</Text>
          </View>
        </View>

        <View style={[styles.paymentInfo, { backgroundColor: colors.muted }]}>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Payment Method</Text>
            <Text style={[styles.totalValue, { color: colors.foreground, textTransform: 'capitalize' }]}>{sale.paymentMethod}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Amount Paid</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatCurrency(sale.amountPaid)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Change Due</Text>
            <Text style={[styles.totalValue, { color: colors.foreground }]}>{formatCurrency(sale.changeDue)}</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  receiptCard: { padding: 24, borderRadius: 16, borderWidth: 1 },
  header: { alignItems: "center", gap: 8, marginBottom: 24 },
  receiptTitle: { fontSize: 24, fontWeight: "700" },
  receiptNo: { fontSize: 14 },
  divider: { borderBottomWidth: 1, borderStyle: "dashed", marginVertical: 16 },
  itemsList: { gap: 12 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: "500", marginBottom: 2 },
  itemQty: { fontSize: 13 },
  itemTotal: { fontSize: 14, fontWeight: "600" },
  totals: { gap: 8, marginBottom: 24 },
  totalRow: { flexDirection: "row", justifyContent: "space-between" },
  totalLabel: { fontSize: 14 },
  totalValue: { fontSize: 14, fontWeight: "500" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  grandTotalLabel: { fontSize: 16, fontWeight: "700" },
  grandTotalValue: { fontSize: 18, fontWeight: "700" },
  paymentInfo: { padding: 16, borderRadius: 12, gap: 8 },
});