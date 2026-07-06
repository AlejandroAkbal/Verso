import { useState } from 'react';
import { Linking } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { parseOpdsSummary, summaryPlainText } from '@/lib/opdsSummary';
import { useTheme } from '@/theme/ThemeProvider';

const SUMMARY_COLLAPSE_LENGTH = 320;
const VISIBLE_CATEGORY_COUNT = 5;

type BookAboutSectionProps = {
  summary: string;
  categories: string[];
};

function CollapsibleSummary({ summary }: { summary: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const plainSummary = summaryPlainText(summary);
  const canCollapse = plainSummary.length > SUMMARY_COLLAPSE_LENGTH;
  const segments = parseOpdsSummary(summary);

  const visibleSegments = (() => {
    if (!canCollapse || expanded) {
      return segments;
    }

    let length = 0;
    const clipped: typeof segments = [];
    for (const segment of segments) {
      const segmentLength =
        segment.type === 'text' ? segment.value.length : segment.label.length;
      if (length + segmentLength > SUMMARY_COLLAPSE_LENGTH) {
        if (segment.type === 'text') {
          clipped.push({
            type: 'text',
            value: `${segment.value.slice(0, SUMMARY_COLLAPSE_LENGTH - length).trim()}…`,
          });
        }
        break;
      }
      clipped.push(segment);
      length += segmentLength;
    }
    return clipped.length > 0 ? clipped : segments;
  })();

  const openLink = (href: string) => {
    void Linking.openURL(href);
  };

  return (
    <Box gap="sm">
      <ThemedText
        variant="body"
        color={theme.colors.textSecondary}
        style={{ lineHeight: 24 }}
      >
        {visibleSegments.map((segment, index) =>
          segment.type === 'text' ? (
            <ThemedText
              key={`text-${index}`}
              variant="body"
              color={theme.colors.textSecondary}
            >
              {segment.value}
            </ThemedText>
          ) : (
            <ThemedText
              key={`link-${segment.href}-${index}`}
              variant="body"
              color={theme.colors.interactive}
              onPress={() => openLink(segment.href)}
              style={{ textDecorationLine: 'underline' }}
            >
              {segment.label}
            </ThemedText>
          ),
        )}
      </ThemedText>
      {canCollapse ? (
        <PressableBox onPress={() => setExpanded((value) => !value)} hitSlop={8}>
          <ThemedText variant="caption" color={theme.colors.textSecondary}>
            {expanded ? t('book.showLess') : t('book.showMore')}
          </ThemedText>
        </PressableBox>
      ) : null}
    </Box>
  );
}

export function BookAboutSection({ summary, categories }: BookAboutSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const plainSummary = summaryPlainText(summary);
  const canCollapseCategories = categories.length > VISIBLE_CATEGORY_COUNT;
  const visibleCategories =
    canCollapseCategories && !categoriesExpanded
      ? categories.slice(0, VISIBLE_CATEGORY_COUNT)
      : categories;

  if (!plainSummary && categories.length === 0) {
    return null;
  }

  return (
    <Box gap="md">
      <ThemedText variant="subtitle" style={{ letterSpacing: -0.2 }}>
        {t('book.about')}
      </ThemedText>

      {categories.length > 0 ? (
        <Box gap="sm">
          <Box flexDirection="row" flexWrap="wrap" gap="sm">
            {visibleCategories.map((category) => (
              <Box
                key={category}
                borderRadius="full"
                paddingHorizontal="md"
                paddingVertical="xs"
                backgroundColor="secondary"
              >
                <ThemedText variant="caption" color={theme.colors.textSecondary}>
                  {category}
                </ThemedText>
              </Box>
            ))}
          </Box>
          {canCollapseCategories ? (
            <PressableBox
              onPress={() => setCategoriesExpanded((value) => !value)}
              hitSlop={8}
            >
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                {categoriesExpanded
                  ? t('book.showLess')
                  : t('book.showMoreCategories', { count: categories.length - VISIBLE_CATEGORY_COUNT })}
              </ThemedText>
            </PressableBox>
          ) : null}
        </Box>
      ) : null}

      {plainSummary ? <CollapsibleSummary summary={summary} /> : null}
    </Box>
  );
}
