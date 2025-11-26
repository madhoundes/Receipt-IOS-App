import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Receipt as ReceiptIcon, MapPin, ChevronDown } from 'lucide-react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useReceipts } from '../context/ReceiptContext';
import { BrandAvatar } from '../components/BrandAvatar';
import { THEME } from '../constants';
import { Receipt } from '../types';

export default function ReceiptsHistoryScreen({ navigation }: any) {
  const { receipts, userProfile } = useReceipts();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return receipts.filter(r => r.storeName.toLowerCase().includes(search.toLowerCase()));
  }, [receipts, search]);

  const renderItem = ({ item, index }: { item: Receipt, index: number }) => {
    const isExpanded = expandedId === item.id;
    
    return (
      <Animated.View 
        entering={FadeInDown.delay(index * 50)} 
        layout={Layout.springify()}
        style={styles.cardContainer}
      >
        <TouchableOpacity 
            activeOpacity={0.95} 
            onPress={() => setExpandedId(isExpanded ? null : item.id)}
            style={styles.card}
        >
            {/* Header */}
            <View style={styles.cardHeader}>
                <BrandAvatar receipt={item} showLogos={userProfile.showBrandLogos} />
                <View style={styles.headerText}>
                    <Text style={styles.storeName}>{item.storeName}</Text>
                    <Text style={styles.dateText}>{new Date(item.purchaseDate).toLocaleDateString()}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                    <Text style={styles.totalText}>${item.totalAmount.toFixed(2)}</Text>
                    <Text style={styles.categoryBadge}>{item.category}</Text>
                </View>
            </View>

            {/* Paper Divider (Dashed Line) */}
            <View style={styles.divider}>
                {Array.from({length: 30}).map((_, i) => (
                    <View key={i} style={styles.dash} />
                ))}
            </View>

            {/* Unfold Content */}
            {isExpanded && (
                <Animated.View entering={FadeInDown} style={styles.detailsContainer}>
                    <View style={styles.metaRow}>
                        <MapPin size={12} color={THEME.colors.gray} />
                        <Text style={styles.metaText}>ID: {item.id.slice(-6)}</Text>
                    </View>
                    
                    <View style={styles.mathRow}>
                       <Text style={styles.mathLabel}>Tax ({item.hstPercent || 13}%)</Text>
                       <Text style={styles.mathValue}>${(item.hstAmount || 0).toFixed(2)}</Text>
                    </View>
                    
                    <TouchableOpacity 
                        onPress={() => navigation.navigate('ReceiptDetail', { receiptId: item.id })}
                        style={styles.viewBtn}
                    >
                        <Text style={styles.viewBtnText}>View Digital Copy</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
            
            {/* Serrated Bottom */}
            <View style={styles.serratedEdge} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <TouchableOpacity 
            style={styles.addBtn} 
            onPress={() => navigation.navigate('CameraModal')}
        >
            <Plus color="white" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color={THEME.colors.gray} />
        <TextInput 
            style={styles.searchInput} 
            placeholder="Search receipts..." 
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={THEME.colors.gray}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No receipts found.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: 'black' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.colors.teal, justifyContent: 'center', alignItems: 'center', shadowColor:'#000', shadowOpacity:0.1, shadowRadius:4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(142, 142, 147, 0.12)', marginHorizontal: 16, padding: 10, borderRadius: 12, marginBottom: 10 },
  searchInput: { flex: 1, marginLeft: 10, fontSize: 17 },
  listContent: { paddingBottom: 100 },
  cardContainer: { marginHorizontal: 16, marginBottom: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  card: { backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', paddingBottom: 12 },
  cardHeader: { flexDirection: 'row', padding: 16, alignItems: 'center' },
  headerText: { flex: 1, marginLeft: 12 },
  storeName: { fontSize: 16, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dateText: { color: THEME.colors.gray, fontSize: 12, marginTop: 2 },
  totalText: { fontSize: 18, fontWeight: '700', fontFamily: 'Courier' }, // Courier simulates monospaced receipt font
  categoryBadge: { fontSize: 10, fontWeight: '600', color: THEME.colors.gray, backgroundColor: '#F2F2F7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, overflow: 'hidden' },
  divider: { flexDirection: 'row', justifyContent: 'space-between', overflow: 'hidden', paddingHorizontal: 16, height: 1 },
  dash: { width: 4, height: 1, backgroundColor: '#E5E5E5' },
  detailsContainer: { padding: 16, paddingTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  metaText: { fontSize: 10, color: THEME.colors.gray, marginLeft: 4 },
  mathRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  mathLabel: { fontSize: 12, fontFamily: 'Courier', color: THEME.colors.gray },
  mathValue: { fontSize: 12, fontFamily: 'Courier', color: 'black' },
  viewBtn: { marginTop: 12, backgroundColor: 'black', padding: 10, borderRadius: 8, alignItems: 'center' },
  viewBtnText: { color: 'white', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  serratedEdge: { height: 6, width: '100%', position: 'absolute', bottom: 0, backgroundColor: 'white' }, // Simplified; in production use SVG
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: THEME.colors.gray }
});