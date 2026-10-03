import React from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import LottieView from 'lottie-react-native';

import { SOURCES, IllustrationName } from './illustrationSources';

export type { IllustrationName };

/** Looping illustration. With Reduce Motion on it shows a still frame instead. */
export function Illustration({ name, size = 240, label, loop = true }: {
  name: IllustrationName; size?: number; label?: string; loop?: boolean;
}) {
  const [reduce, setReduce] = React.useState(false);
  React.useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);

  return (
    <View style={{ width: size, height: size }} accessible={!!label} accessibilityRole="image" accessibilityLabel={label}>
      <LottieView
        source={SOURCES[name]}
        autoPlay={!reduce}
        loop={loop && !reduce}
        progress={reduce ? 0.6 : undefined}
        style={{ width: size, height: size }}
        {...(Platform.OS === 'web' ? {} : { resizeMode: 'contain' as const })}
      />
    </View>
  );
}
