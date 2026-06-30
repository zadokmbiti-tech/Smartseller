import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  useGetSalesTrend,
  useGetTopProducts,
  useGetPaymentBreakdown,
  GetTopProductsPeriod,
  GetPaymentBreakdownPeriod,
} from "@workspace/api-client-react";

type Period = "week" | "month" | "year";

export default function ReportsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [period, setPeriod] = useState<Period>("week");

  const { data: trend, isLoading: loadingTrend } = useGetSalesTrend({ groupBy: "day" });

  const { data: topProducts, isLoading: loadingTop } = useGetTopProducts({ period });

  const { data: payments, isLoading: loadingPayments } = useGetPaymentBreakdown({ period });

  const formatCurrency = (amount: number | string) => `KES ${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Reports</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodTabs}>
          {(["week", "month", "year"] as Period[]).map((p) => (
            <Pressable
              key={p}
              style={[
                styles.periodTab,
                { backgroundColor: period === p ? colors.primary : colors.muted },
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  { color: period === p ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Sales Trend</Text>
          {loadingTrend ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.trendList}>
              {trend?.map((t, i) => (
                <View key={i} style={styles.trendRow}>
                  <Text style={[styles.trendLabel, { color: colors.mutedForeground }]}>{t.label}</Text>
                  <Text style={[styles.trendValue, { color: colors.foreground }]}>{formatCurrency(t.revenue)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Payment Breakdown</Text>
          {loadingPayments ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.paymentList}>
              {payments?.map((p, i) => (
                <View key={i} style={styles.paymentRow}>
                  <View style={styles.paymentMethod}>
                    <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.paymentLabel, { color: colors.foreground }]}>{p.method}</Text>
                  </View>
                  <Text style={[styles.paymentValue, { color: colors.foreground }]}>{formatCurrency(p.totalAmount)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>Top Products</Text>
          {loadingTop ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.topList}>
              {topProducts?.topByRevenue.map((p, i) => (
                <View key={i} style={[styles.topRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.topInfo}>
                    <Text style={[styles.topName, { color: colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.topQty, { color: colors.mutedForeground }]}>{p.totalUnits} sold</Text>
                  </View>
                  <Text style={[styles.topRevenue, { color: colors.primary }]}>{formatCurrency(p.totalRevenue)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  periodTabs: {
    paddingHorizontal: 16,
    gap: 8,
  },
  periodTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  periodText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 100,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  trendList: {
    gap: 12,
  },
  trendRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trendLabel: {
    fontSize: 14,
  },
  trendValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  paymentList: {
    gap: 12,
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  paymentMethod: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paymentLabel: {
    fontSize: 14,
    textTransform: "capitalize",
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  topList: {
    gap: 0,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topInfo: {
    flex: 1,
    paddingRight: 16,
  },
  topName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  topQty: {
    fontSize: 13,
  },
  topRevenue: {
    fontSize: 14,
    fontWeight: "600",
  },
});