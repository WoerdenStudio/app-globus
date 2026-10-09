import { describe, expect, it } from 'vitest';
import type { Order } from '../types';
import { mapOrderToLogtechPayload } from './logtech';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    pickup_location_id: 'pickup-1',
    pickup_address_custom: null,
    delivery_address: 'Chemin de l\'Adret 8, 1212 Lancy',
    access_type: 'acces_libre',
    access_detail: null,
    is_hotel: false,
    is_villa_or_arcade: false,
    hotel_name: null,
    hotel_room_number: null,
    floor: '0ème',
    client_name: 'Tim',
    client_phone: '+41444444444',
    requested_date: '2026-10-30',
    requested_time_slot: '11:30-13:30',
    time_slot_notes: null,
    leave_at_door: false,
    special_instructions: null,
    packages: [
      {
        bag_number: '9999',
        description: '',
        weight: 1,
        dimensions: '20×6×21 cm',
        package_type: 'carton-s',
        fragile: false,
        perishable: false,
        declared_value_chf: null,
        extra_insurance: false,
        goods_photo_url: null,
      },
      {
        bag_number: '0000',
        description: '',
        weight: 2,
        dimensions: '32×22×26 cm',
        package_type: 'gateau-s',
        fragile: false,
        perishable: false,
        declared_value_chf: null,
        extra_insurance: false,
        goods_photo_url: null,
      },
    ],
    status: 'created',
    price_chf: 26,
    created_by: 'user-1',
    created_at: '2026-10-07T00:00:00Z',
    updated_at: '2026-10-07T00:00:00Z',
    logtech_ref: null,
    ...overrides,
  };
}

describe('envoi vers Polypheme', () => {
  it('envoie le poids retenu, la taille, le format et le tarif calculé', () => {
    const payload = mapOrderToLogtechPayload(makeOrder(), {
      pickupAddress: 'Quai de chargement, 1201 Genève',
      orderedBy: 'Admin Test',
    });

    expect(payload.order.billingRecord.invoiceAmountWithoutVat).toBe(26);
    expect(payload.order.shipments).toHaveLength(2);

    const carton = payload.order.shipments[0]!;
    expect(carton.weight_kg).toBe(1);
    expect(carton.length_cm).toBe(20);
    expect(carton.width_cm).toBe(6);
    expect(carton.height_cm).toBe(21);
    expect(carton.description).toContain('Sac en carton S');
    expect(carton.description).toContain('Sac 9999');
    expect(carton.description).toContain('IATA 0.42 kg');

    const gateau = payload.order.shipments[1]!;
    // Poids réel 2 kg, IATA 3,051 kg → on envoie le plus élevé
    expect(gateau.weight_kg).toBe(3.051);
    expect(gateau.length_cm).toBe(32);
    expect(gateau.description).toContain('Sac à gâteau S');
    expect(gateau.description).toContain('retenu 3.051 kg');
  });

  it('ajoute fragile, périssable et photo dans la description du colis', () => {
    const payload = mapOrderToLogtechPayload(
      makeOrder({
        packages: [
          {
            bag_number: '1111',
            description: 'Chocolats',
            weight: 1.5,
            dimensions: '22×11×33 cm',
            package_type: 'isotherme-s',
            fragile: true,
            perishable: true,
            goods_photo_url: 'user/photo.jpg',
          },
        ],
      }),
      { pickupAddress: 'Quai de chargement, 1201 Genève' },
    );

    const description = payload.order.shipments[0]!.description ?? '';
    expect(description).toContain('Sac isotherme S');
    expect(description).toContain('Chocolats');
    expect(description).toContain('Très fragile');
    expect(description).toContain('Produits frais / périssables');
    expect(description).toContain('Photo jointe');
  });

  it("envoie l'assurance une seule fois, pour la commande complète", () => {
    const payload = mapOrderToLogtechPayload(
      makeOrder({ declared_value_chf: 6000, extra_insurance: true }),
      { pickupAddress: 'Quai de chargement, 1201 Genève' },
    );

    const insuranceNotes =
      payload.order.notes?.filter((note) => note.note.startsWith('Valeur déclarée')) ?? [];
    expect(insuranceNotes).toHaveLength(1);
    expect(insuranceNotes[0]!.note).toBe(
      'Valeur déclarée de la commande : 6000 CHF — Assurance complémentaire',
    );
    for (const shipment of payload.order.shipments) {
      expect(shipment.description).not.toContain('Valeur');
      expect(shipment.description).not.toContain('Assurance');
    }
  });

  it('ajoute un lien vers la photo dans les notes quand un lien complet est fourni', () => {
    const order = makeOrder();
    const payload = mapOrderToLogtechPayload(
      makeOrder({
        packages: [
          { ...order.packages[0]!, goods_photo_url: 'https://exemple.ch/photo.jpg?token=abc' },
          { ...order.packages[1]!, goods_photo_url: 'user/photo-interne.jpg' },
        ],
      }),
      { pickupAddress: 'Quai de chargement, 1201 Genève' },
    );

    const photoNotes = payload.order.notes?.filter((note) => note.note.startsWith('Photo du colis')) ?? [];
    expect(photoNotes).toHaveLength(1);
    expect(photoNotes[0]!.note).toBe('Photo du colis (sac 9999) : https://exemple.ch/photo.jpg?token=abc');
  });

  it("écrit l'étage et le type d'accès en clair", () => {
    const withCode = mapOrderToLogtechPayload(
      makeOrder({ floor: '3e', access_type: 'code', access_detail: '1234' }),
      { pickupAddress: 'Quai de chargement, 1201 Genève' },
    );
    const codeDescription = withCode.order.stops[1]!.contactPerson ?? '';
    expect(codeDescription).toContain('Étage : 3e');
    expect(codeDescription).toContain("Code d'accès : 1234");
    expect(codeDescription).not.toContain('(code)');

    const free = mapOrderToLogtechPayload(makeOrder(), {
      pickupAddress: 'Quai de chargement, 1201 Genève',
    });
    expect(free.order.stops[1]!.contactPerson).toContain('Accès libre');
  });

  it("n'invente pas de prix 50 CHF quand le tarif n'est pas calculé", () => {
    const payload = mapOrderToLogtechPayload(makeOrder({ price_chf: null }), {
      pickupAddress: 'Quai de chargement, 1201 Genève',
    });

    expect(payload.order.billingRecord.invoiceAmountWithoutVat).toBeUndefined();
    expect(payload.order.notes?.some((note) => note.note.includes('Prix non calculé'))).toBe(true);
  });
});
