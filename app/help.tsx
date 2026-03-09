import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import {
  ChevronDown,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react-native";

import Colors from "@/constants/colors";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: "Nasıl mağaza açabilirim?",
    answer: "Profil sayfasından 'Mağaza Aç' seçeneğine tıklayarak mağaza açma formunu doldurabilirsiniz. Mağaza adı ve açıklama girmeniz yeterlidir.",
  },
  {
    question: "Ödeme nasıl yapılır?",
    answer: "Uygulama içinde doğrudan ödeme sistemi bulunmamaktadır. Satıcı ile sohbet üzerinden anlaşarak ödeme detaylarını belirleyebilirsiniz.",
  },
  {
    question: "Sipariş takibi nasıl yapılır?",
    answer: "Satıcı ile sohbet ekranı üzerinden sipariş durumunuzu takip edebilirsiniz. Satıcılar kargo bilgilerini chat üzerinden paylaşır.",
  },
  {
    question: "Ürün iade/değişim yapabilir miyim?",
    answer: "İade ve değişim koşulları satıcıya göre değişir. Satın alma öncesinde satıcı ile iletişime geçerek iade koşullarını öğrenmenizi öneririz.",
  },
  {
    question: "Hesabımı nasıl silebilirim?",
    answer: "Profil > Gizlilik > Hesabı Sil seçeneğinden hesabınızı kalıcı olarak silebilirsiniz. Bu işlem geri alınamaz.",
  },
  {
    question: "Bildirimler gelmiyor, ne yapmalıyım?",
    answer: "Profil > Bildirimler bölümünden bildirim ayarlarınızı kontrol edin. Ayrıca cihazınızın bildirim izinlerinin açık olduğundan emin olun.",
  },
];

function FAQRow({ item }: { item: FAQItem }) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  const toggle = () => {
    Animated.timing(rotateAnim, {
      toValue: expanded ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpanded(!expanded);
  };

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  return (
    <TouchableOpacity style={styles.faqRow} onPress={toggle} activeOpacity={0.7}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <ChevronDown size={18} color={Colors.textLight} />
        </Animated.View>
      </View>
      {expanded && (
        <Text style={styles.faqAnswer}>{item.answer}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "Yardım",
          headerStyle: { backgroundColor: Colors.primary },
          headerTintColor: Colors.headerText,
          headerTitleStyle: { fontWeight: "700" as const },
        }}
      />
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sıkça Sorulan Sorular</Text>
          {FAQ_DATA.map((item, index) => (
            <FAQRow key={index} item={item} />
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bize Ulaşın</Text>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("mailto:destek@butikpazar.com")}
          >
            <View style={[styles.contactIcon, { backgroundColor: "#3B82F615" }]}>
              <Mail size={20} color="#3B82F6" />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactLabel}>E-posta</Text>
              <Text style={styles.contactValue}>destek@butikpazar.com</Text>
            </View>
            <ExternalLink size={16} color={Colors.textLight} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactRow}
            onPress={() => Linking.openURL("tel:+908501234567")}
          >
            <View style={[styles.contactIcon, { backgroundColor: Colors.accent + "15" }]}>
              <Phone size={20} color={Colors.accent} />
            </View>
            <View style={styles.contactText}>
              <Text style={styles.contactLabel}>Telefon</Text>
              <Text style={styles.contactValue}>0850 123 45 67</Text>
            </View>
            <ExternalLink size={16} color={Colors.textLight} />
          </TouchableOpacity>

        </View>

        <Text style={styles.footerNote}>
          Yanıt süresi genellikle 24 saat içindedir.
        </Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  section: {
    backgroundColor: Colors.white,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.textLight,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  faqRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: 10,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    gap: 12,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactText: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 15,
    fontWeight: "500" as const,
    color: Colors.text,
  },
  contactValue: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 1,
  },
  footerNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: "center",
    marginTop: 20,
    marginHorizontal: 32,
    marginBottom: 32,
  },
});
