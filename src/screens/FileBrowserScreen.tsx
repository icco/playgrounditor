import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { Entry, GitHubError, Repo, isEditable, isMarkdown } from '../lib/github';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FileBrowser'>;

export function FileBrowserScreen({ route, navigation }: Props) {
  const { repoFullName, path: initialPath = '' } = route.params;
  const { github } = useAuth();
  const { theme } = useTheme();
  const [repo, setRepo] = useState<Repo | null>(null);
  const repoRef = useRef<Repo | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  const latestLoad = useRef(0);

  const loadData = useCallback(async () => {
    if (!github) return;
    const load = ++latestLoad.current;
    try {
      setError(null);
      const r = repoRef.current || (await github.repo(repoFullName));
      repoRef.current = r;
      setRepo(r);
      const list = await github.list(repoFullName, currentPath, r.default_branch);
      if (load === latestLoad.current) setEntries(list);
    } catch (e: unknown) {
      if (load !== latestLoad.current) return;
      const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Failed to load directory';
      setEntries([]);
      setError(msg);
    } finally {
      if (load === latestLoad.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [github, repoFullName, currentPath]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  usePreventRemove(currentPath !== '', () => {
    openDir(currentPath.split('/').slice(0, -1).join('/'));
  });

  function openDir(path: string) {
    setLoading(true);
    setCurrentPath(path);
  }

  function handlePress(item: Entry) {
    if (item.type === 'dir') {
      openDir(item.path);
    } else if (item.type !== 'file' || !isEditable(item.name)) {
      Alert.alert('Cannot edit', `${item.name} is not a text file this app can edit.`);
    } else {
      navigation.navigate('Editor', {
        repoFullName,
        path: item.path,
        sha: item.sha,
        defaultBranch: repo?.default_branch || 'main',
      });
    }
  }

  function handleCreateNew() {
    if (!newFileName.trim()) return;
    const cleanName = newFileName.trim().endsWith('.md')
      ? newFileName.trim()
      : `${newFileName.trim()}.md`;
    const targetPath = currentPath ? `${currentPath}/${cleanName}` : cleanName;
    setModalVisible(false);
    setNewFileName('');
    navigation.navigate('Editor', {
      repoFullName,
      path: targetPath,
      defaultBranch: repo?.default_branch || 'main',
      isNew: true,
    });
  }

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    breadcrumbRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      padding: 14,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    crumbBtn: {
      paddingVertical: 2,
    },
    crumbRoot: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    crumbSep: {
      fontSize: 14,
      color: theme.colors.textMuted,
      marginHorizontal: 6,
    },
    crumbText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    list: {
      padding: 16,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      borderRadius: 10,
      padding: 14,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    rowDir: {
      borderColor: theme.colors.primaryBorder,
    },
    rowFile: {},
    rowIcon: {
      fontSize: 18,
      marginRight: 12,
    },
    rowText: {
      fontSize: 16,
      color: theme.colors.text,
      flex: 1,
    },
    rowMd: {
      fontWeight: '600',
      color: theme.colors.primary,
    },
    fab: {
      position: 'absolute',
      right: 24,
      bottom: 24,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      elevation: 6,
    },
    fabText: {
      fontSize: 28,
      color: theme.colors.onPrimary,
      fontWeight: '300',
      marginTop: -2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 360,
      shadowColor: theme.colors.cardShadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 6,
      borderWidth: 1,
      borderColor: theme.colors.borderSubtle,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      marginBottom: 16,
    },
    modalInput: {
      backgroundColor: theme.colors.inputBg,
      borderRadius: 10,
      height: 48,
      paddingHorizontal: 16,
      fontSize: 15,
      color: theme.colors.text,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    modalBtn: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 8,
      marginLeft: 10,
    },
    modalBtnCancel: {
      backgroundColor: theme.colors.inputBg,
    },
    modalBtnCancelText: {
      color: theme.colors.textMuted,
      fontWeight: '600',
    },
    modalBtnCreate: {
      backgroundColor: theme.colors.primary,
    },
    modalBtnCreateText: {
      color: theme.colors.onPrimary,
      fontWeight: '600',
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
      <View style={styles.breadcrumbRow}>
        <TouchableOpacity
          onPress={() => openDir('')}
          style={styles.crumbBtn}
        >
          <Text style={styles.crumbRoot}>{repoFullName}</Text>
        </TouchableOpacity>
        {breadcrumbs.map((crumb, idx) => {
          const subPath = breadcrumbs.slice(0, idx + 1).join('/');
          return (
            <React.Fragment key={subPath}>
              <Text style={styles.crumbSep}>/</Text>
              <TouchableOpacity onPress={() => openDir(subPath)} style={styles.crumbBtn}>
                <Text style={styles.crumbText}>{crumb}</Text>
              </TouchableOpacity>
            </React.Fragment>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.path}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadData();
              }}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => {
            const isMd = isMarkdown(item.name);
            return (
              <TouchableOpacity
                style={[styles.row, item.type === 'dir' ? styles.rowDir : styles.rowFile]}
                onPress={() => handlePress(item)}
              >
                <Text style={styles.rowIcon}>{item.type === 'dir' ? '📁' : isMd ? '📝' : '📄'}</Text>
                <Text style={[styles.rowText, isMd && styles.rowMd]} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Markdown File</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. post-title.md"
              placeholderTextColor={theme.colors.placeholder}
              value={newFileName}
              onChangeText={setNewFileName}
              autoFocus
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCreate]}
                onPress={handleCreateNew}
              >
                <Text style={styles.modalBtnCreateText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
