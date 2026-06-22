import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import type { Order, PickupLocation, Profile } from '@globus/core/types';
import { PICKUP_OTHER_VALUE } from '@globus/core/types';

interface OrderEmailProps {
  order: Order;
  pickupLocations: PickupLocation[];
  creator?: Profile | null;
  recipientType: 'dispatch' | 'globus';
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <Text style={{ margin: '4px 0', fontSize: '14px' }}>
      <strong>{label} :</strong> {value}
    </Text>
  );
}

export function OrderConfirmationEmail({
  order,
  pickupLocations,
  creator,
  recipientType,
}: OrderEmailProps) {
  const pickupLabel =
    order.pickup_location_id
      ? pickupLocations.find((l) => l.id === order.pickup_location_id)?.label
      : order.pickup_address_custom;

  const preview =
    recipientType === 'dispatch'
      ? `Nouvelle course Globus — ${order.delivery_address}`
      : `Récapitulatif de votre commande — ${order.delivery_address}`;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ fontFamily: 'Arial, sans-serif', backgroundColor: '#f8fafc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '24px' }}>
          <Heading style={{ fontSize: '20px', color: '#334155' }}>
            {recipientType === 'dispatch'
              ? 'Nouvelle course de livraison — Globus'
              : 'Récapitulatif de commande — Globus Livraison'}
          </Heading>
          <Hr />
          <Section>
            <Heading as="h2" style={{ fontSize: '16px', color: '#64748b' }}>
              Départ
            </Heading>
            <Row label="Lieu de départ" value={pickupLabel} />
          </Section>
          <Section>
            <Heading as="h2" style={{ fontSize: '16px', color: '#64748b' }}>
              Destination
            </Heading>
            <Row label="Adresse" value={order.delivery_address} />
            <Row label="Type d'accès" value={order.access_type} />
            <Row label="Détail d'accès" value={order.access_detail} />
            {order.is_hotel && <Row label="Chambre" value={order.hotel_room_number} />}
            <Row label="Étage" value={order.floor} />
          </Section>
          <Section>
            <Heading as="h2" style={{ fontSize: '16px', color: '#64748b' }}>
              Planification
            </Heading>
            <Row label="Date souhaitée" value={order.requested_date} />
            <Row label="Créneau" value={order.requested_time_slot} />
          </Section>
          <Section>
            <Heading as="h2" style={{ fontSize: '16px', color: '#64748b' }}>
              Détails
            </Heading>
            <Row label="Destinataire" value={order.client_name} />
            <Row label="Téléphone" value={order.client_phone} />
            <Row label="Poids" value={order.weight ? `${order.weight} kg` : null} />
            <Row label="Dimensions" value={order.dimensions} />
            <Row label="Fragile" value={order.fragile ? 'Oui' : null} />
            <Row label="Périssable" value={order.perishable ? 'Oui' : null} />
            <Row label="Laisser devant la porte" value={order.leave_at_door ? 'Oui' : null} />
            <Row
              label="Valeur déclarée"
              value={order.declared_value_chf ? `${order.declared_value_chf} CHF` : null}
            />
            <Row label="Assurance complémentaire" value={order.extra_insurance ? 'Oui' : null} />
            <Row label="Instructions" value={order.special_instructions} />
            <Row label="Photo" value={order.goods_photo_url ? order.goods_photo_url : null} />
            <Row label="Montant facturé" value={order.price_chf ? `${order.price_chf} CHF` : null} />
          </Section>
          {creator && (
            <Section>
              <Row label="Commandé par" value={creator.full_name} />
            </Section>
          )}
          <Hr />
          <Text style={{ fontSize: '12px', color: '#94a3b8' }}>
            Globus Livraison — Vélopostale
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
