import type { Order } from '../types';

/** Données minimales pour créer une course dans Logtech */
export interface LogtechOrderPayload {
  externalRef: string;
  pickupAddress: string;
  deliveryAddress: string;
  requestedDate?: string | null;
  requestedTimeSlot?: string | null;
  clientName?: string | null;
  clientPhone?: string | null;
  specialInstructions?: string | null;
}

/** Réponse attendue de l'API Logtech (future) */
export interface LogtechOrderResponse {
  logtechRef: string;
  status: string;
}

/**
 * Interface pour l'intégration future avec Logtech.
 * TODO: Implémenter quand l'API Logtech sera disponible.
 */
export interface LogtechClient {
  /** Envoie une commande vers Logtech */
  createOrder(order: Order, pickupAddress: string): Promise<LogtechOrderResponse>;
  /** Récupère le statut d'une commande Logtech */
  getOrderStatus(logtechRef: string): Promise<string>;
  /** Annule une commande dans Logtech */
  cancelOrder(logtechRef: string): Promise<void>;
}

/**
 * Implémentation stub — ne fait rien, retourne des valeurs factices.
 * À remplacer par l'implémentation réelle.
 */
export class StubLogtechClient implements LogtechClient {
  async createOrder(order: Order, _pickupAddress: string): Promise<LogtechOrderResponse> {
    console.warn('[LogtechClient] Stub: createOrder appelé — intégration non implémentée');
    return {
      logtechRef: `STUB-${order.id}`,
      status: 'pending',
    };
  }

  async getOrderStatus(logtechRef: string): Promise<string> {
    console.warn('[LogtechClient] Stub: getOrderStatus appelé — intégration non implémentée');
    return `stub-status-${logtechRef}`;
  }

  async cancelOrder(logtechRef: string): Promise<void> {
    console.warn('[LogtechClient] Stub: cancelOrder appelé — intégration non implémentée', logtechRef);
  }
}

/** Instance par défaut du client Logtech stub */
export const logtechClient: LogtechClient = new StubLogtechClient();
