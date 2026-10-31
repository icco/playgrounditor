import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { GitHubError, Repo } from '../lib/github';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RepoList'>;

export function RepoListScreen({ navigation }: Props) {
  const { github, recentRepos, addRecentRepo } = useAuth();
  const { theme } = useTheme();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadRepos = useCallback(async () => {
    if (!github) return;
    try {
      setError(null);
      const list = await github.repos();
      setRepos(list);
    } catch (e: unknown) {
      const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Failed to load repositories';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [github]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadRepos();
    }, 0);
    return () => clearTimeout(t);
  }, [loadRepos]);

  function selectRepo(r: Repo) {
    void addRecentRepo(r.full_name);
    navigation.navigate('FileBrowser', { repoFullName: r.full_name, path: '' });
  }

  const filtered = repos.filter(
    r =>
      r.full_name.toLowerCase().includes(query.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(query.toLowerCase())),
  );

  const recentList = recentRepos
    .map(name => repos.find(r => r.full_name === name))
    .filter(Boolean) as Repo[];

  const styles = StyleSheet.create({
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
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search repositories (e.g. icco/writing)..."
          placeholderTextColor={theme.colors.placeholder}
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
        <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsBtnText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.full_name}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadRepos();
              }}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            recentList.length > 0 && !query ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent</Text>
                {recentList.map(r => (
                  <TouchableOpacity
                    key={`recent-${r.full_name}`}
                    style={styles.repoCard}
                    onPress={() => selectRepo(r)}
                  >
                    <Text style={styles.repoName}>{r.full_name}</Text>
                    {r.description ? (
                      <Text style={styles.repoDesc} numberOfLines={1}>
                        {r.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>All Repositories</Text>
              </View>
            ) : undefined
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.repoCard} onPress={() => selectRepo(item)}>
              <View style={styles.repoRow}>
                <Text style={styles.repoName}>{item.full_name}</Text>
                {item.private ? <Text style={styles.badge}>Private</Text> : null}
              </View>
              {item.description ? (
                <Text style={styles.repoDesc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}
