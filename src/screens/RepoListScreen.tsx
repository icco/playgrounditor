import React, { useCallback, useDeferredValue, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { errorMessage } from '../lib/errors';
import { Draft, listDrafts } from '../lib/localFiles';
import { useIsOnline } from '../lib/queryClient';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RepoList'>;

const REPOS_STALE_MS = 5 * 60 * 1000;

export function RepoListScreen({ navigation }: Props) {
  const { github, recentRepos, addRecentRepo } = useAuth();
  const { theme } = useTheme();
  const online = useIsOnline();
  const [query, setQuery] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const deferredQuery = useDeferredValue(query);

  const reposQuery = useQuery({
    queryKey: ['repos'],
    queryFn: () => github!.repos(),
    enabled: !!github,
    staleTime: REPOS_STALE_MS,
  });
  const repos = useMemo(() => reposQuery.data ?? [], [reposQuery.data]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listDrafts()
        .then(list => {
          if (active) setDrafts(list);
        })
        .catch((e: unknown) => console.error('Could not list drafts', e));
      return () => {
        active = false;
      };
    }, []),
  );

  function selectRepo(fullName: string) {
    addRecentRepo(fullName).catch((e: unknown) => console.error('Could not save recent repository', e));
    navigation.navigate('FileBrowser', { repoFullName: fullName, path: '' });
  }

  function openDraft(draft: Draft) {
    navigation.navigate('Editor', {
      repoFullName: draft.repoFullName,
      path: draft.path,
      defaultBranch: draft.defaultBranch,
      sha: draft.baseSha,
      isNew: !draft.baseSha,
    });
  }

  const filtered = useMemo(() => {
    const needle = deferredQuery.toLowerCase();
    return repos.filter(
      r => r.full_name.toLowerCase().includes(needle) || r.description?.toLowerCase().includes(needle),
    );
  }, [repos, deferredQuery]);

  const error = reposQuery.error ? errorMessage(reposQuery.error, 'Failed to load repositories') : null;
  const loading = reposQuery.isLoading && !reposQuery.data;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    search: {
      flex: 1,
      backgroundColor: theme.colors.inputBg,
      borderRadius: 10,
      height: 44,
      paddingHorizontal: 16,
      fontSize: 15,
      color: theme.colors.text,
      marginRight: 12,
    },
    settingsBtn: {
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    settingsBtnText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    list: {
      padding: 16,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    sectionHeader: {
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    repoCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 10,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 2,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    repoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    repoName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    repoDesc: {
      fontSize: 14,
      color: theme.colors.textMuted,
    },
    badge: {
      fontSize: 11,
      color: theme.colors.badgeText,
      backgroundColor: theme.colors.badgeBg,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      overflow: 'hidden',
      fontWeight: '500',
    },
    error: {
      backgroundColor: theme.colors.dangerBg,
      color: theme.colors.dangerText,
      padding: 12,
      margin: 16,
      borderRadius: 8,
      textAlign: 'center',
      fontSize: 14,
    },
    offline: {
      backgroundColor: theme.colors.primaryBg,
      color: theme.colors.text,
      paddingVertical: 6,
      paddingHorizontal: 16,
      fontSize: 13,
      textAlign: 'center',
    },
    empty: {
      textAlign: 'center',
      color: theme.colors.textMuted,
      fontSize: 14,
      marginTop: 24,
    },
  }), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search repositories (e.g. icco/writing)..."
          placeholderTextColor={theme.colors.placeholder}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search repositories"
        />
        <Pressable accessibilityRole="button" style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsBtnText}>Settings</Text>
        </Pressable>
      </View>

      {online ? null : <Text style={styles.offline}>Offline. Showing saved repositories.</Text>}
      {error && online ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.full_name}
          refreshControl={
            <RefreshControl
              refreshing={reposQuery.isRefetching}
              onRefresh={() => void reposQuery.refetch()}
              tintColor={theme.colors.primary}
            />
          }
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            !query && (drafts.length > 0 || recentRepos.length > 0) ? (
              <View style={styles.sectionHeader}>
                {drafts.length > 0 ? <Text style={styles.sectionTitle}>Drafts</Text> : null}
                {drafts.map(d => (
                  <Pressable
                    key={`draft-${d.repoFullName}:${d.path}`}
                    accessibilityRole="button"
                    style={styles.repoCard}
                    onPress={() => openDraft(d)}
                  >
                    <Text style={styles.repoName} numberOfLines={1}>{d.path}</Text>
                    <Text style={styles.repoDesc} numberOfLines={1}>{d.repoFullName}</Text>
                  </Pressable>
                ))}
                {recentRepos.length > 0 ? <Text style={styles.sectionTitle}>Recent</Text> : null}
                {recentRepos.map(name => (
                  <Pressable
                    key={`recent-${name}`}
                    accessibilityRole="button"
                    style={styles.repoCard}
                    onPress={() => selectRepo(name)}
                  >
                    <Text style={styles.repoName}>{name}</Text>
                  </Pressable>
                ))}
                <Text style={styles.sectionTitle}>All Repositories</Text>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            error ? undefined : <Text style={styles.empty}>{query ? 'No matching repositories.' : 'No repositories found.'}</Text>
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" style={styles.repoCard} onPress={() => selectRepo(item.full_name)}>
              <View style={styles.repoRow}>
                <Text style={styles.repoName}>{item.full_name}</Text>
                {item.private ? <Text style={styles.badge}>Private</Text> : null}
              </View>
              {item.description ? (
                <Text style={styles.repoDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}
