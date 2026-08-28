import { describe, it, expect } from 'vitest';
import { orderToFormDraft, getOrderPackages } from './orderDuplicate';
import type { Order } from '../types';
import { PICKUP_OTHER_VALUE } from '../types/enums';

function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'abc-123',
    pickup_location_id: 'pickup-1',
    pickup_address_custom: null,
    delivery_address: 'Rue Example 12, 1200 Genève',
    access_type: 'acces_libre',
    access_detail: null,
    is_hotel: false,
    is_villa_or_arcade: false,
    hotel_name: null,
    hotel_room_number: null,
    floor: '2',
    client_name: 'Jean Dupont',
    client_phone: '+41791234567',
    requested_date: '2026-08-20',
    requested_time_slot: '14:00-16:00',
    time_slot_notes: 'Sonner deux fois',
    leave_at_door: false,
    special_instructions: 'Fragile',
    packages: [
      {
        bag_number: 'SAC-99',
        description: 'Cadeau',
        weight: 3,
        dimensions: '30×20×15 cm',
        fragile: true,
        perishable: false,
        declared_value_chf: null,
        extra_insurance: false,
        goods_photo_url: 'user/photo.jpg',
      },
    ],
    status: 'livree',
    price_chf: 25,
    created_by: 'user-1',
    created_at: '2026-08-19T10:00:00Z',
    updated_at: '2026-08-19T10:00:00Z',
    logtech_ref: 'ref-1',
    ...overrides,
  };
}

describe('orderToFormDraft', () => {
  it('recopie adresse, client et colis sans date ni n° de sac', () => {
    const draft = orderToFormDraft(makeOrder());

    expect(draft.client_name).toBe('Jean Dupont');
    expect(draft.delivery_address).toBe('Rue Example 12, 1200 Genève');
    expect(draft.requested_date).toBe('');
    expect(draft.requested_time_slot).toBe('');
    expect(draft.packages[0].bag_number).toBe('');
    expect(draft.packages[0].weight).toBe(3);
    expect(draft.packages[0].fragile).toBe(true);
    expect(draft.packages[0].goods_photo_url).toBe('');
  });

  it('utilise le lieu « Autres » quand une adresse custom est enregistrée', () => {
    const draft = orderToFormDraft(
      makeOrder({
        pickup_location_id: null,
        pickup_address_custom: 'Entrepôt B',
      }),
    );

    expect(draft.pickup_location_id).toBe(PICKUP_OTHER_VALUE);
    expect(draft.pickup_address_custom).toBe('Entrepôt B');
  });

  it('reconstruit un colis unique pour les anciennes commandes', () => {
    const packages = getOrderPackages(
      makeOrder({
        packages: [],
        weight: 5,
        fragile: true,
        dimensions: '10×10×10 cm',
      }),
    );

    expect(packages).toHaveLength(1);
    expect(packages[0].weight).toBe(5);
  });
});
