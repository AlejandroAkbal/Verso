import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { selectionHaptic } from '@/lib/haptics';
import type {
  ReaderFontFamily,
  ReaderTextAlign,
  ReaderTheme,
  StoredReaderPreferences,
} from '@/services/reader/preferences';
import { useTheme } from '@/theme/ThemeProvider';

const FONT_SIZE_MIN = 1.0;
const FONT_SIZE_MAX = 3.0;
const FONT_SIZE_STEP = 0.125;
const LINE_HEIGHT_MIN = 1.0;
const LINE_HEIGHT_MAX = 2.0;
const LINE_HEIGHT_STEP = 0.1;
const MARGIN_MIN = 0.5;
const MARGIN_MAX = 4.0;
const MARGIN_STEP = 0.25;

type ReaderSettingsPanelProps = {
  prefs: StoredReaderPreferences;
  onChange: (patch: Partial<StoredReaderPreferences>) => void;
};

const THEMES: ReaderTheme[] = ['dark', 'sepia', 'light'];
const FONTS: ReaderFontFamily[] = ['serif', 'sans-serif', 'monospace'];
const ALIGNS: ReaderTextAlign[] = ['justify', 'start'];

function stepValue(current: number, delta: number, min: number, max: number): number {
  const next = Math.round((current + delta) * 1000) / 1000;
  return Math.min(max, Math.max(min, next));
}

function Stepper({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();

  return (
    <Box flexDirection="row" alignItems="center" gap="sm">
      <PressableBox
        onPress={() => {
          void selectionHaptic();
          onChange(stepValue(value, -step, min, max));
        }}
        hitSlop={8}
      >
        <SymbolView name="minus" size={16} tintColor={theme.colors.textSecondary} />
      </PressableBox>
      <ThemedText variant="caption" color={theme.colors.textSecondary}>
        {value.toFixed(step < 0.2 ? 2 : 1)}
      </ThemedText>
      <PressableBox
        onPress={() => {
          void selectionHaptic();
          onChange(stepValue(value, step, min, max));
        }}
        hitSlop={8}
      >
        <SymbolView name="plus" size={16} tintColor={theme.colors.textSecondary} />
      </PressableBox>
    </Box>
  );
}

export function ReaderSettingsPanel({ prefs, onChange }: ReaderSettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <>
      <SettingsGroup header={t('reader.appearanceHeader')} footer={t('reader.appearanceFooter')}>
        {THEMES.map((value) => (
          <SettingsRow
            key={value}
            title={t(`reader.theme.${value}`)}
            selected={prefs.theme === value}
            onPress={() => {
              void selectionHaptic();
              onChange({ theme: value });
            }}
          />
        ))}
      </SettingsGroup>

      <SettingsGroup header={t('reader.typographyHeader')}>
        {FONTS.map((value) => (
          <SettingsRow
            key={value}
            title={t(`reader.font.${value}`)}
            selected={prefs.fontFamily === value}
            onPress={() => {
              void selectionHaptic();
              onChange({ fontFamily: value });
            }}
          />
        ))}
        <SettingsRow
          title={t('reader.fontSize')}
          rightElement={
            <Stepper
              value={prefs.fontSize}
              min={FONT_SIZE_MIN}
              max={FONT_SIZE_MAX}
              step={FONT_SIZE_STEP}
              onChange={(fontSize) => onChange({ fontSize })}
            />
          }
        />
        <SettingsRow
          title={t('reader.lineHeight')}
          rightElement={
            <Stepper
              value={prefs.lineHeight}
              min={LINE_HEIGHT_MIN}
              max={LINE_HEIGHT_MAX}
              step={LINE_HEIGHT_STEP}
              onChange={(lineHeight) => onChange({ lineHeight })}
            />
          }
        />
        <SettingsRow
          title={t('reader.pageMargins')}
          rightElement={
            <Stepper
              value={prefs.pageMargins}
              min={MARGIN_MIN}
              max={MARGIN_MAX}
              step={MARGIN_STEP}
              onChange={(pageMargins) => onChange({ pageMargins })}
            />
          }
        />
        {ALIGNS.map((value) => (
          <SettingsRow
            key={value}
            title={t(`reader.align.${value}`)}
            selected={prefs.textAlign === value}
            onPress={() => {
              void selectionHaptic();
              onChange({ textAlign: value });
            }}
          />
        ))}
        <SettingsRow
          title={t('reader.publisherStyles')}
          subtitle={t('reader.publisherStylesHint')}
          selected={prefs.publisherStyles}
          onPress={() => {
            void selectionHaptic();
            onChange({ publisherStyles: !prefs.publisherStyles });
          }}
        />
      </SettingsGroup>
    </>
  );
}
