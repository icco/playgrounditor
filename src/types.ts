export type SortBy = 'name' | 'modified';

export type RootStackParamList = {
  Login: undefined;
  RepoList: undefined;
  FileBrowser: { repoFullName: string; path?: string };
  Editor: { repoFullName: string; path: string; sha?: string; defaultBranch: string; isNew?: boolean };
  Settings: undefined;
};
