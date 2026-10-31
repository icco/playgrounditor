import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/ThemeContext';
import { GitHubError, isMarkdown } from '../lib/github';
import { usePreventRemove } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

export function EditorScreen({ route, navigation }: Props) {
  const { repoFullName, path, sha: initialSha, defaultBranch, isNew } = route.params;
  const { github } = useAuth();
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [sha, setSha] = useState(initialSha);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [modeModal, setModeModal] = useState(false);
  const [commitMsg, setCommitMsg] = useState(`docs: update ${path}`);
  const [savedText, setSavedText] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const markdown = isMarkdown(path);
  const dirty = !loading && !loadFailed && text !== savedText;

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Discard changes?', 'Your edits have not been saved.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  useEffect(() => {
    async function load() {
      if (isNew || !github) return;
      try {
        const file = await github.read(repoFullName, path, defaultBranch);
        setText(file.text);
        setSavedText(file.text);
        setSha(file.sha);
      } catch (e: unknown) {
        const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Failed to read file';
        setLoadFailed(true);
        Alert.alert('Error', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [repoFullName, path, defaultBranch, github, isNew, navigation]);

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  async function handleSave(mode: 'direct' | 'pr') {
    if (!github) return;
    setSaving(true);
    setModeModal(false);
    try {
      const repo = await github.repo(repoFullName);
      const res = await github.commit({
        repo,
        path,
        text,
        sha,
        message: commitMsg.trim() || `docs: update ${path}`,
        mode,
      });
      setSha(res.sha);
      setSavedText(text);
      if (res.prUrl) {
        Alert.alert('Success', `Pull request opened:\n${res.prUrl}`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Success', `Changes committed directly to ${defaultBranch}.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (e: unknown) {
      const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Commit failed';
      Alert.alert('Commit Failed', msg);
    } finally {
      setSaving(false);
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    fileName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
      marginRight: 12,
    },
    topRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    toggleBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginRight: 8,
    },
    toggleBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    toggleText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    toggleTextActive: {
      color: theme.colors.onPrimary,
    },
    saveBtn: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: 6,
      minWidth: 64,
      alignItems: 'center',
    },
    saveBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.onPrimary,
    },
    editor: {
      flex: 1,
      padding: 16,
      fontSize: 16,
      color: theme.colors.text,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: 24,
    },
    previewContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    previewContent: {
      padding: 16,
    },
    saveBtnDisabled: {
      opacity: 0.5,
    },
    statusBar: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      alignItems: 'flex-end',
    },
    statusText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
    },
    modalOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
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
    modalLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
      marginBottom: 6,
    },
    modalInput: {
      backgroundColor: theme.colors.inputBg,
      borderRadius: 10,
      height: 44,
      paddingHorizontal: 14,
      fontSize: 14,
      color: theme.colors.text,
      marginBottom: 16,
    },
    modalOption: {
      backgroundColor: theme.colors.primaryBg,
      borderRadius: 10,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: theme.colors.primaryBorder,
    },
    modalOptionDirect: {
      backgroundColor: theme.colors.inputBg,
      borderColor: theme.colors.border,
    },
    modalOptionTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 2,
    },
    modalOptionDesc: {
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    modalCancel: {
      marginTop: 8,
      alignItems: 'center',
      padding: 10,
    },
    modalCancelText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
  });

  const markdownStyles = {
    body: { color: theme.colors.text },
    heading1: { color: theme.colors.text },
    heading2: { color: theme.colors.text },
    heading3: { color: theme.colors.text },
    paragraph: { color: theme.colors.text },
    link: { color: theme.colors.primary },
    blockquote: { borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surface, color: theme.colors.text },
    fence: { backgroundColor: theme.colors.inputBg, color: theme.colors.text },
    code_inline: { backgroundColor: theme.colors.inputBg, color: theme.colors.text },
    code_block: { backgroundColor: theme.colors.inputBg, color: theme.colors.text },
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={styles.container}
    >
      <View style={styles.topBar}>
        <Text style={styles.fileName} numberOfLines={1}>
          {path}
        </Text>
        <View style={styles.topRight}>
          {markdown ? (
            <TouchableOpacity
              style={[styles.toggleBtn, preview && styles.toggleBtnActive]}
              onPress={() => setPreview(!preview)}
            >
              <Text style={[styles.toggleText, preview && styles.toggleTextActive]}>
                {preview ? 'Edit' : 'Preview'}
              </Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.saveBtn, (loading || loadFailed) && styles.saveBtnDisabled]}
            onPress={() => setModeModal(true)}
            disabled={saving || loading || loadFailed}
          >
            {saving ? (
              <ActivityIndicator size="small" color={theme.colors.onPrimary} />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : preview ? (
        <ScrollView style={styles.previewContainer} contentContainerStyle={styles.previewContent}>
          <Markdown style={markdownStyles}>{text || '*Empty file*'}</Markdown>
        </ScrollView>
      ) : (
        <TextInput
          style={styles.editor}
          multiline
          value={text}
          onChangeText={setText}
          placeholder={markdown ? 'Start writing markdown...' : 'Start writing...'}
          placeholderTextColor={theme.colors.placeholder}
          autoCapitalize={markdown ? 'sentences' : 'none'}
          autoCorrect={markdown}
          textAlignVertical="top"
        />
      )}

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {wordCount} words • {charCount} chars
        </Text>
      </View>

      {modeModal ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Changes</Text>
            <Text style={styles.modalLabel}>Commit message</Text>
            <TextInput
              style={styles.modalInput}
              value={commitMsg}
              onChangeText={setCommitMsg}
              placeholder="docs: update..."
              placeholderTextColor={theme.colors.placeholder}
            />
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => void handleSave('pr')}
            >
              <Text style={styles.modalOptionTitle}>Open Pull Request</Text>
              <Text style={styles.modalOptionDesc}>Commit to a new branch & open PR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOption, styles.modalOptionDirect]}
              onPress={() => void handleSave('direct')}
            >
              <Text style={styles.modalOptionTitle}>Commit to {defaultBranch}</Text>
              <Text style={styles.modalOptionDesc}>Push directly to {defaultBranch}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setModeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}
