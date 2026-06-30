import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";

import { useColors } from "@/hooks/useColors";
import {
  useGetProduct,
  useUpdateProduct,
  useGetProductStockMovements,
  useGetProductDemandForecast,
  useListCategories,
} from "@workspace/api-client-react";

export default function ProductDetailScreen() {
  const { id: idString } = useLocalSearchParams<{ id: string }>();
  const id = parseInt(idString || "0", 10);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: product, isLoading: loadingProduct } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: ["product", id] },
  });

  const { data: movements, isLoading: loadingMovements } = useGetProductStockMovements(id, undefined, {
    query: { enabled: !!id, queryKey: ["productMovements", id] },
  });

  const { data: forecast, isLoading: loadingForecast } = useGetProductDemandForecast(id, {
    query: { enabled: !!id, queryKey: ["productForecast", id] },
  });

  const { data: categories } = useListCategories();

  const updateProduct = useUpdateProduct();

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");

  useEffect(() => {
    if (product) {
      setSku(product.sku);
      setName(product.name);
      setSellingPrice(product.sellingPrice.toString());
      setCostPrice(product.costPrice.toString());
    }
  }, [product]);

  const handleSave = () => {
    if (!product) return;
    updateProduct.mutate({
      id,
      data: {
        sku,
        name,
        sellingPrice: parseFloat(sellingPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        categoryId: product.categoryId,
      },
    }, {
      onSuccess: () => {
        alert("Product updated");
      }
    });
  };

  if (loadingProduct) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground }}>Product not found.</Text>
      </View>
    );
  }

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Product Details</Text>
        
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Name</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={name}
          onChangeText={setName}
        />

        <Text style={[styles.label, { color: colors.mutedForeground }]}>SKU</Text>
        <TextInput
          style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
          value={sku}
          onChangeText={setSku}
        />

        <View style={styles.row}>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Cost Price</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              value={costPrice}
              onChangeText={setCostPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.half}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>Selling Price</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground }]}
              value={sellingPrice}
              onChangeText={setSellingPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Pressable
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          disabled={updateProduct.isPending}
        >
          {updateProduct.isPending ? (
            <ActivityIndicator color={colors.primaryForeground} />
          ) : (
            <Text style={[styles.saveBtnText, { color: colors.primaryForeground }]}>Save Changes</Text>
          )}
        </Pressable>
      </View>

      {forecast && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Demand Forecast</Text>
          <Text style={[styles.text, { color: colors.mutedForeground }]}>
            Average daily sales: {forecast.avgDailySales}
          </Text>
          <Text style={[styles.text, { color: colors.mutedForeground }]}>
            Forecasted demand ({forecast.forecastPeriodDays} days): {forecast.forecastedDemand}
          </Text>
        </View>
      )}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Movements</Text>
        {loadingMovements ? (
          <ActivityIndicator color={colors.primary} />
        ) : movements?.length === 0 ? (
          <Text style={[styles.text, { color: colors.mutedForeground }]}>No movements recorded.</Text>
        ) : (
          movements?.map((m) => (
            <View key={m.id} style={[styles.movementRow, { borderBottomColor: colors.border }]}>
              <View>
                <Text style={[styles.movementType, { color: colors.foreground }]}>{m.movementType}</Text>
                <Text style={[styles.movementDate, { color: colors.mutedForeground }]}>
                  {new Date(m.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[
                styles.movementQty,
                { color: m.quantityChange > 0 ? colors.success : colors.destructive }
              ]}>
                {m.quantityChange > 0 ? "+" : ""}{m.quantityChange}
              </Text>
            </View>
          ))
        )}
      </View>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { padding: 16, borderRadius: 12, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "600", marginBottom: 16 },
  label: { fontSize: 14, marginBottom: 4 },
  input: { height: 44, borderRadius: 8, paddingHorizontal: 12, marginBottom: 12 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  saveBtn: { height: 48, borderRadius: 8, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: "600" },
  text: { fontSize: 14, marginBottom: 8 },
  movementRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1 },
  movementType: { fontSize: 14, fontWeight: "500", textTransform: "capitalize" },
  movementDate: { fontSize: 12 },
  movementQty: { fontSize: 16, fontWeight: "600" },
});