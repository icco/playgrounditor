import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Markdown from 'react-native-markdown-display';
import { useAuth } from '../context/AuthContext';
import { GitHubError } from '../lib/github';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

export function EditorScreen({ route, navigation }: Props) {
  const { repoFullName, path, sha: initialSha, defaultBranch, isNew } = route.params;
  const { github } = useAuth();
  const [text, setText] = useState('');
  const [sha, setSha] = useState(initialSha);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const [modeModal, setModeModal] = useState(false);
  const [commitMsg, setCommitMsg] = useState(`docs: update ${path}`);

  useEffect(() => {
    async function load() {
      if (isNew || !github) return;
      try {
        const file = await github.read(repoFullName, path, defaultBranch);
        setText(file.text);
        setSha(file.sha);
      } catch (e: unknown) {
        const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Failed to read file';
        Alert.alert('Error', msg);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [repoFullName, path, defaultBranch, github, isNew]);

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
      if (res.prUrl) {
        Alert.alert('Success', `Pull request opened:\n${res.prUrl}`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Success', 'Changes committed directly to main!', [
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.topBar}>
        <Text style={styles.fileName} numberOfLines={1}>
          {path}
        </Text>
        <View style={styles.topRight}>
          <TouchableOpacity
            style={[styles.toggleBtn, preview && styles.toggleBtnActive]}
            onPress={() => setPreview(!preview)}
          >
            <Text style={[styles.toggleText, preview && styles.toggleTextActive]}>
              {preview ? 'Edit' : 'Preview'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => setModeModal(true)}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FAF8F5" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3A5A40" />
        </View>
      ) : preview ? (
        <View style={styles.previewContainer}>
          <Markdown>{text || '*Empty file*'}</Markdown>
        </View>
      ) : (
        <TextInput
          style={styles.editor}
          multiline
          value={text}
          onChangeText={setText}
          placeholder="Start writing markdown..."
          placeholderTextColor="#8C929D"
          autoCapitalize="sentences"
          autoCorrect
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
              <Text style={styles.modalOptionTitle}>Commit to Main</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  toggleBtnActive: {
    backgroundColor: '#3A5A40',
    borderColor: '#3A5A40',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  toggleTextActive: {
    color: '#FAF8F5',
  },
  saveBtn: {
    backgroundColor: '#3A5A40',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
    minWidth: 64,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FAF8F5',
  },
  editor: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#16161A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 24,
  },
  previewContainer: {
    flex: 1,
    padding: 16,
  },
  statusBar: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16161A',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#686D76',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#16161A',
    marginBottom: 16,
  },
  modalOption: {
    backgroundColor: '#F4F7F4',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#D8E2DC',
  },
  modalOptionDirect: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  modalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A5A40',
    marginBottom: 2,
  },
  modalOptionDesc: {
    fontSize: 13,
    color: '#686D76',
  },
  modalCancel: {
    marginTop: 8,
    alignItems: 'center',
    padding: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});
