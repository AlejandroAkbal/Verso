import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useServers } from '@/db/hooks/useServers';
import { useTheme } from '@/theme/ThemeProvider';

export default function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { servers, addServer, editServer, removeServer } = useServers();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim() || !url.trim()) {
      Alert.alert('Missing fields', 'Please enter both a title and URL.');
      return;
    }

    if (editingId) {
      await editServer(editingId, title, url);
      setEditingId(null);
    } else {
      await addServer(title, url);
    }

    setTitle('');
    setUrl('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <ThemedText variant="label" color={theme.colors.textMuted}>
        Add OPDS Server
      </ThemedText>

      <TextInput
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
        placeholder="Server name"
        placeholderTextColor={theme.colors.textMuted}
        value={title}
        onChangeText={setTitle}
      />
      <TextInput
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border }]}
        placeholder="https://example.com/opds/"
        placeholderTextColor={theme.colors.textMuted}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      <Pressable
        style={[styles.saveButton, { backgroundColor: theme.colors.text }]}
        onPress={() => void handleSave()}
      >
        <ThemedText variant="subtitle" color={theme.colors.background}>
          {editingId ? 'Update Server' : 'Add Server'}
        </ThemedText>
      </Pressable>

      <ThemedText variant="label" color={theme.colors.textMuted} style={styles.sectionLabel}>
        Configured Servers
      </ThemedText>

      {servers.map((server) => (
        <View
          key={server.id}
          style={[styles.serverRow, { borderColor: theme.colors.border }]}
        >
          <View style={styles.serverInfo}>
            <ThemedText variant="subtitle">{server.title}</ThemedText>
            <ThemedText variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
              {server.url}
            </ThemedText>
          </View>
          <View style={styles.serverActions}>
            <Pressable
              onPress={() => {
                setEditingId(server.id);
                setTitle(server.title);
                setUrl(server.url);
              }}
            >
              <ThemedText variant="caption" color={theme.colors.textSecondary}>
                Edit
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => {
                Alert.alert('Delete server', `Remove "${server.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => void removeServer(server.id),
                  },
                ]);
              }}
            >
              <ThemedText variant="caption" color={theme.colors.error}>
                Delete
              </ThemedText>
            </Pressable>
          </View>
        </View>
      ))}

      <Pressable onPress={() => router.back()} style={styles.doneButton}>
        <ThemedText color={theme.colors.textSecondary}>Done</ThemedText>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  sectionLabel: {
    marginTop: 24,
  },
  serverRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  serverInfo: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  serverActions: {
    flexDirection: 'row',
    gap: 16,
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
});
