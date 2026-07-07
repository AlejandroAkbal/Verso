import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the OS "Reduce Transparency" setting is on (iOS). Android: always false. */
export function useReduceTransparency(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (mounted) setReduce(value);
    });
    const sub = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduce,
    );
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
