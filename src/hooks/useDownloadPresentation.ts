/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect --
   This hook is an intentional download-phase state machine driven by reanimated
   shared values. The React Compiler rules flag idiomatic `sharedValue.value = …`
   writes and the effect-driven `setPhase` transitions, which are by design here. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import type { DownloadRow } from '@/db/schema';
import {
  clearBookDownloadSession,
  isBookDownloadSessionActive,
  markBookDownloadSession,
} from '@/services/downloads/presentationSession';
import { notificationSuccessHaptic } from '@/lib/haptics';

const PROGRESS_TICK_MS = 420;
const COMPLETE_FILL_MS = 380;
/** How long the success checkmark stays fully visible before it fades away. */
const SUCCESS_HOLD_MS = 1100;
/** Gentle dissolve of the checkmark once the hold elapses. */
const SETTLE_FADE_MS = 340;

export type DownloadPresentationPhase = 'idle' | 'progress' | 'success' | 'settled';

type UseDownloadPresentationOptions = {
  onComplete?: () => void;
};

function initialPhase(
  bookId: string,
  status: string | null,
  isCompleted: boolean,
): DownloadPresentationPhase {
  if (isCompleted) {
    if (isBookDownloadSessionActive(bookId)) {
      return 'success';
    }
    return 'settled';
  }
  if (status === 'queued' || status === 'downloading') {
    return 'progress';
  }
  return 'idle';
}

export function useDownloadPresentation(
  bookId: string,
  options: UseDownloadPresentationOptions & { download?: DownloadRow | null } = {},
) {
  const {
    download,
    progress,
    isDownloading,
    isCompleted,
    isFailed,
    startDownload,
    removeDownload,
    status,
  } = useBackgroundDownload(bookId, { download: options.download });

  const [phase, setPhase] = useState<DownloadPresentationPhase>(() =>
    initialPhase(bookId, status, isCompleted),
  );

  const animatedProgress = useSharedValue(
    isCompleted ? 1 : Math.min(1, Math.max(0, progress)),
  );
  // Drives the success-chrome dissolve: 1 = fully shown, 0 = faded out.
  const settleAnim = useSharedValue(1);
  const wasActiveThisSessionRef = useRef(
    isBookDownloadSessionActive(bookId) ||
      status === 'queued' ||
      status === 'downloading',
  );
  const successHapticPlayedRef = useRef(false);
  const completionScheduledRef = useRef(false);
  const prevBookIdRef = useRef<string | null>(null);

  // FlashList recycles cells — re-sync when the book changes.
  useEffect(() => {
    if (prevBookIdRef.current === bookId) {
      return;
    }
    prevBookIdRef.current = bookId;

    setPhase(initialPhase(bookId, status, isCompleted));
    wasActiveThisSessionRef.current =
      isBookDownloadSessionActive(bookId) ||
      status === 'queued' ||
      status === 'downloading';
    successHapticPlayedRef.current = false;
    completionScheduledRef.current = false;
    animatedProgress.value = isCompleted ? 1 : Math.min(1, Math.max(0, progress));
    settleAnim.value = 1;
  }, [animatedProgress, bookId, isCompleted, progress, settleAnim, status]);

  const enterSuccess = useCallback(() => {
    setPhase('success');
    if (!successHapticPlayedRef.current) {
      successHapticPlayedRef.current = true;
      void notificationSuccessHaptic();
    }
  }, []);

  const scheduleCompletionCelebration = useCallback(() => {
    if (completionScheduledRef.current) {
      return;
    }
    completionScheduledRef.current = true;

    animatedProgress.value = withTiming(
      1,
      {
        duration: COMPLETE_FILL_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(enterSuccess)();
        }
      },
    );
  }, [animatedProgress, enterSuccess]);

  // Keep the latest onComplete without destabilizing enterSettled. The grid
  // re-renders every ~300ms (download polling), and options is a fresh literal
  // each render — depending on it here would perpetually reset the settle timer.
  const onCompleteRef = useRef(options.onComplete);
  useEffect(() => {
    onCompleteRef.current = options.onComplete;
  }, [options.onComplete]);

  const enterSettled = useCallback(() => {
    clearBookDownloadSession(bookId);
    setPhase('settled');
    onCompleteRef.current?.();
  }, [bookId]);

  const isSessionActive = useCallback(
    () => wasActiveThisSessionRef.current || isBookDownloadSessionActive(bookId),
    [bookId],
  );

  const handleStartDownload = useCallback(async () => {
    wasActiveThisSessionRef.current = true;
    markBookDownloadSession(bookId);
    successHapticPlayedRef.current = false;
    completionScheduledRef.current = false;
    setPhase('progress');
    animatedProgress.value = 0;
    settleAnim.value = 1;
    await startDownload();
  }, [animatedProgress, bookId, settleAnim, startDownload]);

  // Track active download session + keep progress phase in sync.
  useEffect(() => {
    if (!isDownloading) {
      return;
    }

    wasActiveThisSessionRef.current = true;
    markBookDownloadSession(bookId);
    successHapticPlayedRef.current = false;
    completionScheduledRef.current = false;
    setPhase('progress');
    animatedProgress.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, bookId, isDownloading, progress]);

  // Smooth progress ticks while downloading.
  useEffect(() => {
    if (phase !== 'progress' || !isDownloading) {
      return;
    }

    animatedProgress.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: PROGRESS_TICK_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [animatedProgress, isDownloading, phase, progress]);

  // Download finished — fill ring to 100%, then reveal checkmark.
  useEffect(() => {
    if (!isCompleted || !isSessionActive()) {
      return;
    }
    if (phase === 'success' || phase === 'settled') {
      return;
    }

    scheduleCompletionCelebration();
  }, [isCompleted, isSessionActive, phase, scheduleCompletionCelebration]);

  // Hold success state, dissolve the checkmark, then settle
  // (Read on detail / hide cloud on grid).
  useEffect(() => {
    if (phase !== 'success') {
      return;
    }

    settleAnim.value = 1;
    const timer = setTimeout(() => {
      settleAnim.value = withTiming(
        0,
        { duration: SETTLE_FADE_MS, easing: Easing.in(Easing.cubic) },
        (finished) => {
          'worklet';
          if (finished) {
            runOnJS(enterSettled)();
          }
        },
      );
    }, SUCCESS_HOLD_MS);

    return () => clearTimeout(timer);
  }, [enterSettled, phase, settleAnim]);

  // Failure — back to idle so retry is available.
  useEffect(() => {
    if (!isFailed) {
      return;
    }

    wasActiveThisSessionRef.current = false;
    clearBookDownloadSession(bookId);
    successHapticPlayedRef.current = false;
    completionScheduledRef.current = false;
    setPhase('idle');
    animatedProgress.value = 0;
  }, [animatedProgress, bookId, isFailed]);

  // Already on device when we mount (no UI session) — skip celebration.
  useEffect(() => {
    if (!isCompleted || isFailed) {
      return;
    }
    if (phase === 'idle' || (phase === 'progress' && !isSessionActive())) {
      setPhase('settled');
    }
  }, [isCompleted, isFailed, isSessionActive, phase]);

  // External remove / cancel — reset UI when the row is gone or no longer terminal.
  useEffect(() => {
    if (isCompleted || isDownloading || isFailed) {
      return;
    }
    if (phase === 'idle') {
      return;
    }

    clearBookDownloadSession(bookId);
    completionScheduledRef.current = false;
    wasActiveThisSessionRef.current = false;
    successHapticPlayedRef.current = false;
    setPhase('idle');
    animatedProgress.value = 0;
  }, [animatedProgress, bookId, isCompleted, isDownloading, isFailed, phase]);

  // Success chrome dissolves out (fade + slight bloom) as it settles.
  const settleStyle = useAnimatedStyle(() => ({
    opacity: settleAnim.value,
    transform: [{ scale: 1 + (1 - settleAnim.value) * 0.14 }],
  }));

  const showDownloadButton = phase === 'idle' && !isCompleted && !isFailed;
  const showProgressChrome = phase === 'progress';
  const showSuccessChrome = phase === 'success';
  const showCompletedUI = phase === 'settled' && isCompleted;
  const showFailedUI = phase === 'idle' && isFailed;

  return {
    download,
    status,
    progress,
    phase,
    isDownloading,
    isCompleted,
    isFailed,
    startDownload: handleStartDownload,
    removeDownload,
    animatedProgress,
    settleStyle,
    showDownloadButton,
    showProgressChrome,
    showSuccessChrome,
    showCompletedUI,
    showFailedUI,
  };
}
