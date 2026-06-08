import { useMemo, useState } from 'react';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { deriveReceiveAddress } from './src/wallet-core/deriveAddress';
import { walletCoreTestVectors } from './src/wallet-core/testVectors';

const publicTestMnemonic = walletCoreTestVectors[0].mnemonic;
const storedTestWalletKey = 'learnhns.mobile.testWalletMnemonic.v1';

type WalletPreview =
  | {
      status: 'empty';
    }
  | {
      status: 'ready';
      mnemonic: string;
      address: string;
      path: string;
    }
  | {
      status: 'error';
      message: string;
    };

export default function App() {
  const [mnemonicInput, setMnemonicInput] = useState(publicTestMnemonic);
  const [walletPreview, setWalletPreview] = useState<WalletPreview>({ status: 'empty' });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStorageBusy, setIsStorageBusy] = useState(false);
  const [storageMessage, setStorageMessage] = useState(
    'No seed has been saved in this session.'
  );

  const wordCount = useMemo(() => {
    return normalizeMnemonic(mnemonicInput).split(' ').filter(Boolean).length;
  }, [mnemonicInput]);

  async function createTestWallet() {
    setIsGenerating(true);

    try {
      const entropy = await Crypto.getRandomBytesAsync(16);
      const mnemonic = entropyToMnemonic(entropy, wordlist);

      setMnemonicInput(mnemonic);
      deriveWalletPreview(mnemonic);
    } catch (error) {
      setWalletPreview({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to create test wallet.',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  function restoreWallet() {
    deriveWalletPreview(mnemonicInput);
  }

  function loadPublicFixture() {
    setMnemonicInput(publicTestMnemonic);
    deriveWalletPreview(publicTestMnemonic);
  }

  function clearWallet() {
    setMnemonicInput('');
    setWalletPreview({ status: 'empty' });
  }

  async function saveTestWallet() {
    const mnemonic = normalizeMnemonic(mnemonicInput);

    try {
      deriveReceiveAddress({ mnemonic });
      setIsStorageBusy(true);
      await SecureStore.setItemAsync(storedTestWalletKey, mnemonic);
      setStorageMessage('Saved this test seed with Expo SecureStore.');
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : 'Unable to save this test seed.'
      );
    } finally {
      setIsStorageBusy(false);
    }
  }

  async function loadSavedTestWallet() {
    setIsStorageBusy(true);

    try {
      const mnemonic = await SecureStore.getItemAsync(storedTestWalletKey);

      if (!mnemonic) {
        setStorageMessage('No saved test seed found on this device.');
        return;
      }

      setMnemonicInput(mnemonic);
      deriveWalletPreview(mnemonic);
      setStorageMessage('Loaded saved test seed from SecureStore.');
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : 'Unable to load saved test seed.'
      );
    } finally {
      setIsStorageBusy(false);
    }
  }

  async function deleteSavedTestWallet() {
    setIsStorageBusy(true);

    try {
      await SecureStore.deleteItemAsync(storedTestWalletKey);
      setStorageMessage('Deleted saved test seed from SecureStore.');
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : 'Unable to delete saved test seed.'
      );
    } finally {
      setIsStorageBusy(false);
    }
  }

  function deriveWalletPreview(mnemonic: string) {
    try {
      const result = deriveReceiveAddress({ mnemonic });

      setWalletPreview({
        status: 'ready',
        mnemonic: normalizeMnemonic(mnemonic),
        address: result.address,
        path: result.path,
      });
    } catch (error) {
      setWalletPreview({
        status: 'error',
        message:
          error instanceof Error ? error.message : 'Unable to derive Handshake address.',
      });
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LearnHNS Mobile</Text>
          <Text style={styles.title}>Create or restore a Handshake wallet.</Text>
          <Text style={styles.subtitle}>
            Android-first development is moving ahead with in-memory wallet checks.
            Seed storage is intentionally disabled until encrypted custody is proven.
          </Text>
        </View>

        <View style={styles.warningPanel}>
          <Text style={styles.warningLabel}>Test mode</Text>
          <Text style={styles.warningText}>
            This screen derives a receive address only. It does not save the seed,
            scan balances, send HNS, or protect a real wallet yet.
          </Text>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>M1/M2 bridge</Text>
            <Text style={styles.panelTitle}>Wallet seed preview</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              disabled={isGenerating}
              onPress={createTestWallet}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                isGenerating && styles.buttonDisabled,
              ]}
            >
              {isGenerating ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Test Wallet</Text>
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={loadPublicFixture}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>Load Public Fixture</Text>
            </Pressable>
          </View>

          {walletPreview.status === 'ready' && (
            <View style={styles.resultPanel}>
              <Text style={styles.panelLabel}>Derived receive address</Text>
              <Text selectable style={styles.addressText}>
                {walletPreview.address}
              </Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Path</Text>
                <Text selectable style={styles.detailValue}>
                  {walletPreview.path}
                </Text>
              </View>
              <Text style={styles.resultNote}>
                Keep using test wallets only. Secure storage and backup confirmation are
                the next custody gate.
              </Text>
            </View>
          )}

          {walletPreview.status === 'error' && (
            <View style={styles.errorPanel}>
              <Text style={styles.errorTitle}>Seed phrase not valid</Text>
              <Text style={styles.errorText}>{walletPreview.message}</Text>
            </View>
          )}

          <Text style={styles.inputLabel}>Seed phrase</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            multiline
            onChangeText={setMnemonicInput}
            placeholder="Enter a 12 or 24 word BIP39 seed phrase"
            placeholderTextColor="#94a3b8"
            spellCheck={false}
            style={styles.mnemonicInput}
            textAlignVertical="top"
            value={mnemonicInput}
          />

          <View style={styles.inputFooter}>
            <Text style={styles.wordCount}>{wordCount} words</Text>
            <Pressable accessibilityRole="button" onPress={clearWallet}>
              <Text style={styles.clearButton}>Clear</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={restoreWallet}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>Restore And Derive Address</Text>
          </Pressable>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>M2 storage spike</Text>
            <Text style={styles.panelTitle}>Save this test wallet</Text>
          </View>
          <Text style={styles.panelCopy}>
            This proves Android secure storage plumbing only. PIN, biometric unlock,
            backup confirmation, and real-wallet safety are still not complete.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isStorageBusy || !mnemonicInput.trim()}
            onPress={saveTestWallet}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              (isStorageBusy || !mnemonicInput.trim()) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Save Test Seed Locally</Text>
          </Pressable>

          <View style={styles.storageActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isStorageBusy}
              onPress={loadSavedTestWallet}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.storageButton,
                pressed && styles.buttonPressed,
                isStorageBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Load Saved</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={isStorageBusy}
              onPress={deleteSavedTestWallet}
              style={({ pressed }) => [
                styles.destructiveButton,
                styles.storageButton,
                pressed && styles.buttonPressed,
                isStorageBusy && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.destructiveButtonText}>Delete Saved</Text>
            </Pressable>
          </View>

          <Text style={styles.storageMessage}>{storageMessage}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeMnemonic(mnemonic: string) {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 96,
  },
  header: {
    gap: 10,
    paddingTop: 18,
  },
  eyebrow: {
    color: '#2856a3',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: 0,
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 23,
  },
  warningPanel: {
    backgroundColor: '#fff8e6',
    borderColor: '#f1c760',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  warningLabel: {
    color: '#8a5a00',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  warningText: {
    color: '#593d0a',
    fontSize: 14,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e2f3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  panelHeader: {
    gap: 4,
  },
  panelLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  panelTitle: {
    color: '#14213d',
    fontSize: 21,
    fontWeight: '800',
    lineHeight: 27,
  },
  panelCopy: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#2856a3',
    borderRadius: 8,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#edf3ff',
    borderColor: '#c9d8f5',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#244b8f',
    fontSize: 15,
    fontWeight: '800',
  },
  destructiveButton: {
    alignItems: 'center',
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  destructiveButtonText: {
    color: '#9f1239',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.78,
  },
  buttonDisabled: {
    opacity: 0.68,
  },
  inputLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  mnemonicInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe3ee',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 116,
    padding: 12,
  },
  inputFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  wordCount: {
    color: '#64748b',
    fontSize: 13,
  },
  clearButton: {
    color: '#2856a3',
    fontSize: 13,
    fontWeight: '800',
  },
  resultPanel: {
    backgroundColor: '#eefbf3',
    borderColor: '#9fd9b5',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  addressText: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
  detailRow: {
    gap: 4,
  },
  detailLabel: {
    color: '#476153',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#183526',
    fontSize: 14,
  },
  resultNote: {
    color: '#3f604d',
    fontSize: 13,
    lineHeight: 19,
  },
  errorPanel: {
    backgroundColor: '#fff1f2',
    borderColor: '#fecdd3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  errorTitle: {
    color: '#9f1239',
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    color: '#9f1239',
    fontSize: 14,
    lineHeight: 20,
  },
  storageActions: {
    flexDirection: 'row',
    gap: 10,
  },
  storageButton: {
    flex: 1,
  },
  storageMessage: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 19,
  },
});
