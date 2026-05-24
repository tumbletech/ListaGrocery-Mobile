import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";

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
  bought: boolean
};

const categories = ["All", "Sardines", "Corned Beef", "Canned Tuna", "Sausage", "Squid", "Mackerel"];

const getProductImageUrl = (
  itemNo: string,
  subCategory?: string
) => {

  if (!itemNo || !subCategory) return null;

  const folderMap: Record<string, string> = {
    "Sardines": "sardines",
    "Corned Beef": "corned_beef",
    "Canned Tuna": "canned_tuna",
    "Luncheon Meat": "luncheon_meat",
    "Meat Loaf": "meat_loaf",
    "Sausage": "sausage",
    "Squid": "squid",
    "Mackerel": "mackerel",
  };

  const folder = folderMap[subCategory];

  if (!folder) return null;

  return `https://oyemtlvqtlwpaewvopmf.supabase.co/storage/v1/object/public/product-images/${folder}/${itemNo.toLowerCase()}.jpg`;
};

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCartModalVisible, setIsCartModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const [groceryBudget, setGroceryBudget] = useState<number | null>(null);

  const [appMode, setAppMode] = useState<
    "home" | "grocery" | "budget"
  >("home");

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
      .in("sub_category", ["Sardines", "Corned Beef", "Canned Tuna", "Luncheon Meat", "Meat Loaf", "Sausage", "Squid", "Mackerel"])
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
      const matchesCategory =
        activeCategory === "All" || product.sub_category === activeCategory;

      const keyword = search.toLowerCase();

      const matchesSearch =
        product.brand?.toLowerCase().includes(keyword) ||
        product.product_name?.toLowerCase().includes(keyword) ||
        product.sub_category?.toLowerCase().includes(keyword);

      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory, products]);

  const isOverBudget = (nextTotal: number) => {
    return groceryBudget !== null && nextTotal > groceryBudget;
  }

  const addToCart = (product: Product) => {
    const nextTotal = totalAmount + Number(product.price);

    if (isOverBudget(nextTotal)) {
      Alert.alert("Lampas na sa budget", "Hindi na kasya inilaan mong budget");
      return;
    }
    
    const existing = cart.find((item) => item.item_no === product.item_no);

    if (existing) {
      setCart(
        cart.map((item) =>
          item.item_no === product.item_no
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
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
    const itemToIncrease = cart.find(
      (item) => item.item_no === itemNo
    );
    
    if (!itemToIncrease) return;

    const nextTotal = 
      totalAmount + Number(itemToIncrease.price);


    if (isOverBudget(nextTotal)) {
      Alert.alert("Lampas na sa budget", "Hindi na kasya sa inilaan mong budget");
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

  const totalAmount = cart.reduce(
    (sum, item) => sum + Number(item.price) * item.quantity,
    0
  );

  const remainingBudget = groceryBudget !== null ? groceryBudget - totalAmount: null;

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const toggleBought = (itemNo: string) => {
    setCart(
      cart.map((item) =>
        item.item_no === itemNo
          ? { ...item, bought: !item.bought }
          : item
      )
    );
  };

  if (appMode === "home") {
    return (
      <SafeAreaView style={styles.homeScreen}>

        <Text style={styles.logo}>
          ListaGrocery
        </Text>

        <Text style={styles.tagline}>
          Plan your grocery before checkout
        </Text>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => setAppMode("grocery")}
        >
          <Text style={styles.homeButtonTitle}>
            🛒 Grocery Ngayon
          </Text>

          <Text style={styles.homeButtonSubtitle}>
            Mamili at i-tract ang actual na gastos 
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => setAppMode("budget")}
        >
          <Text style={styles.homeButtonTitle}>
            💰 Magse-set lang ng Budget
          </Text>

          <Text style={styles.homeButtonSubtitle}>
            Magplano ng grocery budget ahead of time
          </Text>
        </TouchableOpacity>

      </SafeAreaView>
    );
  }

  if ( appMode === "budget") {
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
            <Text style={styles.homeButtonTitle}>Simulan ang Grocery</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAppMode("home")}>
            <Text style={styles.backHomeText}>Bumalik</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
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
            onPress={() => setActiveCategory(category)}
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

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={styles.loader} />
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.item_no}
          contentContainerStyle={styles.productList}
          renderItem={({ item }) => (
            <View style={styles.productCard}>

              {getProductImageUrl(item.item_no, item.sub_category) && (
                <Image
                  source={{ uri: getProductImageUrl(item.item_no, item.sub_category)! }}
                  style={styles.productImage}
                  resizeMode="contain"  
                />
              )}
              <View style={styles.productDetails}>
                <Text style={styles.productDetails}>{item.brand}</Text>
                <Text style={styles.productName}>{item.product_name}</Text>
                <Text style={styles.productMeta}>
                  {item.unit} • {item.sub_category}
                </Text>
                <Text style={styles.productPrice}>
                  ₱{Number(item.price).toFixed(2)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View style={styles.bottomSummary}>
        
        <View style={styles.summaryColumn}>
          <Text style={styles.summaryLabel}>Grocery List</Text>

          <Text style={styles.summaryValue}>
            {totalItems} items
          </Text>

          <Text style={styles.summarySubValue}>
            ₱{totalAmount.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryColumn}>
          <Text style={styles.summaryLabel}>Budget</Text>

          <Text style={styles.budgetValue}>
            ₱{groceryBudget?.toFixed(2)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryColumn}>
          <Text style={styles.summaryLabel}>Natitira</Text>

          <Text style={styles.remainingValue}>
            ₱{remainingBudget?.toFixed(2)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.viewListButton}
          onPress={() => setIsCartModalVisible(true)} 
        >
            <Text style={styles.viewListButtonText}>
              View List
            </Text>
        </TouchableOpacity>
      </View>

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
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <View style={styles.productCard}>
                      {getProductImageUrl(item.item_no, item.sub_category) && (
                        <Image
                          source={{ uri: getProductImageUrl(item.item_no, item.sub_category)! }}
                          style={styles.productImage}
                          resizeMode="contain"
                        />
                      )}
                    </View>
                    
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
                        Subtotal: ₱{(Number(item.price) * item.quantity).toFixed(2)}
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
                )}
              />
            )}

              <View style={styles.modalTotalBox}>
                <View style={styles.modalTotalRow}>
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
                        remainingBudget !== null && remainingBudget < 0 && styles.overBudgetText,
                      ]}
                    >
                      ₱{remainingBudget?.toFixed(2)}
                    </Text>
              </View>
              )}
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

  loader: {
    marginTop: 40,
  },

  productList: {
    padding: 20,
    paddingBottom: 120,
  },

  productCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 11,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
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
    alignSelf: "center",
  },

  addButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },

  cartLabel: {
    color: "#bbf7d0",
    fontSize: 13,
    fontWeight: "700",
  },

  cartInfo: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 2,
  },

  viewButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },

  viewButtonText: {
    color: "#14532d",
    fontWeight: "900",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: "85%",
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
    justifyContent: "space-between",
    gap: 12,
  },

  cartItemInfo: {
    flex: 1,
  },

  cartItemName: {
    fontSize: 16,
    fontWeight: "900",
    color: "#111827",
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

  modalTotalBox: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 16,
    marginTop: 10,
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

  cartItemNameBought: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
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

  productImage: {
  width: 58,
  height: 58,
  marginRight: 14,
  borderRadius: 10,
  backgroundColor: "#ffffff",
  },

  productDetails: {
    flex: 1,
    minWidth: 0,
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

  bottomSummary: {
    position: "absolute",
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: "#166534",
    borderRadius: 24,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: "800",
  },

  remainingValue: {
    color: "#facc15",
    fontSize: 16,
    fontWeight: "800",
  },

  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 14,
  },

  viewListButton: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 16,
    marginLeft: 12,
  },

  viewListButtonText: {
    color: "#14532d",
    fontWeight: "800",
    fontSize: 14,
  },

  modalTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    color: "#dc2826",
  },
});