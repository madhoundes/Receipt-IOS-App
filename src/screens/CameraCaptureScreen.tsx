import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Modal, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';
import { Audio } from 'expo-av';
import { X, Zap, ZapOff, Info, Image as ImageIcon } from 'lucide-react-native';
import { triggerHaptic } from '../utils/nativeUtils';
import { THEME } from '../constants';
import { useReceipts } from '../context/ReceiptContext';

export default function CameraCaptureScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const [flash, setFlash] = useState<'on' | 'off'>('off');
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { addReceipt, userProfile } = useReceipts();

  // Shutter Sound
  const playShutter = async () => {
    if (!userProfile.hapticsEnabled) return; // Respect mute via user profile logic for now
    try {
      // In a real app, import a local asset. For stub, we rely on haptics.
      triggerHaptic('medium');
    } catch (e) {}
  };

  const handleCapture = async () => {
    if (!cameraRef.current || processing) return;
    playShutter();
    setProcessing(true);

    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
      
      // Resize for faster OCR processing if needed
      const manipResult = await ImageManipulator.manipulateAsync(
        photo!.uri,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // STUB: Simulate OCR Delay & Parse
      setTimeout(() => {
        // Mock parsed data for this migration
        const newReceipt = {
            id: Date.now().toString(),
            imageName: manipResult.uri,
            storeName: "Costco", // Mock detection
            purchaseDate: new Date().toISOString(),
            totalAmount: 124.50,
            subtotal: 110.18,
            hstAmount: 14.32,
            hstPercent: 13,
            category: "Groceries",
            subcategory: "Food Retail",
            items: [],
            brandId: "costco",
            brandDisplayMode: 'logo' as const,
            logoDetected: true
        };
        
        addReceipt(newReceipt);
        triggerHaptic('success');
        setProcessing(false);
        navigation.goBack();
      }, 2000);

    } catch (e) {
      console.error(e);
      setProcessing(false);
      triggerHaptic('error');
    }
  };

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{color:'white', textAlign:'center'}}>Camera access needed</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.btn}><Text>Grant</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        ref={cameraRef} 
        style={styles.camera} 
        enableTorch={flash === 'on'}
      >
        <SafeAreaView style={styles.uiContainer}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
              <Text style={styles.textBtn}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFlash(f => f === 'on' ? 'off' : 'on')} style={styles.roundBtn}>
              {flash === 'on' ? <Zap size={24} color="yellow" /> : <ZapOff size={24} color="white" />}
            </TouchableOpacity>
          </View>

          {/* Guide Overlay */}
          <View style={styles.guideContainer}>
            <View style={styles.guideBox}>
                <View style={[styles.corner, {top:0, left:0, borderTopWidth:4, borderLeftWidth:4}]} />
                <View style={[styles.corner, {top:0, right:0, borderTopWidth:4, borderRightWidth:4}]} />
                <View style={[styles.corner, {bottom:0, left:0, borderBottomWidth:4, borderLeftWidth:4}]} />
                <View style={[styles.corner, {bottom:0, right:0, borderBottomWidth:4, borderRightWidth:4}]} />
            </View>
            <Text style={styles.guideText}>Align receipt within frame</Text>
          </View>

          {/* Bottom Bar */}
          <View style={styles.bottomBar}>
            <TouchableOpacity style={styles.galleryBtn}>
               <ImageIcon size={24} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleCapture} style={styles.shutterOuter}>
               <View style={styles.shutterInner} />
            </TouchableOpacity>

            <View style={{width: 40}} /> 
          </View>
        </SafeAreaView>

        {processing && (
            <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={THEME.colors.teal} />
                <Text style={styles.loadingText}>Processing...</Text>
            </View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  uiContainer: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
  iconBtn: { padding: 10 },
  textBtn: { color: 'white', fontSize: 18, fontWeight: '600' },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  guideContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  guideBox: { width: '75%', height: '65%', borderRadius: 20, position: 'relative' },
  corner: { position: 'absolute', width: 30, height: 30, borderColor: 'white', borderRadius: 4 },
  guideText: { color: 'rgba(255,255,255,0.7)', marginTop: 20, fontWeight: '600' },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingBottom: 40 },
  shutterOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 5, borderColor: 'white', justifyContent: 'center', alignItems: 'center' },
  shutterInner: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white' },
  galleryBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'white', marginTop: 10, fontSize: 16, fontWeight: '600' }
});