import { Text, View, StyleSheet } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏭 FicsitManager</Text>
      <Text style={styles.subtitle}>Gestionnaire d'usine Satisfactory</Text>
      <Text style={styles.text}>Application mobile en cours de développement</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f97316',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: 'white',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 24,
    color: 'white',
  },
  text: {
    fontSize: 16,
    color: 'white',
  },
});
