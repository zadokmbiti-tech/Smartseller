import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useGetAnalyticsOverview,
  useGetLowStockProducts,
  useGetReorderRecommendations,
} from "@workspace/api-client-react";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const {
    data: overview,
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = useGetAnalyticsOverview();

  const {
    data: lowStock,
    isLoading: loadingLowStock,
    refetch: refetchLowStock,
  } = useGetLowStockProducts();

  const {
    data: recommendations,
    isLoading: loadingRecs,
    refetch: refetchRecs,
  } = useGetReorderRecommendations();

  const onRefresh = React.useCallback(() => {
    refetchOverview();
    refetchLowStock();
    refetchRecs();
  }, [refetchOverview, refetchLowStock, refetchRecs]);

  const formatCurrency = (amount: number | string) => {
    return `KES ${Number(amount).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const isLoading = loadingOverview || loadingLowStock || loadingRecs;

  if (isLoading && !overview) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: 100,
        paddingHorizontal: 16,
      }}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} />
      }
    >
      <Text style={[styles.headerTitle, { color: colors.foreground }]}>
        Dashboard
      </Text>

      {overview && (
        <View style={styles.grid}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="dollar-sign" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
                Today's Revenue
              </Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {formatCurrency(overview.totalRevenue)}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="shopping-bag" size={20} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.mutedForeground }]}>
                Transactions
              </Text>
            </View>
            <Text style={[styles.cardValue, { color: colors.foreground }]}>
              {overview.totalTransactions}
            </Text>
          </View>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Alerts & Actions
      </Text>

      {(lowStock?.length ?? 0) > 0 ? (
        <View style={[styles.alertCard, { backgroundColor: colors.destructive + "10", borderColor: colors.destructive + "30" }]}>
          <View style={styles.alertHeader}>
            <Feather name="alert-triangle" size={20} color={colors.destructive} />
            <Text style={[styles.alertTitle, { color: colors.destructive }]}>
              {lowStock?.length} Items Low on Stock
            </Text>
          </View>
          {lowStock?.slice(0, 3).map((item) => (
            <View key={item.productId} style={styles.alertItem}>
              <Text style={[styles.alertItemName, { color: colors.foreground }]}>{item.name}</Text>
              <Text style={[styles.alertItemStock, { color: colors.destructive }]}>{item.stockQty} left</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="check-circle" size={24} color={colors.success} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Stock levels are looking good</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Reorder Recommendations
      </Text>

      {recommendations?.length ? (
        recommendations.slice(0, 5).map((rec) => (
          <View key={rec.productId} style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.recInfo}>
              <Text style={[styles.recName, { color: colors.foreground }]}>{rec.name}</Text>
              <Text style={[styles.recDetails, { color: colors.mutedForeground }]}>
                Stock: {rec.currentStock} • Order: {rec.recommendedOrderQty}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.primary + "20" }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{rec.urgency}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No immediate reorders needed</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  cardValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 8,
  },
  alertCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  alertItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  alertItemName: {
    fontSize: 14,
    flex: 1,
  },
  alertItemStock: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  recCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  recInfo: {
    flex: 1,
  },
  recName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  recDetails: {
    fontSize: 13,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});