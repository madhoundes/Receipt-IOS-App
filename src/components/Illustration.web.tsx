import React from 'react';
import { View } from 'react-native';
import lottie from 'lottie-web';
import { useReceipts } from '../context/ReceiptContext';
import { SOURCES, IllustrationName } from './illustrationSources';

export type { IllustrationName };

/** Web build of Illustration: same files, played with lottie-web. */
export function Illustration({ name, size = 240, label, loop = true }: {
  name: IllustrationName; size?: number; label?: string; loop?: boolean;
}) {
  const ref = React.useRef<any>(null);
  const { userProfile } = useReceipts();
  const appReduce = userProfile.reduceMotion;
  React.useEffect(() => {
    const reduce = appReduce || typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const anim = lottie.loadAnimation({ container: ref.current, renderer: 'svg', loop: loop && !reduce, autoplay: !reduce, animationData: SOURCES[name] });
    if (reduce) anim.goToAndStop(Math.round(anim.totalFrames * 0.6), true);
    return () => anim.destroy();
  }, [name, loop, appReduce]);
  return <View ref={ref} style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={label} />;
}
