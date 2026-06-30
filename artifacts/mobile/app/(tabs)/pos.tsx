import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { router } from "expo-router";

import { useColors } from "@/hooks/useColors";
import {
  useListProducts,
  useCreateSale,
  Product,
} from "@workspace/api-client-react";

interface CartItem extends Product {
  cartQty: number;
}

export default function PosScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "mpesa" | "bank">("cash");

  const { data: products, isLoading } = useListProducts();

  const createSale = useCreateSale();

  const filteredProducts = products?.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    Haptics.selectionAsync();
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, cartQty: p.cartQty + 1 } : p
        );
      }
      return [...prev, { ...product, cartQty: 1 }];
    });
  };

  const updateCartQty = (id: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCart((prev) =>
      prev
        .map((p) => (p.id === id ? { ...p, cartQty: p.cartQty + delta } : p))
        .filter((p) => p.cartQty > 0)
    );
  };

  const formatCurrency = (amount: number | string) => `KES ${Number(amount).toFixed(2)}`;

  const total = cart.reduce((sum, item) => sum + Number(item.sellingPrice) * item.cartQty, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    createSale.mutate(
      {
        data: {
          paymentMethod,
          amountPaid: total,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.cartQty,
            unitPrice: item.sellingPrice,
          })),
        },
      },
      {
        onSuccess: (res) => {
          setCart([]);
          router.push(`/sale/${res.id}`);
        },
        onError: () => {
          alert("Failed to process sale");
        },
      }
    );
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        { backgroundColor: colors.card, borderColor: colors.border },
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => addToCart(item)}
    >
      <View style={styles.productInfo}>
        <Text style={[styles.productName, { color: colors.foreground }]} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={[styles.productPrice, { color: colors.primary }]}>
          {formatCurrency(item.sellingPrice)}
        </Text>
      </View>
      <View style={[styles.addButton, { backgroundColor: colors.primary + "15" }]}>
        <Feather name="plus" size={20} color={colors.primary} />
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16, backgroundColor: colors.card }]}>
        <View style={[styles.searchContainer, { backgroundColor: colors.muted }]}>
          <Feather name="search" size={20} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search products..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.productsSection}>
          {isLoading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
          ) : (
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderProduct}
              contentContainerStyle={styles.productList}
              numColumns={2}
              columnWrapperStyle={{ gap: 12 }}
            />
          )}
        </View>

        <View style={[styles.cartSection, { backgroundColor: colors.card, borderLeftColor: colors.border }]}>
          <Text style={[styles.cartTitle, { color: colors.foreground }]}>Cart ({cart.length})</Text>
          
          <FlatList
            data={cart}
            keyExtractor={(item) => `cart-${item.id}`}
            contentContainerStyle={styles.cartList}
            renderItem={({ item }) => (
              <View style={[styles.cartItem, { borderBottomColor: colors.border }]}>
                <View style={styles.cartItemInfo}>
                  <Text style={[styles.cartItemName, { color: colors.foreground }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={[styles.cartItemPrice, { color: colors.mutedForeground }]}>
                    {formatCurrency(item.sellingPrice)}
                  </Text>
                </View>
                <View style={styles.qtyControls}>
                  <Pressable
                    style={[styles.qtyButton, { backgroundColor: colors.muted }]}
                    onPress={() => updateCartQty(item.id, -1)}
                  >
                    <Feather name="minus" size={16} color={colors.foreground} />
                  </Pressable>
                  <Text style={[styles.qtyText, { color: colors.foreground }]}>{item.cartQty}</Text>
                  <Pressable
                    style={[styles.qtyButton, { backgroundColor: colors.muted }]}
                    onPress={() => updateCartQty(item.id, 1)}
                  >
                    <Feather name="plus" size={16} color={colors.foreground} />
                  </Pressable>
                </View>
              </View>
            )}
          />

          <View style={[styles.checkoutSection, { borderTopColor: colors.border }]}>
            <View style={styles.paymentMethods}>
              {(["cash", "mpesa", "bank"] as const).map((method) => (
                <Pressable
                  key={method}
                  style={[
                    styles.methodButton,
                    {
                      backgroundColor: paymentMethod === method ? colors.primary : colors.muted,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setPaymentMethod(method);
                  }}
                >
                  <Text
                    style={[
                      styles.methodText,
                      { color: paymentMethod === method ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {method.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.foreground }]}>Total</Text>
              <Text style={[styles.totalValue, { color: colors.primary }]}>{formatCurrency(total)}</Text>
            </View>

            <Pressable
              style={[
                styles.checkoutButton,
                { backgroundColor: cart.length > 0 ? colors.primary : colors.muted },
                createSale.isPending && { opacity: 0.7 }
              ]}
              disabled={cart.length === 0 || createSale.isPending}
              onPress={handleCheckout}
            >
              {createSale.isPending ? (
                <ActivityIndicator color={colors.primaryForeground} />
              ) : (
                <Text style={[styles.checkoutText, { color: cart.length > 0 ? colors.primaryForeground : colors.mutedForeground }]}>
                  Charge {formatCurrency(total)}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    flex: 1,
    flexDirection: "row", // On tablet/large screens this could be side-by-side, but on mobile we might want to stack or overlay.
  },
  productsSection: {
    flex: 1,
  },
  productList: {
    padding: 16,
    gap: 12,
    paddingBottom: 100,
  },
  productCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-end",
  },
  cartSection: {
    width: "40%", // for larger phones. On small phones, this might be tight.
    minWidth: 150,
    borderLeftWidth: 1,
    display: "flex",
  },
  cartTitle: {
    fontSize: 18,
    fontWeight: "700",
    padding: 16,
  },
  cartList: {
    paddingHorizontal: 16,
  },
  cartItem: {
    flexDirection: "column",
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: "500",
  },
  cartItemPrice: {
    fontSize: 13,
  },
  qtyControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  checkoutSection: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: 100,
  },
  paymentMethods: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  methodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    minWidth: "30%",
  },
  methodText: {
    fontSize: 12,
    fontWeight: "600",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  checkoutButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkoutText: {
    fontSize: 16,
    fontWeight: "700",
  },
});