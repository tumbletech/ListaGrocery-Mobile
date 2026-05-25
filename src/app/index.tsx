import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";

type Product = {
  item_no: string;
  main_category: string;
  sub_category: string;
  brand: string;
  product_name: string;
  unit: string;
  price: number;
};

type CartItem = Product & {
  cart_id: string;
  quantity: number;
  bought: boolean;
};

const categories = [
  "All",
  "Sardines",
  "Corned Beef",
  "Canned Tuna",
  "Sausage",
  "Squid",
  "Mackerel",
  "Luncheon Meat",
  "Meat Loaf",
  "Rice",
];

const getProductImageUrl = (itemNo: string, subCategory?: string) => {
  if (!itemNo || !subCategory) return null;

  const folderMap: Record<string, string> = {
    Sardines: "sardines",
    "Corned Beef": "corned_beef",
    "Canned Tuna": "canned_tuna",
    "Luncheon Meat": "luncheon_meat",
    "Meat Loaf": "meat_loaf",
    Sausage: "sausage",
    Squid: "squid",
    Mackerel: "mackerel",
    "Packaged Rice": "packaged_rice",
    "Per Kilo Rice": "per_kilo_rice",
  };

  const folder = folderMap[subCategory];

  if (!folder) return null;

  return `https://oyemtlvqtlwpaewvopmf.supabase.co/storage/v1/object/public/product-images/${folder}/${itemNo.toLowerCase()}.jpg`;
};

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeRiceType, setActiveRiceType] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [isRiceModalVisible, setIsRiceModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [groceryBudget, setGroceryBudget] = useState<number | null>(null);

  const [appMode, setAppMode] = useState<"home" | "grocery" | "budget">(
    "home"
  );

  useEffect(() => {
    fetchProducts();
    loadCart();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const fetchProducts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("listagrocery_pricelist")
      .select("*")
      .in("sub_category", [
        "Sardines",
        "Corned Beef",
        "Canned Tuna",
        "Luncheon Meat",
        "Meat Loaf",
        "Sausage",
        "Squid",
        "Mackerel",
        "Packaged Rice",
        "Per Kilo Rice",
      ])
      .order("brand", { ascending: true });

    if (error) {
      console.log("Supabase error:", error.message);
    } else {
      setProducts((data || []) as Product[]);
    }

    setLoading(false);
  };

  const loadCart = async () => {
    const saved = await AsyncStorage.getItem("cart");
    if (saved) setCart(JSON.parse(saved));
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product: Product) => {
      let matchesCategory = true;

      if (activeCategory === "Rice") {
        matchesCategory = activeRiceType
          ? product.sub_category === activeRiceType
          : product.sub_category === "Packaged Rice" ||
            product.sub_category === "Per Kilo Rice";
      } else {
        matchesCategory =
          activeCategory === "All" || product.sub_category === activeCategory;
      }

      const keyword = search.toLowerCase();

      const matchesSearch =
        product.brand?.toLowerCase().includes(keyword) ||
        product.product_name?.toLowerCase().includes(keyword) ||
        product.sub_category?.toLowerCase().includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory, activeRiceType, products]);

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const remainingBudget =
    groceryBudget !== null ? groceryBudget - totalAmount : null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const showBudgetWarning = () => {
    if (Platform.OS === "web") {
      window.alert("Lampas na sa budget");
    } else {
      Alert.alert(
        "Lampas na sa budget",
        "Hindi na kasya sa inilaan mong budget."
      );
    }
  };

  const isOverBudget = (nextTotal: number) => {
    return groceryBudget !== null && nextTotal > groceryBudget;
  };

  const addToCart = (product: Product) => {
    const nextTotal = totalAmount + Number(product.price);

    if (isOverBudget(nextTotal)) {
      showBudgetWarning();
      return;
    }

    const existing = cart.find((item) => item.item_no === product.item_no);

    if (existing) {
      increaseQuantity(product.item_no);
      return;
    }

    setCart([
      ...cart,
      {
        ...product,
        cart_id: Date.now().toString(),
        quantity: 1,
        bought: false,
      },
    ]);
  };

  const removeFromCart = (itemNo: string) => {
    setCart(cart.filter((item) => item.item_no !== itemNo));
  };

  const increaseQuantity = (itemNo: string) => {
    const itemToIncrease = cart.find((item) => item.item_no === itemNo);

    if (!itemToIncrease) return;

    const nextTotal = totalAmount + Number(itemToIncrease.price);

    if (isOverBudget(nextTotal)) {
      showBudgetWarning();
      return;
    }

    setCart(
      cart.map((item) =>
        item.item_no === itemNo
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const decreaseQuantity = (itemNo: string) => {
    setCart(
      cart
        .map((item) =>
          item.item_no === itemNo
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const toggleBought = (itemNo: string) => {
    setCart(
      cart.map((item) =>
        item.item_no === itemNo ? { ...item, bought: !item.bought } : item
      )
    );
  };

  const handleCategoryPress = (category: string) => {
    setActiveCategory(category);

    if (category === "Rice") {
      setIsRiceModalVisible(true);
      return;
    }

    setActiveRiceType(null);
  };

  if (appMode === "home") {
    return (
      <SafeAreaView style={styles.homeScreen}>
        <Text style={styles.logo}>ListaGrocery</Text>

        <Text style={styles.tagline}>Plan your grocery before checkout</Text>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => setAppMode("grocery")}
        >
          <Text style={styles.homeButtonTitle}>🛒 Grocery Ngayon</Text>

          <Text style={styles.homeButtonSubtitle}>
            Mamili at i-track ang actual na gastos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => setAppMode("budget")}
        >
          <Text style={styles.homeButtonTitle}>
            💰 Grocery Planning
          </Text>

          <Text style={styles.homeButtonSubtitle}>
            Mag-set muna ng budget bago mamili
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (appMode === "budget") {
    return (
      <SafeAreaView style={styles.homeScreen}>
        <Text style={styles.logo}>ListaGrocery</Text>

        <Text style={styles.tagline}>Magplano muna bago mamili</Text>

        <View style={styles.budgetCard}>
          <Text style={styles.budgetTitle}>
            Magkano ang ilalaan mong budget?
          </Text>

          <TextInput
            style={styles.budgetInput}
            placeholder="₱ 0.00"
            keyboardType="numeric"
            value={budgetInput}
            onChangeText={setBudgetInput}
          />

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => {
              setGroceryBudget(Number(budgetInput) || 0);
              setAppMode("grocery");
            }}
          >
            <Text style={styles.homeButtonTitle}>
              Simulan ang Grocery Planning
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAppMode("home")}>
            <Text style={styles.backHomeText}>Bumalik</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.logo}>ListaGrocery</Text>
        <Text style={styles.tagline}>Plan your grocery before checkout.</Text>
      </View>

      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search 555, corned beef, sardines..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryPill,
              activeCategory === category && styles.activeCategoryPill,
            ]}
            onPress={() => handleCategoryPress(category)}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === category && styles.activeCategoryText,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {activeCategory === "Rice" && activeRiceType && (
        <Text style={styles.riceSelectedText}>{activeRiceType}</Text>
      )}

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.item_no}
          contentContainerStyle={styles.productList}
          renderItem={({ item }) => {
            const imageUrl = getProductImageUrl(item.item_no, item.sub_category);

            return (
              <View style={styles.productCard}>
                {imageUrl ? (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.productImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.noImageBox}>
                    <Text style={styles.noImageText}>No Photo</Text>
                    <Text style={styles.noImageTextSmall}>Available</Text>
                  </View>
                )}

                <View style={styles.productDetails}>
                  <Text style={styles.productBrand}>{item.brand}</Text>
                  <Text style={styles.productName}>{item.product_name}</Text>
                  <Text style={styles.productMeta}>
                    {item.unit} • {item.sub_category}
                  </Text>
                  <Text style={styles.productPrice}>
                    {Number(item.price) > 0
                      ? `₱${Number(item.price).toFixed(2)}`
                      : "Price unavailable"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addToCart(item)}
                >
                  <Text style={styles.addButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      <View style={styles.bottomSummary}>
        <View style={styles.summaryColumn}>
          <Text style={styles.summaryLabel}>Grocery List</Text>
          <Text style={styles.summaryValue}>{totalItems} items</Text>
          <Text style={styles.summarySubValue}>₱{totalAmount.toFixed(2)}</Text>
        </View>

        {groceryBudget !== null && (
          <>
            <View style={styles.summaryDivider} />

            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Budget</Text>
              <Text style={styles.budgetValue}>
                ₱{groceryBudget.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryColumn}>
              <Text style={styles.summaryLabel}>Natitira</Text>
              <Text
                style={[
                  styles.remainingValue,
                  remainingBudget !== null &&
                    remainingBudget < 0 &&
                    styles.overBudgetText,
                ]}
              >
                ₱{remainingBudget?.toFixed(2)}
              </Text>
            </View>
          </>
        )}

        <TouchableOpacity
          style={styles.viewListButton}
          onPress={() => setIsCartModalVisible(true)}
        >
          <Text style={styles.viewListButtonText}>View List</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={isRiceModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsRiceModalVisible(false)}
      >
        <View style={styles.centerModalOverlay}>
          <View style={styles.riceModalContent}>
            <Text style={styles.modalTitle}>Pili ng Rice Type</Text>

            <TouchableOpacity
              style={styles.riceChoiceButton}
              onPress={() => {
                setActiveRiceType("Packaged Rice");
                setIsRiceModalVisible(false);
              }}
            >
              <Text style={styles.riceChoiceTitle}>Packaged Rice</Text>
              <Text style={styles.riceChoiceSubtitle}>
                5kg, 10kg, 25kg packs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.riceChoiceButton}
              onPress={() => {
                setActiveRiceType("Per Kilo Rice");
                setIsRiceModalVisible(false);
              }}
            >
              <Text style={styles.riceChoiceTitle}>Per Kilo Rice</Text>
              <Text style={styles.riceChoiceSubtitle}>
                Palengke / per kg pricing
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setIsRiceModalVisible(false)}>
              <Text style={styles.backHomeText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCartModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsCartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Grocery List</Text>

              <TouchableOpacity onPress={() => setIsCartModalVisible(false)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <Text style={styles.emptyCartText}>No items added yet.</Text>
            ) : (
              <FlatList
                data={cart}
                keyExtractor={(item) => item.cart_id}
                renderItem={({ item }) => {
                  const imageUrl = getProductImageUrl(
                    item.item_no,
                    item.sub_category
                  );

                  return (
                    <View style={styles.cartItem}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.cartImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.cartNoImageBox}>
                          <Text style={styles.noImageText}>No</Text>
                          <Text style={styles.noImageTextSmall}>Photo</Text>
                        </View>
                      )}

                      <View style={styles.cartItemInfo}>
                        <Text
                          style={[
                            styles.cartItemName,
                            item.bought && styles.cartItemNameBought,
                          ]}
                        >
                          {item.brand} {item.product_name}
                        </Text>

                        <Text style={styles.cartItemMeta}>
                          {item.unit} • ₱{Number(item.price).toFixed(2)} each
                        </Text>

                        <Text style={styles.cartItemSubtotal}>
                          Subtotal: ₱
                          {(Number(item.price) * item.quantity).toFixed(2)}
                        </Text>

                        <TouchableOpacity
                          style={[
                            styles.boughtButton,
                            item.bought && styles.boughtButtonActive,
                          ]}
                          onPress={() => toggleBought(item.item_no)}
                        >
                          <Text
                            style={[
                              styles.boughtButtonText,
                              item.bought && styles.boughtButtonTextActive,
                            ]}
                          >
                            {item.bought ? "Nabili na" : "Bibilhin pa lang"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.quantityControls}>
                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => decreaseQuantity(item.item_no)}
                        >
                          <Text style={styles.qtyButtonText}>−</Text>
                        </TouchableOpacity>

                        <Text style={styles.qtyText}>{item.quantity}</Text>

                        <TouchableOpacity
                          style={styles.qtyButton}
                          onPress={() => increaseQuantity(item.item_no)}
                        >
                          <Text style={styles.qtyButtonText}>+</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() => removeFromCart(item.item_no)}
                        >
                          <Text style={styles.removeButtonText}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}

            <View style={styles.modalTotalBox}>
              <View style={styles.modalTotalRow}>
                <View>
                  <Text style={styles.modalTotalLabel}>Total</Text>
                  <Text style={styles.modalTotalAmount}>
                    ₱{totalAmount.toFixed(2)}
                  </Text>
                </View>

                {groceryBudget !== null && (
                  <View style={styles.modalRemainingBox}>
                    <Text style={styles.modalTotalLabel}>Natitira</Text>
                    <Text
                      style={[
                        styles.modalRemainingAmount,
                        remainingBudget !== null &&
                          remainingBudget < 0 &&
                          styles.overBudgetText,
                      ]}
                    >
                      ₱{remainingBudget?.toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f3fff4",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 14,
  },

  logo: {
    fontSize: 34,
    fontWeight: "900",
    color: "#15803d",
  },

  tagline: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 14,
  },

  searchBox: {
    paddingHorizontal: 20,
  },

  searchInput: {
    height: 52,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#d1d5db",
    fontSize: 15,
  },

  categoryScroll: {
    paddingHorizontal: 20,
    marginTop: 14,
    maxHeight: 46,
  },

  categoryPill: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },

  activeCategoryPill: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },

  categoryText: {
    color: "#334155",
    fontWeight: "700",
  },

  activeCategoryText: {
    color: "#ffffff",
  },

  riceSelectedText: {
    paddingHorizontal: 20,
    marginTop: 8,
    color: "#14532d",
    fontWeight: "800",
  },

  loader: {
    marginTop: 40,
  },

  productList: {
    padding: 20,
    paddingBottom: 140,
  },

  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  productImage: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },

  noImageBox: {
    width: 58,
    height: 58,
    borderRadius: 10,
    backgroundColor: "#d9d9d9",
    justifyContent: "center",
    alignItems: "center",
  },

  noImageText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#666",
  },

  noImageTextSmall: {
    fontSize: 8,
    color: "#888",
  },

  productDetails: {
    flex: 1,
    minWidth: 0,
  },

  productBrand: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16a34a",
  },

  productName: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },

  productMeta: {
    marginTop: 3,
    color: "#64748b",
    fontSize: 12,
  },

  productPrice: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "900",
    color: "#14532d",
  },

  addButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },

  addButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },

  bottomSummary: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#166534",
    borderRadius: 24,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryColumn: {
    flex: 1,
  },

  summaryLabel: {
    color: "#d1fae5",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },

  summaryValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },

  summarySubValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },

  budgetValue: {
    color: "#93c5fd",
    fontSize: 15,
    fontWeight: "800",
  },

  remainingValue: {
    color: "#facc15",
    fontSize: 15,
    fontWeight: "800",
  },

  summaryDivider: {
    width: 1,
    height: 54,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 10,
  },

  viewListButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    marginLeft: 8,
  },

  viewListButtonText: {
    color: "#14532d",
    fontWeight: "800",
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  centerModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: 24,
  },

  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "85%",
  },

  riceModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 22,
  },

  riceChoiceButton: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  riceChoiceTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#14532d",
  },

  riceChoiceSubtitle: {
    marginTop: 4,
    color: "#64748b",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },

  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#14532d",
  },

  closeButton: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16a34a",
  },

  emptyCartText: {
    textAlign: "center",
    color: "#64748b",
    marginVertical: 40,
  },

  cartItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },

  cartImage: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#ffffff",
  },

  cartNoImageBox: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#d9d9d9",
    justifyContent: "center",
    alignItems: "center",
  },

  cartItemInfo: {
    flex: 1,
  },

  cartItemName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
  },

  cartItemNameBought: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },

  cartItemMeta: {
    marginTop: 4,
    color: "#64748b",
  },

  cartItemSubtotal: {
    marginTop: 8,
    fontWeight: "900",
    color: "#14532d",
  },

  quantityControls: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
  },

  qtyButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
  },

  qtyText: {
    fontSize: 16,
    fontWeight: "900",
  },

  removeButton: {
    marginTop: 6,
  },

  removeButtonText: {
    color: "#b91c1c",
    fontSize: 12,
    fontWeight: "800",
  },

  boughtButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },

  boughtButtonActive: {
    backgroundColor: "#dcfce7",
  },

  boughtButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },

  boughtButtonTextActive: {
    color: "#15803d",
  },

  modalTotalBox: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
    marginTop: 10,
  },

  modalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  modalTotalLabel: {
    color: "#64748b",
    fontWeight: "700",
  },

  modalTotalAmount: {
    fontSize: 30,
    fontWeight: "900",
    color: "#14532d",
  },

  modalRemainingBox: {
    alignItems: "flex-end",
  },

  modalRemainingAmount: {
    fontSize: 24,
    fontWeight: "900",
    color: "#facc15",
  },

  overBudgetText: {
    color: "#dc2626",
  },

  homeScreen: {
    flex: 1,
    backgroundColor: "#edf5ea",
    justifyContent: "center",
    padding: 24,
  },

  homeButton: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 18,
    marginTop: 20,
    borderWidth: 1,
    borderColor: "#d8e5d2",
  },

  homeButtonTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f5132",
  },

  homeButtonSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },

  budgetCard: {
    backgroundColor: "#ffffff",
    padding: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#d8e5d2",
    marginTop: 24,
  },

  budgetTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#14532d",
    marginBottom: 16,
  },

  budgetInput: {
    height: 56,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 20,
    marginBottom: 18,
    backgroundColor: "#f8fafc",
  },

  backHomeText: {
    textAlign: "center",
    color: "#64748b",
    fontWeight: "700",
    marginTop: 16,
  },
});