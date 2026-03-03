import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Share,
  Animated,
  Pressable,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import {
  MapPin,
  Printer,
  Trash2,
  Package,
  Phone,
  User,
  Clock,
  Share2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";

import Colors from "@/constants/colors";
import { useUser, AddressSubmission } from "@/contexts/UserContext";
import { useAlert } from "@/contexts/AlertContext";
import { getAddressFormLink } from "@/utils/links";

function generatePrintHtml(address: AddressSubmission, _storeName: string): string {
  const fullAddr = `${address.neighborhood ? address.neighborhood + ", " : ""}${address.addressLine}, ${address.district}/${address.city}${address.postalCode ? " " + address.postalCode : ""}`;

  const dateStr = (() => {
    try {
      const d = new Date(address.createdAt);
      return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return address.createdAt;
    }
  })();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { margin: 12mm; size: auto; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 0; }
    .section-title { font-size: 11px; font-weight: 700; color: #999; letter-spacing: 0.5px; margin-bottom: 4px; }
    .section { margin-bottom: 16px; }
    .name { font-size: 15px; font-weight: 600; color: #1a1a1a; }
    .phone { font-size: 14px; color: #1a1a1a; margin-top: 2px; }
    .address { font-size: 14px; color: #1a1a1a; line-height: 1.5; }
    .product { font-size: 14px; color: #1a1a1a; }
    .date { font-size: 12px; color: #aaa; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-title">ALICI</div>
    <div class="name">${address.customerName}</div>
    <div class="phone">${address.customerPhone}</div>
  </div>

  <div class="section">
    <div class="section-title">TESLİMAT ADRESİ</div>
    <div class="address">${fullAddr}</div>
  </div>

  ${address.productInfo ? `<div class="section">
    <div class="section-title">ÜRÜN BİLGİSİ</div>
    <div class="product">${address.productInfo}</div>
  </div>` : ""}

  ${address.note ? `<div class="section">
    <div class="section-title">NOT</div>
    <div class="product" style="font-style:italic;color:#555;">${address.note}</div>
  </div>` : ""}

  <div class="date">${dateStr}</div>
</body>
</html>`;
}

function ShippingLabel({ address, onPrint, onShare, onDelete }: {
  address: AddressSubmission;
  onPrint: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [expanded, expandAnim]);

  const dateStr = useMemo(() => {
    try {
      const d = new Date(address.createdAt);
      return d.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return address.createdAt;
    }
  }, [address.createdAt]);

  const fullAddress = `${address.neighborhood ? address.neighborhood + ", " : ""}${address.addressLine}, ${address.district}/${address.city}${address.postalCode ? " " + address.postalCode : ""}`;

  return (
    <Animated.View style={[styles.labelCard, { transform: [{ scale: scaleAnim }] }]}>
      <Pressable
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, friction: 3, useNativeDriver: true }).start()}
        onPress={toggleExpand}
      >
        <View style={styles.labelHeader}>
          <View style={styles.labelHeaderLeft}>
            <View style={styles.labelIconWrap}>
              <Package size={18} color={Colors.primary} />
            </View>
            <View style={styles.labelHeaderInfo}>
              <Text style={styles.labelName}>{address.customerName}</Text>
              <Text style={styles.labelCity}>{address.district}/{address.city}</Text>
            </View>
          </View>
          {expanded ? (
            <ChevronUp size={20} color={Colors.textLight} />
          ) : (
            <ChevronDown size={20} color={Colors.textLight} />
          )}
        </View>

        {expanded && (
          <View style={styles.labelBody}>
            <View style={styles.labelDividerDashed} />

            <View style={styles.labelSection}>
              <Text style={styles.labelSectionTitle}>ALICI</Text>
              <View style={styles.labelRow}>
                <User size={14} color={Colors.textSecondary} />
                <Text style={styles.labelRowText}>{address.customerName}</Text>
              </View>
              <View style={styles.labelRow}>
                <Phone size={14} color={Colors.textSecondary} />
                <Text style={styles.labelRowText}>{address.customerPhone}</Text>
              </View>
            </View>

            <View style={styles.labelSection}>
              <Text style={styles.labelSectionTitle}>TESLİMAT ADRESİ</Text>
              <View style={styles.labelRow}>
                <MapPin size={14} color={Colors.textSecondary} />
                <Text style={styles.labelRowText}>{fullAddress}</Text>
              </View>
            </View>

            {address.productInfo ? (
              <View style={styles.labelSection}>
                <Text style={styles.labelSectionTitle}>ÜRÜN BİLGİSİ</Text>
                <Text style={styles.labelProductInfo}>{address.productInfo}</Text>
              </View>
            ) : null}

            {address.note ? (
              <View style={styles.labelSection}>
                <Text style={styles.labelSectionTitle}>NOT</Text>
                <Text style={styles.labelNoteText}>{address.note}</Text>
              </View>
            ) : null}

            <View style={styles.labelRow}>
              <Clock size={12} color={Colors.textLight} />
              <Text style={styles.labelDate}>{dateStr}</Text>
            </View>

            <View style={styles.labelActions}>
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={onShare}
                testID={`share-${address.id}`}
              >
                <Share2 size={16} color={Colors.primary} />
                <Text style={styles.shareBtnText}>Paylaş</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.printBtn}
                onPress={onPrint}
                testID={`print-${address.id}`}
              >
                <Printer size={16} color={Colors.white} />
                <Text style={styles.printBtnText}>Yazdır</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={onDelete}
                testID={`delete-addr-${address.id}`}
              >
                <Trash2 size={16} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default function AddressListScreen() {
  const router = useRouter();
  const { profile, deleteAddressSubmission } = useUser();
  const { showAlert } = useAlert();
  const addresses = profile.addressSubmissions ?? [];

  const handlePrint = useCallback(async (address: AddressSubmission) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const printHtml = generatePrintHtml(address, profile.storeName);
      if (Platform.OS === "web") {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(printHtml);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 300);
        } else {
          showAlert("Hata", "Yazdırma penceresi açılamadı. Lütfen popup engelleyiciyi kapatın.");
        }
      } else {
        await Print.printAsync({ html: printHtml });
      }
    } catch (e) {
      console.log("Print error:", e);
      showAlert("Hata", "Yazdırma işlemi başarısız oldu.");
    }
  }, [profile.storeName]);

  const handleShare = useCallback(async (address: AddressSubmission) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    const fullAddr = `${address.neighborhood ? address.neighborhood + ", " : ""}${address.addressLine}, ${address.district}/${address.city}${address.postalCode ? " " + address.postalCode : ""}`;
    const labelText = `KARGO ETİKETİ\n\nGönderen: ${profile.storeName}\nAlıcı: ${address.customerName}\nTel: ${address.customerPhone}\nAdres: ${fullAddr}${address.productInfo ? `\nÜrün: ${address.productInfo}` : ""}${address.note ? `\nNot: ${address.note}` : ""}`;
    try {
      await Share.share({
        message: labelText,
        title: `Kargo Etiketi - ${address.customerName}`,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  }, [profile.storeName]);

  const handleDelete = useCallback((address: AddressSubmission) => {
    showAlert(
      "Adresi Sil",
      `${address.customerName} adresini silmek istediğinize emin misiniz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Sil",
          style: "destructive",
          onPress: () => {
            if (Platform.OS !== "web") {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
            deleteAddressSubmission(address.id);
          },
        },
      ]
    );
  }, [deleteAddressSubmission, showAlert]);

  const handleShareForm = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const formUrl = getAddressFormLink(profile.storeName);
      await Share.share({
        message: `📦 ${profile.storeName} - Teslimat Adres Formu\n\nSiparişiniz için teslimat adresinizi aşağıdaki linkten doldurun:\n${formUrl}`,
        title: `${profile.storeName} - Adres Formu`,
      });
    } catch (e) {
      console.log("Share error:", e);
    }
  }, [profile.storeName]);

  const sortedAddresses = useMemo(
    () => [...addresses].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [addresses]
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "Gelen Adresler",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.countBadge}>
            <ClipboardList size={18} color={Colors.primary} />
            <Text style={styles.countText}>{addresses.length} adres</Text>
          </View>
          <TouchableOpacity
            style={styles.shareFormBtn}
            onPress={handleShareForm}
            testID="share-form-external"
          >
            <Share2 size={16} color={Colors.white} />
            <Text style={styles.shareFormText}>Form Paylaş</Text>
          </TouchableOpacity>
        </View>

        {sortedAddresses.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <MapPin size={40} color={Colors.textLight} />
            </View>
            <Text style={styles.emptyTitle}>Henüz adres gelmedi</Text>
            <Text style={styles.emptySubtitle}>
              Müşterilerinize adres formunu paylaşarak teslimat bilgilerini toplayabilirsiniz.
            </Text>
            <TouchableOpacity style={styles.emptyShareBtn} onPress={handleShareForm}>
              <Share2 size={18} color={Colors.white} />
              <Text style={styles.emptyShareText}>Adres Formu Paylaş</Text>
            </TouchableOpacity>
          </View>
        ) : (
          sortedAddresses.map((address) => (
            <ShippingLabel
              key={address.id}
              address={address}
              onPrint={() => handlePrint(address)}
              onShare={() => handleShare(address)}
              onDelete={() => handleDelete(address)}
            />
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  countText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  shareFormBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  shareFormText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  emptyState: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 40,
    padding: 32,
    alignItems: "center",
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },
  emptyShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyShareText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  labelCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  labelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  labelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  labelIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary + "10",
    alignItems: "center",
    justifyContent: "center",
  },
  labelHeaderInfo: {
    flex: 1,
  },
  labelName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  labelCity: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  labelBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  labelDividerDashed: {
    height: 1,
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    marginBottom: 12,
  },
  labelSection: {
    marginBottom: 12,
  },
  labelSectionTitle: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: Colors.textLight,
    letterSpacing: 1,
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  labelRowText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  labelProductInfo: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
    backgroundColor: Colors.primary + "08",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  labelNoteText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },
  labelDate: {
    fontSize: 11,
    color: Colors.textLight,
  },
  labelActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  shareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary + "10",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.primary,
  },
  printBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  deleteBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.danger + "10",
    alignItems: "center",
    justifyContent: "center",
  },
});
