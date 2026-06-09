import { useEffect, useMemo, useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { getMockWalletSummary, mockHelperClient } from './src/helper-client/mockHelperClient';
import { createHttpHelperClient } from './src/helper-client/httpHelperClient';
import type { NameDetail, WalletSummary } from './src/helper-client/types';
import { deriveReceiveAddress } from './src/wallet-core/deriveAddress';
import { walletCoreTestVectors } from './src/wallet-core/testVectors';

const publicTestMnemonic = walletCoreTestVectors[0].mnemonic;
const storedTestWalletKey = 'learnhns.mobile.testWalletMnemonic.v1';
const storedPinKey = 'learnhns.mobile.testWalletPin.v1';
const backupChallengeIndices = [2, 6, 10];
const sections = ['Dashboard', 'Receive', 'Domains', 'Wallet', 'Backup', 'Storage', 'Security'] as const;

type Section = (typeof sections)[number];
type WalletFlow = 'main' | 'restore';

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
  const [backupInputs, setBackupInputs] = useState<Record<number, string>>({});
  const [backupConfirmedMnemonic, setBackupConfirmedMnemonic] = useState('');
  const [backupMessage, setBackupMessage] = useState(
    'Confirm the requested seed words before saving this test wallet.'
  );
  const [pinInput, setPinInput] = useState('');
  const [unlockPinInput, setUnlockPinInput] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isCheckingLock, setIsCheckingLock] = useState(true);
  const [isHydratingWallet, setIsHydratingWallet] = useState(false);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Biometric unlock');
  const [lockMessage, setLockMessage] = useState('No app PIN has been set yet.');
  const [activeSection, setActiveSection] = useState<Section>('Dashboard');
  const [hasSavedWallet, setHasSavedWallet] = useState(false);
  const [isCurrentWalletSaved, setIsCurrentWalletSaved] = useState(false);
  const [walletFlow, setWalletFlow] = useState<WalletFlow>('main');
  const [clipboardMessage, setClipboardMessage] = useState('Tap receive address to copy.');
  const [receiveMessage, setReceiveMessage] = useState('Ready to receive test HNS.');
  const [walletSummary, setWalletSummary] = useState<WalletSummary>(getMockWalletSummary());
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [helperMessage, setHelperMessage] = useState('Mock helper data loaded.');
  const [helperBaseUrl, setHelperBaseUrl] = useState('');
  const [useHttpHelper, setUseHttpHelper] = useState(false);
  const [selectedName, setSelectedName] = useState<NameDetail | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPinState() {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const authTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

      if (isMounted && hasHardware && isEnrolled) {
        setIsBiometricAvailable(true);
        setBiometricLabel(getBiometricLabel(authTypes));
      }

      const storedPin = await SecureStore.getItemAsync(storedPinKey);

      if (!isMounted) {
        return;
      }

      if (!storedPin) {
        setIsHydratingWallet(true);
        try {
          await hydrateSavedTestWallet('Loaded saved test seed from SecureStore.');
        } finally {
          setIsHydratingWallet(false);
        }
        setIsCheckingLock(false);
        return;
      }

      setHasPin(true);
      setIsLocked(true);
      setLockMessage('App locked. Enter your test PIN to continue.');
      setIsCheckingLock(false);
    }

    loadPinState().catch(() => {
      if (isMounted) {
        setLockMessage('Unable to read test PIN state.');
        setIsCheckingLock(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const wordCount = useMemo(() => {
    return normalizeMnemonic(mnemonicInput).split(' ').filter(Boolean).length;
  }, [mnemonicInput]);
  const mnemonicWords = useMemo(() => {
    return normalizeMnemonic(mnemonicInput).split(' ').filter(Boolean);
  }, [mnemonicInput]);
  const backupChallenge = useMemo(() => {
    if (mnemonicWords.length < 12) {
      return [];
    }

    return backupChallengeIndices.filter((index) => index < mnemonicWords.length);
  }, [mnemonicWords.length]);
  const isBackupConfirmed = backupConfirmedMnemonic === normalizeMnemonic(mnemonicInput);

  async function createTestWallet() {
    setIsGenerating(true);

    try {
      const entropy = await Crypto.getRandomBytesAsync(16);
      const mnemonic = entropyToMnemonic(entropy, wordlist);

      setMnemonicInput(mnemonic);
      setIsCurrentWalletSaved(false);
      resetBackupConfirmation();
      deriveWalletPreview(mnemonic);
      setActiveSection('Backup');
      setWalletFlow('main');
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
    setIsCurrentWalletSaved(false);
    deriveWalletPreview(mnemonicInput);
    setActiveSection('Backup');
    setWalletFlow('main');
  }

  function loadPublicFixture() {
    setMnemonicInput(publicTestMnemonic);
    setIsCurrentWalletSaved(false);
    resetBackupConfirmation();
    deriveWalletPreview(publicTestMnemonic);
    setActiveSection('Backup');
    setWalletFlow('main');
  }

  function clearWallet() {
    setMnemonicInput('');
    setWalletPreview({ status: 'empty' });
    setIsCurrentWalletSaved(false);
    resetBackupConfirmation();
  }

  async function saveTestWallet() {
    const mnemonic = normalizeMnemonic(mnemonicInput);

    try {
      deriveReceiveAddress({ mnemonic });

      if (backupConfirmedMnemonic !== mnemonic) {
        setStorageMessage('Confirm the backup words before saving this test seed.');
        return;
      }

      setIsStorageBusy(true);
      await SecureStore.setItemAsync(storedTestWalletKey, mnemonic);
      setHasSavedWallet(true);
      setIsCurrentWalletSaved(true);
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
      await hydrateSavedTestWallet('Loaded saved test seed from SecureStore.');
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : 'Unable to load saved test seed.'
      );
    } finally {
      setIsStorageBusy(false);
    }
  }

  async function hydrateSavedTestWallet(successMessage: string) {
    const mnemonic = await SecureStore.getItemAsync(storedTestWalletKey);

    if (!mnemonic) {
      setHasSavedWallet(false);
      setStorageMessage('No saved test seed found on this device.');
      return false;
    }

    setMnemonicInput(mnemonic);
    resetBackupConfirmation();
    deriveWalletPreview(mnemonic);
    setHasSavedWallet(true);
    setIsCurrentWalletSaved(true);
    setStorageMessage(successMessage);
    setActiveSection('Dashboard');
    setWalletFlow('main');
    return true;
  }

  async function deleteSavedTestWallet() {
    setIsStorageBusy(true);

    try {
      await SecureStore.deleteItemAsync(storedTestWalletKey);
      setHasSavedWallet(false);
      setIsCurrentWalletSaved(false);
      setStorageMessage('Deleted saved test seed from SecureStore.');
    } catch (error) {
      setStorageMessage(
        error instanceof Error ? error.message : 'Unable to delete saved test seed.'
      );
    } finally {
      setIsStorageBusy(false);
    }
  }

  async function setTestPin() {
    const pin = pinInput.trim();

    if (!/^\d{4,8}$/.test(pin)) {
      setLockMessage('Use a numeric PIN with 4 to 8 digits.');
      return;
    }

    await SecureStore.setItemAsync(storedPinKey, pin);
    setHasPin(true);
    setPinInput('');
    setLockMessage('Test PIN saved. You can now lock the app.');
  }

  async function unlockWithPin() {
    const storedPin = await SecureStore.getItemAsync(storedPinKey);

    if (!storedPin || unlockPinInput.trim() !== storedPin) {
      setLockMessage('PIN did not match.');
      return;
    }

    setIsLocked(false);
    setUnlockPinInput('');
    setLockMessage('Unlocked.');
    setIsHydratingWallet(true);

    try {
      await hydrateSavedTestWallet('Unlocked and loaded saved test seed from SecureStore.');
    } finally {
      setIsHydratingWallet(false);
    }
  }

  async function unlockWithBiometrics() {
    const result = await LocalAuthentication.authenticateAsync({
      cancelLabel: 'Use PIN',
      disableDeviceFallback: false,
      promptMessage: 'Unlock LearnHNS Mobile',
    });

    if (!result.success) {
      setLockMessage('Biometric unlock was cancelled or did not match.');
      return;
    }

    setIsLocked(false);
    setLockMessage('Unlocked with biometrics.');
    setIsHydratingWallet(true);

    try {
      await hydrateSavedTestWallet('Unlocked with biometrics and loaded saved test seed.');
    } finally {
      setIsHydratingWallet(false);
    }
  }

  function lockApp() {
    if (!hasPin) {
      setLockMessage('Set a test PIN before locking the app.');
      return;
    }

    setIsLocked(true);
    setLockMessage('App locked. Enter your test PIN to continue.');
  }

  async function clearTestPin() {
    await SecureStore.deleteItemAsync(storedPinKey);
    setHasPin(false);
    setIsLocked(false);
    setPinInput('');
    setUnlockPinInput('');
    setLockMessage('Test PIN deleted.');
  }

  async function copyReceiveAddress() {
    if (walletPreview.status !== 'ready') {
      setClipboardMessage('No receive address is loaded yet.');
      setReceiveMessage('No receive address is loaded yet.');
      return;
    }

    await Clipboard.setStringAsync(walletPreview.address);
    setClipboardMessage('Receive address copied.');
    setReceiveMessage('Receive address copied.');
  }

  async function shareReceiveAddress() {
    if (walletPreview.status !== 'ready') {
      setReceiveMessage('No receive address is loaded yet.');
      return;
    }

    await Share.share({
      message: walletPreview.address,
      title: 'LearnHNS receive address',
    });
    setReceiveMessage('Share sheet opened.');
  }

  async function refreshWalletSummary() {
    setIsRefreshingSummary(true);

    try {
      const helperClient = getActiveHelperClient();
      const receiveAddress = walletPreview.status === 'ready' ? walletPreview.address : '';
      const summary = await helperClient.getWalletSummary({
        network: 'main',
        receiveAddress,
      });

      setWalletSummary(summary);
      setHelperMessage(
        useHttpHelper ? 'HTTP helper summary refreshed.' : 'Mock helper summary refreshed.'
      );
    } catch (error) {
      setHelperMessage(
        error instanceof Error ? error.message : 'Unable to refresh helper summary.'
      );
    } finally {
      setIsRefreshingSummary(false);
    }
  }

  async function openNameDetail(name: string) {
    try {
      const detail = await getActiveHelperClient().getNameDetail({
        network: 'main',
        name,
      });

      setSelectedName(detail);
    } catch (error) {
      setHelperMessage(error instanceof Error ? error.message : 'Unable to load name detail.');
    }
  }

  function getActiveHelperClient() {
    if (useHttpHelper && helperBaseUrl.trim()) {
      return createHttpHelperClient(helperBaseUrl.trim());
    }

    return mockHelperClient;
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

  function updateMnemonicInput(value: string) {
    setMnemonicInput(value);
    setIsCurrentWalletSaved(false);
    resetBackupConfirmation();
  }

  function updateBackupInput(index: number, value: string) {
    setBackupInputs((current) => ({
      ...current,
      [index]: value.trim().toLowerCase(),
    }));
  }

  function confirmBackupWords() {
    const mnemonic = normalizeMnemonic(mnemonicInput);

    try {
      deriveReceiveAddress({ mnemonic });
    } catch (error) {
      setBackupMessage(
        error instanceof Error ? error.message : 'Enter a valid seed phrase first.'
      );
      return;
    }

    const words = mnemonic.split(' ');
    const allMatch = backupChallenge.every((index) => {
      return backupInputs[index] === words[index];
    });

    if (!allMatch) {
      setBackupConfirmedMnemonic('');
      setBackupMessage('One or more backup words did not match. Check the phrase and try again.');
      return;
    }

    setBackupConfirmedMnemonic(mnemonic);
    setBackupMessage('Backup words confirmed. This test seed can now be saved locally.');
  }

  function resetBackupConfirmation() {
    setBackupInputs({});
    setBackupConfirmedMnemonic('');
    setBackupMessage('Confirm the requested seed words before saving this test wallet.');
  }

  if (isCheckingLock) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <View style={styles.lockContainer}>
          <ActivityIndicator color="#2856a3" />
          <Text style={styles.storageMessage}>Checking wallet lock...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isHydratingWallet) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <View style={styles.lockContainer}>
          <ActivityIndicator color="#2856a3" />
          <Text style={styles.storageMessage}>Loading saved wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLocked) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="auto" />
        <View style={styles.lockContainer}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>LearnHNS Mobile</Text>
            <Text style={styles.title}>Wallet locked.</Text>
            <Text style={styles.subtitle}>
              This Android-first PIN gate hides wallet test data until unlock.
              Biometric unlock comes after this.
            </Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelLabel}>M2 app lock</Text>
              <Text style={styles.panelTitle}>Enter test PIN</Text>
            </View>
            <TextInput
              keyboardType="number-pad"
              maxLength={8}
              onChangeText={setUnlockPinInput}
              placeholder="PIN"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              style={styles.challengeInput}
              value={unlockPinInput}
            />
            {isBiometricAvailable && (
              <Pressable
                accessibilityRole="button"
                onPress={unlockWithBiometrics}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>Unlock With {biometricLabel}</Text>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={unlockWithPin}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.primaryButtonText}>Unlock</Text>
            </Pressable>
            <Text style={styles.storageMessage}>{lockMessage}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
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
            Seed storage is gated behind backup confirmation while custody is proven.
          </Text>
        </View>

        <View style={styles.warningPanel}>
          <Text style={styles.warningLabel}>Test mode</Text>
          <Text style={styles.warningText}>
            This screen derives a receive address only. It does not save the seed,
            scan balances, send HNS, or protect a real wallet yet.
          </Text>
        </View>

        <View style={styles.sectionTabs}>
          {sections.map((section) => (
            <Pressable
              accessibilityRole="button"
              key={section}
              onPress={() => {
                setActiveSection(section);
                if (section !== 'Domains') {
                  setSelectedName(null);
                }
              }}
              style={[
                styles.sectionTab,
                activeSection === section && styles.sectionTabActive,
              ]}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === section && styles.sectionTabTextActive,
                ]}
              >
                {section}
              </Text>
            </Pressable>
          ))}
        </View>

        {activeSection === 'Dashboard' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelLabel}>M3 read-only state</Text>
              <Text style={styles.panelTitle}>Wallet dashboard</Text>
            </View>
            <Text style={styles.panelCopy}>
              This is mocked helper data. Live balances, owned names, and renewal
              status still need a real helper/indexer connection.
            </Text>

            <View style={styles.dashboardMetric}>
              <Text style={styles.detailLabel}>Helper status</Text>
              <Text style={styles.metricValue}>{walletSummary.helperStatus.label}</Text>
              <Text style={styles.nameMeta}>
                Mode: {walletSummary.helperStatus.mode} · Network:{' '}
                {walletSummary.helperStatus.network}
              </Text>
              <Text style={styles.nameMeta}>
                Updated: {new Date(walletSummary.helperStatus.updatedAt).toLocaleTimeString()}
              </Text>
            </View>

            <View style={styles.dashboardMetric}>
              <Text style={styles.detailLabel}>Helper endpoint</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setHelperBaseUrl}
                placeholder="http://YOUR-LAPTOP-IP:8787"
                placeholderTextColor="#94a3b8"
                style={styles.challengeInput}
                value={helperBaseUrl}
              />
              <Pressable
                accessibilityRole="button"
                onPress={() => setUseHttpHelper((current) => !current)}
                style={({ pressed }) => [
                  useHttpHelper ? styles.confirmedButton : styles.secondaryButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={useHttpHelper ? styles.primaryButtonText : styles.secondaryButtonText}>
                  {useHttpHelper ? 'Using HTTP Helper' : 'Use HTTP Helper'}
                </Text>
              </Pressable>
              <Text style={styles.nameMeta}>
                Enter a local mock helper URL, enable HTTP, then refresh.
              </Text>
            </View>

            <View style={styles.dashboardMetric}>
              <Text style={styles.detailLabel}>Mock HNS balance</Text>
              <Text style={styles.balanceValue}>{walletSummary.balance}</Text>
            </View>

            {walletPreview.status === 'ready' && (
              <Pressable
                accessibilityRole="button"
                onPress={() => setActiveSection('Receive')}
                style={({ pressed }) => [styles.dashboardMetric, pressed && styles.buttonPressed]}
              >
                <Text style={styles.detailLabel}>Receive address</Text>
                <Text selectable style={styles.addressText}>
                  {walletPreview.address}
                </Text>
                <Text style={styles.nameMeta}>Open Receive for QR, copy, and share.</Text>
              </Pressable>
            )}

            <View style={styles.dashboardMetric}>
              <Text style={styles.detailLabel}>Mock owned domains</Text>
              <Text style={styles.metricValue}>{walletSummary.names.length} domains</Text>
              <Text style={styles.nameMeta}>Open Domains to inspect records and actions.</Text>
            </View>

            <Pressable
              accessibilityRole="button"
              disabled={isRefreshingSummary}
              onPress={refreshWalletSummary}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
                isRefreshingSummary && styles.buttonDisabled,
              ]}
            >
              {isRefreshingSummary ? (
                <ActivityIndicator color="#244b8f" />
              ) : (
                <Text style={styles.secondaryButtonText}>Refresh Mock Helper</Text>
              )}
            </Pressable>
            <Text style={styles.nameMeta}>{helperMessage}</Text>

            <Pressable
              accessibilityRole="button"
              onPress={() => setActiveSection('Domains')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            >
              <Text style={styles.secondaryButtonText}>View Domains</Text>
            </Pressable>
          </View>
        )}

        {activeSection === 'Receive' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelLabel}>M4 receive</Text>
              <Text style={styles.panelTitle}>Receive HNS</Text>
            </View>
            <Text style={styles.panelCopy}>
              Share this address to receive HNS into the currently loaded test wallet.
            </Text>

            <View style={styles.warningPanel}>
              <Text style={styles.warningLabel}>Test wallet only</Text>
              <Text style={styles.warningText}>
                This app is still pre-production. Use small test amounts only until
                live balance tracking, transaction history, and wallet hardening are complete.
              </Text>
            </View>

            {walletPreview.status === 'ready' ? (
              <>
                <View style={styles.qrPanel}>
                  <QRCode
                    backgroundColor="#ffffff"
                    color="#0f172a"
                    size={220}
                    value={walletPreview.address}
                  />
                </View>

                <View style={styles.dashboardMetric}>
                  <Text style={styles.detailLabel}>Receive address</Text>
                  <Text selectable style={styles.receiveAddressText}>
                    {walletPreview.address}
                  </Text>
                </View>

                <View style={styles.storageActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={copyReceiveAddress}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      styles.storageButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.primaryButtonText}>Copy Address</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    onPress={shareReceiveAddress}
                    style={({ pressed }) => [
                      styles.secondaryButton,
                      styles.storageButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.secondaryButtonText}>Share</Text>
                  </Pressable>
                </View>

                <Text style={styles.storageMessage}>{receiveMessage}</Text>
              </>
            ) : (
              <View style={styles.errorPanel}>
                <Text style={styles.errorTitle}>No wallet loaded</Text>
                <Text style={styles.errorText}>
                  Create, restore, or unlock a saved test wallet before receiving HNS.
                </Text>
              </View>
            )}
          </View>
        )}

        {activeSection === 'Domains' && (
          <View style={styles.panel}>
            {!selectedName ? (
              <>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelLabel}>M5 domains</Text>
                  <Text style={styles.panelTitle}>Owned domains</Text>
                </View>
                <Text style={styles.panelCopy}>
                  Mock domain list. Live ownership, records, and renewal data will come
                  from the helper/indexer layer.
                </Text>

                <View style={styles.namesList}>
                  {walletSummary.names.map((name) => (
                    <Pressable
                      accessibilityRole="button"
                      key={name.name}
                      onPress={() => openNameDetail(name.name)}
                      style={({ pressed }) => [styles.nameRow, pressed && styles.buttonPressed]}
                    >
                      <Text style={styles.nameText}>{name.name}</Text>
                      <Text style={styles.nameMeta}>{name.status}</Text>
                      <Text style={styles.nameMeta}>{name.renewal}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <>
                <View style={styles.panelHeader}>
                  <Text style={styles.panelLabel}>Mock domain manager</Text>
                  <Text style={styles.panelTitle}>{selectedName.name}</Text>
                </View>
                <Text style={styles.panelCopy}>
                  Read-only mock detail. Record editing, renewals, and transfer actions
                  require live helper data and signing flows.
                </Text>

                <View style={styles.namesList}>
                  <Text style={styles.detailLabel}>Resource records</Text>
                  {selectedName.records.map((record) => (
                    <View key={record} style={styles.recordRow}>
                      <Text style={styles.recordText}>{record}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.storageActions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled
                    style={[styles.secondaryButton, styles.storageButton, styles.buttonDisabled]}
                  >
                    <Text style={styles.secondaryButtonText}>Edit Records</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled
                    style={[styles.secondaryButton, styles.storageButton, styles.buttonDisabled]}
                  >
                    <Text style={styles.secondaryButtonText}>Renew</Text>
                  </Pressable>
                </View>

                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedName(null)}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.secondaryButtonText}>Back To Domains</Text>
                </Pressable>
              </>
            )}
          </View>
        )}

        {activeSection === 'Wallet' && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>M1/M2 bridge</Text>
            <Text style={styles.panelTitle}>
              {walletFlow === 'restore'
                ? 'Restore or create test wallet'
                : isCurrentWalletSaved
                  ? 'Saved test wallet'
                  : 'Wallet seed preview'}
            </Text>
          </View>

          {walletFlow === 'main' && (
            <>
              <Text style={styles.panelCopy}>
                {isCurrentWalletSaved
                  ? 'This device has a saved test wallet. New wallet creation is available as a secondary action.'
                  : hasSavedWallet
                    ? 'A saved test wallet exists on this device. Use Storage to load it, or restore/create another test wallet.'
                    : 'Create or restore a test wallet to derive its first Handshake receive address.'}
              </Text>

              {isCurrentWalletSaved && walletPreview.status === 'ready' && (
            <View style={styles.resultPanel}>
              <Text style={styles.panelLabel}>Current receive address</Text>
              <Pressable accessibilityRole="button" onPress={copyReceiveAddress}>
                <Text selectable style={styles.addressText}>
                  {walletPreview.address}
                </Text>
              </Pressable>
              <Text style={styles.nameMeta}>{clipboardMessage}</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Path</Text>
                <Text selectable style={styles.detailValue}>
                  {walletPreview.path}
                </Text>
              </View>
              <Text style={styles.resultNote}>
                Loaded from local SecureStore. Balance and names are not connected yet.
              </Text>
            </View>
              )}

              {!isCurrentWalletSaved && walletPreview.status === 'ready' && (
            <View style={styles.resultPanel}>
              <Text style={styles.panelLabel}>Derived receive address</Text>
              <Pressable accessibilityRole="button" onPress={copyReceiveAddress}>
                <Text selectable style={styles.addressText}>
                  {walletPreview.address}
                </Text>
              </Pressable>
              <Text style={styles.nameMeta}>{clipboardMessage}</Text>
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

              <Pressable
                accessibilityRole="button"
                onPress={() => setWalletFlow('restore')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>
                  {isCurrentWalletSaved ? 'Restore Or Create Another Wallet' : 'Create Or Restore Wallet'}
                </Text>
              </Pressable>
            </>
          )}

          {walletFlow === 'restore' && (
            <>
              <Text style={styles.panelCopy}>
                Seed phrases are only shown inside this restore/create flow. Return to Wallet
                when you are done.
              </Text>

              <Text style={styles.inputLabel}>Seed phrase</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                onChangeText={updateMnemonicInput}
                placeholder="Enter a 12 or 24 word BIP39 seed phrase"
                placeholderTextColor="#94a3b8"
                scrollEnabled
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

              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isGenerating}
                  onPress={createTestWallet}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    pressed && styles.buttonPressed,
                    isGenerating && styles.buttonDisabled,
                  ]}
                >
                  {isGenerating ? (
                    <ActivityIndicator color="#244b8f" />
                  ) : (
                    <Text style={styles.secondaryButtonText}>Create Test Wallet</Text>
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

              {!isCurrentWalletSaved && walletPreview.status === 'ready' && (
                <View style={styles.resultPanel}>
                  <Text style={styles.panelLabel}>Derived receive address</Text>
                  <Pressable accessibilityRole="button" onPress={copyReceiveAddress}>
                    <Text selectable style={styles.addressText}>
                      {walletPreview.address}
                    </Text>
                  </Pressable>
                  <Text style={styles.nameMeta}>{clipboardMessage}</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Path</Text>
                    <Text selectable style={styles.detailValue}>
                      {walletPreview.path}
                    </Text>
                  </View>
                  <Text style={styles.resultNote}>
                    Continue to Backup before saving this test wallet locally.
                  </Text>
                </View>
              )}

              {walletPreview.status === 'error' && (
                <View style={styles.errorPanel}>
                  <Text style={styles.errorTitle}>Seed phrase not valid</Text>
                  <Text style={styles.errorText}>{walletPreview.message}</Text>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                onPress={() => setWalletFlow('main')}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
              >
                <Text style={styles.secondaryButtonText}>Back To Wallet</Text>
              </Pressable>
            </>
          )}
        </View>
        )}

        {activeSection === 'Backup' && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>M2 backup gate</Text>
            <Text style={styles.panelTitle}>Confirm seed backup</Text>
          </View>
          <Text style={styles.panelCopy}>
            Enter the requested words from the seed phrase before saving it locally.
          </Text>

          {backupChallenge.map((index) => (
            <View key={index} style={styles.challengeRow}>
              <Text style={styles.challengeLabel}>Word {index + 1}</Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={(value) => updateBackupInput(index, value)}
                placeholder={`Enter word ${index + 1}`}
                placeholderTextColor="#94a3b8"
                spellCheck={false}
                style={styles.challengeInput}
                value={backupInputs[index] ?? ''}
              />
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            disabled={backupChallenge.length === 0}
            onPress={confirmBackupWords}
            style={({ pressed }) => [
              isBackupConfirmed ? styles.confirmedButton : styles.primaryButton,
              pressed && styles.buttonPressed,
              backupChallenge.length === 0 && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {isBackupConfirmed ? 'Backup Confirmed' : 'Confirm Backup Words'}
            </Text>
          </Pressable>

          <Text style={isBackupConfirmed ? styles.successMessage : styles.storageMessage}>
            {backupMessage}
          </Text>
        </View>
        )}

        {activeSection === 'Storage' && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>M2 storage spike</Text>
            <Text style={styles.panelTitle}>Save this test wallet</Text>
          </View>
          <Text style={styles.panelCopy}>
            This proves Android secure storage plumbing only. PIN, biometric unlock,
            and real-wallet safety are still not complete.
          </Text>

          <Pressable
            accessibilityRole="button"
            disabled={isStorageBusy || !mnemonicInput.trim() || !isBackupConfirmed}
            onPress={saveTestWallet}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
              (isStorageBusy || !mnemonicInput.trim() || !isBackupConfirmed) &&
                styles.buttonDisabled,
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
        )}

        {activeSection === 'Security' && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelLabel}>M2 app lock</Text>
            <Text style={styles.panelTitle}>Protect with test PIN</Text>
          </View>
          <Text style={styles.panelCopy}>
            This hides wallet test data behind a local PIN. The PIN storage model is
            still a prototype and must be hardened before real wallet use.
          </Text>
          <Text style={styles.storageMessage}>
            {isBiometricAvailable
              ? `${biometricLabel} unlock is available on this device.`
              : 'Biometric unlock is not available or not enrolled on this device.'}
          </Text>

          <TextInput
            keyboardType="number-pad"
            maxLength={8}
            onChangeText={setPinInput}
            placeholder="Set 4 to 8 digit PIN"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            style={styles.challengeInput}
            value={pinInput}
          />

          <Pressable
            accessibilityRole="button"
            onPress={setTestPin}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>{hasPin ? 'Update Test PIN' : 'Set Test PIN'}</Text>
          </Pressable>

          <View style={styles.storageActions}>
            <Pressable
              accessibilityRole="button"
              disabled={!hasPin}
              onPress={lockApp}
              style={({ pressed }) => [
                styles.secondaryButton,
                styles.storageButton,
                pressed && styles.buttonPressed,
                !hasPin && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Lock App</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={!hasPin}
              onPress={clearTestPin}
              style={({ pressed }) => [
                styles.destructiveButton,
                styles.storageButton,
                pressed && styles.buttonPressed,
                !hasPin && styles.buttonDisabled,
              ]}
            >
              <Text style={styles.destructiveButtonText}>Delete PIN</Text>
            </Pressable>
          </View>

          <Text style={styles.storageMessage}>{lockMessage}</Text>
        </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function normalizeMnemonic(mnemonic: string) {
  return mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getBiometricLabel(types: LocalAuthentication.AuthenticationType[]) {
  if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return 'Face';
  }

  if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return 'Fingerprint';
  }

  return 'Biometrics';
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  container: {
    gap: 18,
    padding: 20,
    paddingBottom: 180,
  },
  lockContainer: {
    flex: 1,
    gap: 18,
    justifyContent: 'center',
    padding: 20,
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
  sectionTabs: {
    backgroundColor: '#e8eef8',
    borderRadius: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 4,
  },
  sectionTab: {
    alignItems: 'center',
    borderRadius: 7,
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  sectionTabActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 5,
  },
  sectionTabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  sectionTabTextActive: {
    color: '#1d4f99',
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
  confirmedButton: {
    alignItems: 'center',
    backgroundColor: '#18794e',
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
    maxHeight: 140,
    minHeight: 92,
    padding: 12,
  },
  inputFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  challengeRow: {
    gap: 6,
  },
  challengeLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '800',
  },
  challengeInput: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe3ee',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0f172a',
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 12,
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
  dashboardMetric: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    padding: 12,
  },
  metricValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  balanceValue: {
    color: '#102a56',
    fontSize: 24,
    fontWeight: '800',
  },
  qrPanel: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d8e2f3',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  namesList: {
    gap: 8,
  },
  nameRow: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
    borderRadius: 8,
    borderWidth: 1,
    gap: 3,
    padding: 12,
  },
  nameText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  nameMeta: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  nameDetailPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#c9d8f5',
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  recordRow: {
    backgroundColor: '#eef3fb',
    borderRadius: 8,
    padding: 10,
  },
  recordText: {
    color: '#183526',
    fontSize: 13,
    lineHeight: 18,
  },
  addressText: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 22,
  },
  receiveAddressText: {
    color: '#0f172a',
    fontSize: 16,
    lineHeight: 24,
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
  successMessage: {
    color: '#18794e',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
});
