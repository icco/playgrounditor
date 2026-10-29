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
import { GitHubError, Repo } from '../lib/github';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'RepoList'>;

export function RepoListScreen({ navigation }: Props) {
  const { github, recentRepos, addRecentRepo } = useAuth();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.search}
          placeholder="Search repositories (e.g. icco/writing)..."
          placeholderTextColor="#8C929D"
          value={query}
          onChangeText={setQuery}
          clearButtonMode="while-editing"
        />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3A5A40" />
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
              tintColor="#3A5A40"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  search: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#16161A',
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
    color: '#686D76',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  repoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFECE6',
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
    color: '#16161A',
  },
  repoDesc: {
    fontSize: 14,
    color: '#686D76',
  },
  badge: {
    fontSize: 11,
    color: '#3A5A40',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
    fontWeight: '500',
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 14,
  },
});
