import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

const milestones = [
  'Create or restore a Bob-compatible Handshake wallet',
  'Keep keys encrypted on device with PIN/biometric unlock',
  'Show HNS balance, receive QR, and send confirmation',
  'Show owned names, records, and renewal attention',
];

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="auto" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>LearnHNS Mobile</Text>
          <Text style={styles.title}>Handshake wallet for people on the move.</Text>
          <Text style={styles.subtitle}>
            Version 1 is focused on self-custody, HNS send/receive, owned names,
            and local renewal attention. Marketplace buying comes later.
          </Text>
        </View>

        <View style={styles.statusPanel}>
          <Text style={styles.panelLabel}>V1 build status</Text>
          <Text style={styles.panelTitle}>Foundation scaffold ready</Text>
          <Text style={styles.panelCopy}>
            Next gate: prove Bob/hsd-compatible seed and address derivation on
            iOS and Android before storing real wallet data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>V1 milestones</Text>
          {milestones.map((item) => (
            <View key={item} style={styles.milestone}>
              <View style={styles.dot} />
              <Text style={styles.milestoneText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Non-custodial by design: no LearnHNS seed custody, no cloud seed
            sync, and no server-side signing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  container: {
    padding: 24,
    gap: 22,
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
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: 0,
  },
  subtitle: {
    color: '#4b5563',
    fontSize: 16,
    lineHeight: 23,
  },
  statusPanel: {
    backgroundColor: '#ffffff',
    borderColor: '#d8e2f3',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 18,
  },
  panelLabel: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '800',
  },
  milestone: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dot: {
    backgroundColor: '#f0b429',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  milestoneText: {
    color: '#1f2937',
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
  footer: {
    paddingBottom: 24,
  },
  footerText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 20,
  },
});
