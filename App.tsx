import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, AppState, StatusBar, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { focusManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { version } from './package.json';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { CACHE_MAX_AGE_MS, persister, queryClient } from './src/lib/queryClient';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { LoginScreen } from './src/screens/LoginScreen';
import { RepoListScreen } from './src/screens/RepoListScreen';
import { FileBrowserScreen } from './src/screens/FileBrowserScreen';
import { EditorScreen } from './src/screens/EditorScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { RootStackParamList } from './src/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

const persistOptions = { persister, maxAge: CACHE_MAX_AGE_MS, buster: version };

function MainNavigator() {
  const { token, loading } = useAuth();
  const { theme } = useTheme();

  const navTheme = useMemo(() => {
    const base = theme.mode === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: theme.colors.background,
        card: theme.colors.surface,
        text: theme.colors.text,
        border: theme.colors.border,
        primary: theme.colors.primary,
      },
    };
  }, [theme]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar barStyle={theme.mode === 'dark' ? 'light-content' : 'dark-content'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.text,
          headerTitleStyle: { fontWeight: '700', color: theme.colors.text },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="RepoList" component={RepoListScreen} options={{ title: 'Playgrounditor' }} />
            <Stack.Screen
              name="FileBrowser"
              component={FileBrowserScreen}
              options={({ route }) => ({ title: route.params.repoFullName })}
            />
            <Stack.Screen
              name="Editor"
              component={EditorScreen}
              options={({ route }) => ({ title: route.params.path.split('/').pop() })}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      focusManager.setFocused(state === 'active');
    });
    return () => {
      sub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
          <ThemeProvider>
            <AuthProvider>
              <MainNavigator />
            </AuthProvider>
          </ThemeProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
