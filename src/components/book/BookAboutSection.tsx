import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme/ThemeProvider';

const SUMMARY_COLLAPSE_LENGTH = 320;
const VISIBLE_CATEGORY_COUNT = 5;

type BookAboutSectionProps = {
  summary: string;
  categories: string[];
};

export function BookAboutSection({ summary, categories }: BookAboutSectionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

  const plainSummary = summary.replace(/<[^>]+>/g, '').trim();
  const canCollapseSummary = plainSummary.length > SUMMARY_COLLAPSE_LENGTH;
  const visibleSummary =
    canCollapseSummary && !summaryExpanded
      ? `${plainSummary.slice(0, SUMMARY_COLLAPSE_LENGTH).trim()}…`
      : plainSummary;

  const canCollapseCategories = categories.length > VISIBLE_CATEGORY_COUNT;
  const visibleCategories =
    canCollapseCategories && !categoriesExpanded
      ? categories.slice(0, VISIBLE_CATEGORY_COUNT)
      : categories;

  if (!plainSummary && categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <ThemedText variant="subtitle" style={styles.heading}>
        {t('book.about')}
      </ThemedText>

      {categories.length > 0 ? (
        <View style={styles.categoryBlock}>
          <View style={styles.categories}>
            {visibleCategories.map((category) => (
              <View
                key={category}
                style={[styles.categoryPill, { backgroundColor: theme.colors.secondary }]}
              >
                <ThemedText variant="caption" color={theme.colors.textSecondary}>
                  {category}
                </ThemedText>
              </View>
            ))}
          </View>
          {canCollapseCategories ? (
            <Pressable onPress={() => setCategoriesExpanded((value) => !value)} hitSlop={8}>
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                {categoriesExpanded
                  ? t('book.showLess')
                  : t('book.showMoreCategories', { count: categories.length - VISIBLE_CATEGORY_COUNT })}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {plainSummary ? (
        <View style={styles.summaryBlock}>
          <ThemedText variant="body" color={theme.colors.textSecondary} style={styles.summary}>
            {visibleSummary}
          </ThemedText>
          {canCollapseSummary ? (
            <Pressable onPress={() => setSummaryExpanded((value) => !value)} hitSlop={8}>
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                {summaryExpanded ? t('book.showLess') : t('book.showMore')}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    letterSpacing: -0.2,
  },
  categoryBlock: {
    gap: 8,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryPill: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryBlock: {
    gap: 8,
  },
  summary: {
    lineHeight: 24,
  },
});
