import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { startDeviceFlow, pollDeviceFlow, DeviceCode, GitHubError } from '../lib/github';
import { useAuth } from '../context/AuthContext';

export function LoginScreen() {
  const { loginWithToken } = useAuth();
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualToken, setManualToken] = useState('');

  async function handleStartDevice() {
    setLoading(true);
    setError(null);
    try {
      const dc = await startDeviceFlow();
      setDeviceCode(dc);
      startPolling(dc);
    } catch (e: unknown) {
      const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Failed to start device sign in';
      setError(msg);
      setLoading(false);
    }
  }

  function startPolling(dc: DeviceCode) {
    const intervalMs = Math.max(dc.interval || 5, 5) * 1000;
    const expiresAt = Date.now() + dc.expires_in * 1000;

    const timer = setInterval(() => {
      if (Date.now() > expiresAt) {
        clearInterval(timer);
        setDeviceCode(null);
        setError('Sign in timed out. Try again.');
        return;
      }
      void pollDeviceFlow(dc.device_code)
        .then(res => {
          if ('token' in res) {
            clearInterval(timer);
            void loginWithToken(res.token);
          }
        })
        .catch((e: unknown) => {
          clearInterval(timer);
          setDeviceCode(null);
          const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Sign in failed';
          setError(msg);
        });
    }, intervalMs);
  }

  async function handleManualLogin() {
    if (!manualToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await loginWithToken(manualToken.trim());
    } catch (e: unknown) {
      const msg = e instanceof GitHubError || e instanceof Error ? e.message : 'Invalid personal access token';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Playgrouditor</Text>
        <Text style={styles.subtitle}>Calm mobile markdown editor for GitHub</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!deviceCode ? (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => void handleStartDevice()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FAF8F5" />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in with GitHub</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.orText}>— or enter Personal Access Token —</Text>
            <TextInput
              style={styles.input}
              placeholder="ghp_..."
              placeholderTextColor="#8C929D"
              secureTextEntry
              value={manualToken}
              onChangeText={setManualToken}
            />
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => void handleManualLogin()}
              disabled={loading || !manualToken.trim()}
            >
              <Text style={styles.secondaryButtonText}>Connect Token</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.codeSection}>
            <Text style={styles.instruction}>1. Open github.com/login/device</Text>
            <Text style={styles.instruction}>2. Enter this code:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{deviceCode.user_code}</Text>
            </View>
            <View style={styles.waitingRow}>
              <ActivityIndicator size="small" color="#3A5A40" />
              <Text style={styles.waitingText}>Waiting for authorization...</Text>
            </View>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#16161A',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#686D76',
    textAlign: 'center',
    marginBottom: 28,
  },
  section: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#3A5A40',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#FAF8F5',
    fontSize: 16,
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#8C929D',
    fontSize: 13,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#16161A',
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#3A5A40',
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#3A5A40',
    fontSize: 15,
    fontWeight: '600',
  },
  codeSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  instruction: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 8,
    textAlign: 'center',
  },
  codeBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 28,
    marginVertical: 16,
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16161A',
    letterSpacing: 4,
  },
  waitingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  waitingText: {
    marginLeft: 10,
    color: '#686D76',
    fontSize: 14,
  },
  error: {
    backgroundColor: '#FEE2E2',
    color: '#991B1B',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
  },
});
