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
import { useCreateProduct, useListCategories } from "@workspace/api-client-react";

export default function NewProductScreen() {
  const colors = useColors();
  
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const { data: categories } = useListCategories();
  const createProduct = useCreateProduct();

  const handleSave = () => {
    if (!sku || !name || !sellingPrice || !costPrice) {
      alert("Please fill all required fields");
      return;
    }

    createProduct.mutate(
      {
        data: {
          sku,
          name,
          costPrice: parseFloat(costPrice) || 0,
          sellingPrice: parseFloat(sellingPrice) || 0,
          stockQty: parseInt(stockQty, 10) || 0,
          categoryId: categoryId,
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
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Name *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Unga 2kg"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>SKU *</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={sku}
          onChangeText={setSku}
          placeholder="e.g. UNG-001"
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Cost Price *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              value={costPrice}
              onChangeText={setCostPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Selling Price *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              keyboardType="decimal-pad"
              placeholder="0.00"
            />
          </View>
        </View>

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Initial Stock Quantity</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={stockQty}
          onChangeText={setStockQty}
          keyboardType="number-pad"
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>Category</Text>
        <View style={styles.categoryList}>
          {categories?.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.catBadge,
                { backgroundColor: categoryId === cat.id ? colors.primary : colors.muted }
              ]}
              onPress={() => setCategoryId(cat.id)}
            >
              <Text style={{ color: categoryId === cat.id ? colors.primaryForeground : colors.foreground }}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={createProduct.isPending}
        >
          {createProduct.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Create Product</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  label: { fontSize: 14, marginBottom: 4 },
  input: { height: 44, borderRadius: 8, paddingHorizontal: 12, marginBottom: 16 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  categoryList: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  catBadge: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  saveBtn: { height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
});