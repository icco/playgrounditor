import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { version } from '../../package.json';

export function SettingsScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Signed in as</Text>
        <Text style={styles.username}>@{user?.login || 'unknown'}</Text>
        {user?.name ? <Text style={styles.name}>{user.name}</Text> : null}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>Playgrouditor v{version}</Text>
        <Text style={styles.aboutText}>Minimal mobile markdown editor for GitHub.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#686D76',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: '#16161A',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    color: '#686D76',
    marginBottom: 20,
  },
  logoutBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#991B1B',
    fontSize: 15,
    fontWeight: '600',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#EFECE6',
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16161A',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 14,
    color: '#686D76',
    marginBottom: 4,
  },
});
