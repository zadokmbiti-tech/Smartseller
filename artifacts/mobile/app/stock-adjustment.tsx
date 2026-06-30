import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useColors } from "@/hooks/useColors";
import { useCreateStockAdjustment, useListProducts, CreateStockAdjustmentInputAdjustmentType } from "@workspace/api-client-react";

export default function StockAdjustmentScreen() {
  const colors = useColors();
  
  const [productId, setProductId] = useState<number | null>(null);
  const [type, setType] = useState<CreateStockAdjustmentInputAdjustmentType>("correction");
  const [quantityChange, setQuantityChange] = useState("");
  const [reason, setReason] = useState("");

  const { data: products } = useListProducts();
  const createAdj = useCreateStockAdjustment();

  const handleSave = () => {
    if (!productId || !quantityChange) {
      alert("Please fill required fields");
      return;
    }

    createAdj.mutate(
      {
        data: {
          productId,
          adjustmentType: type,
          quantityChange: parseInt(quantityChange, 10),
          reason,
        },
      },
      {
        onSuccess: () => {
          router.back();
        },
      }
    );
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Product *</Text>
        <View style={styles.productList}>
          {products?.map((p) => (
            <Pressable
              key={p.id}
              style={[
                styles.badge,
                { backgroundColor: productId === p.id ? colors.primary : colors.muted }
              ]}
              onPress={() => setProductId(p.id)}
            >
              <Text style={{ color: productId === p.id ? colors.primaryForeground : colors.foreground }}>
                {p.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Adjustment Type *</Text>
        <View style={styles.typeList}>
          {(["correction", "damage", "shrinkage", "return", "opening_stock"] as const).map((t) => (
            <Pressable
              key={t}
              style={[
                styles.badge,
                { backgroundColor: type === t ? colors.primary : colors.muted }
              ]}
              onPress={() => setType(t)}
            >
              <Text style={{ color: type === t ? colors.primaryForeground : colors.foreground, textTransform: 'capitalize' }}>
                {t.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Quantity Change (+ or -) *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={quantityChange}
          onChangeText={setQuantityChange}
          keyboardType="numbers-and-punctuation"
          placeholder="e.g. -5 or 10"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Reason</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={reason}
          onChangeText={setReason}
        />

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={createAdj.isPending}
        >
          {createAdj.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Adjustment</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  label: { fontSize: 14, marginBottom: 8, marginTop: 16 },
  input: { height: 44, borderRadius: 8, paddingHorizontal: 12 },
  productList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  typeList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  saveBtn: { height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 24 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});