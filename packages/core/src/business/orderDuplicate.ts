import type { Order, PackageItem } from '../types';
import type { OrderFormData } from '../schemas/order';
import { PICKUP_OTHER_VALUE } from '../types/enums';

/** Colis d'une commande (format actuel ou ancien « un seul colis ») */
export function getOrderPackages(order: Order): PackageItem[] {
  if (order.packages?.length) {
    return order.packages;
  }

  return [
    {
      bag_number: null,
      description: '',
      weight: order.weight ?? 0,
      dimensions: order.dimensions ?? null,
      fragile: order.fragile ?? false,
      perishable: order.perishable ?? false,
      declared_value_chf: order.declared_value_chf ?? null,
      extra_insurance: order.extra_insurance ?? false,
      goods_photo_url: order.goods_photo_url ?? null,
    },
  ];
}

/**
 * Transforme une commande existante en brouillon de formulaire.
 * La date, le créneau, le n° de sac et la photo ne sont pas recopiés :
 * l'employé doit les resaisir pour la nouvelle livraison.
 */
export function orderToFormDraft(order: Order, basePriceChf = 25): OrderFormData {
  const packages = getOrderPackages(order).map((pkg) => ({
    bag_number: '',
    description: pkg.description ?? '',
    weight: pkg.weight && pkg.weight > 0 ? pkg.weight : undefined,
    dimensions: pkg.dimensions ?? '',
    fragile: pkg.fragile ?? false,
    perishable: pkg.perishable ?? false,
    value_over_1000:
      pkg.declared_value_chf != null && Number(pkg.declared_value_chf) >= 1000,
    declared_value_chf: pkg.declared_value_chf ?? undefined,
    extra_insurance: pkg.extra_insurance ?? false,
    goods_photo_url: '',
  }));

  const pickup_location_id = order.pickup_address_custom
    ? PICKUP_OTHER_VALUE
    : (order.pickup_location_id ?? '');

  return {
    pickup_location_id,
    pickup_address_custom: order.pickup_address_custom ?? '',
    delivery_address: order.delivery_address,
    access_type: order.access_type,
    access_detail: order.access_detail ?? '',
    is_hotel: order.is_hotel,
    is_villa_or_arcade: order.is_villa_or_arcade,
    hotel_name: order.hotel_name ?? '',
    hotel_room_number: order.hotel_room_number ?? '',
    floor: order.floor ?? '',
    client_name: order.client_name ?? '',
    client_phone: order.client_phone ?? '',
    requested_date: '',
    requested_time_slot: '',
    time_slot_notes: order.time_slot_notes ?? '',
    leave_at_door: order.leave_at_door,
    special_instructions: order.special_instructions ?? '',
    packages: packages as OrderFormData['packages'],
    price_chf: basePriceChf,
  };
}
