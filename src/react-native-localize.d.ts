// @types/react-native-localize.d.ts
import 'react-native-localize';

declare module 'react-native-localize' {
  export function findBestAvailableLanguage<T extends string>(
    languageTags: T[]
  ): { languageTag: T; isRTL: boolean } | undefined;

  export function addEventListener(
    type: string,
    handler: () => void
  ): void;

  export function removeEventListener(
    type: string,
    handler: () => void
  ): void;
}
