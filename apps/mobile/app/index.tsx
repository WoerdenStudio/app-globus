import { View, Text, StyleSheet } from 'react-native';
import { DEFAULT_OPERATING_HOURS, generateTimeSlots } from '@globus/core/business';

/**
 * Écran d'accueil placeholder — Phase 2.
 * Démontre l'import de packages/core (logique métier partagée).
 */
export default function HomeScreen() {
  const today = new Date();
  const slots = generateTimeSlots(today, DEFAULT_OPERATING_HOURS);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Globus Livraison</Text>
      <Text style={styles.subtitle}>Application mobile — Phase 2</Text>
      <Text style={styles.info}>
        Créneaux disponibles aujourd&apos;hui : {slots.length}
      </Text>
      <Text style={styles.hint}>
        La logique métier est importée depuis @globus/core
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 24,
  },
  info: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
