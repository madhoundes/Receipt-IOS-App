import React, { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;

/**
 * A photo that fills its box and can be zoomed: pinch with two fingers, drag to move around while zoomed,
 * double tap to zoom in and double tap again to go back. Only the view changes; the file is never edited.
 * `turns` rotates the photo in quarter turns and puts the zoom back to normal.
 */
export function ZoomableImage({ uri, turns = 0, label, onZoomChange }: {
  uri: string; turns?: number; label?: string; onZoomChange?: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const boxW = useSharedValue(0);
  const boxH = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1); x.value = withTiming(0); y.value = withTiming(0);
    onZoomChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, uri]);

  const report = (zoomed: boolean) => onZoomChange?.(zoomed);

  const pinch = Gesture.Pinch()
    .onStart(() => { startScale.value = scale.value; })
    .onUpdate(e => {
      const next = Math.min(MAX_SCALE, Math.max(0.8, startScale.value * e.scale));
      scale.value = next;
      // Keep the photo inside the box while it shrinks.
      const maxX = Math.max(0, (boxW.value * (next - 1)) / 2), maxY = Math.max(0, (boxH.value * (next - 1)) / 2);
      x.value = Math.min(maxX, Math.max(-maxX, x.value));
      y.value = Math.min(maxY, Math.max(-maxY, y.value));
    })
    .onEnd(() => {
      if (scale.value <= 1.05) { scale.value = withTiming(1); x.value = withTiming(0); y.value = withTiming(0); }
    })
    .onFinalize(() => { report(scale.value > 1.05); });

  const pan = Gesture.Pan()
    .maxPointers(2)
    .onStart(() => { startX.value = x.value; startY.value = y.value; })
    .onUpdate(e => {
      if (scale.value <= 1) return;
      const maxX = (boxW.value * (scale.value - 1)) / 2, maxY = (boxH.value * (scale.value - 1)) / 2;
      x.value = Math.min(maxX, Math.max(-maxX, startX.value + e.translationX));
      y.value = Math.min(maxY, Math.max(-maxY, startY.value + e.translationY));
    });

  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(260)
    .onEnd((e, ok) => {
      if (!ok) return;
      if (scale.value > 1.05) {
        scale.value = withTiming(1); x.value = withTiming(0); y.value = withTiming(0);
      } else {
        // Zoom in on the spot that was tapped.
        const s = DOUBLE_TAP_SCALE;
        const maxX = (boxW.value * (s - 1)) / 2, maxY = (boxH.value * (s - 1)) / 2;
        const tx = (boxW.value / 2 - e.x) * (s - 1), ty = (boxH.value / 2 - e.y) * (s - 1);
        scale.value = withTiming(s);
        x.value = withTiming(Math.min(maxX, Math.max(-maxX, tx)));
        y.value = withTiming(Math.min(maxY, Math.max(-maxY, ty)));
      }
    })
    .onFinalize(() => { report(scale.value <= 1.05); });

  // Run the callbacks on the JS thread: they also tell the screen whether the photo is zoomed.
  pinch.runOnJS(true); pan.runOnJS(true); doubleTap.runOnJS(true);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));

  return (
    <GestureDetector gesture={Gesture.Race(doubleTap, Gesture.Simultaneous(pinch, pan))}>
      <View style={StyleSheet.absoluteFill} onLayout={e => { boxW.value = e.nativeEvent.layout.width; boxH.value = e.nativeEvent.layout.height; }}>
        <Animated.View style={[StyleSheet.absoluteFill, style]}>
          <Image source={{ uri }} resizeMode="contain" accessibilityLabel={label}
            style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${turns * -90}deg` }] }]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
