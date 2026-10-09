import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/components';
import {
  createOrderFormSchemaWithContext,
  type OrderFormData,
} from '@globus/core/schemas';
import {
  GOODS_PHOTO_EMAIL_SIGNED_URL_TTL_SEC,
  GOODS_PHOTO_LOGTECH_SIGNED_URL_TTL_SEC,
  normalizeGoodsPhotoPath,
  packagesInDisplayOrder,
  quoteDeliveryPrice,
  resolveGoodsPhotoSignedUrl,
} from '@globus/core/business';
import { PICKUP_OTHER_VALUE } from '@globus/core/types';
import type { Order } from '@globus/core/types';
import { getLogtechClient, type LogtechOrderContext } from '@globus/core/integrations';
import {
  getAppSettings,
  getProfile,
  getShowPricingEnabled,
} from '@globus/core/supabase';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { OrderConfirmationEmail } from '@/emails/order-confirmation';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

/** Nombre d'essais d'envoi vers Polypheme avant d'abandonner */
const LOGTECH_MAX_ATTEMPTS = 2;
/** Pause entre deux essais (millisecondes) */
const LOGTECH_RETRY_DELAY_MS = 2000;

/**
 * Remplace le chemin interne de chaque photo par un lien signé, pour que
 * Polypheme puisse l'ouvrir. Si la signature échoue, on garde le chemin
 * d'origine : la commande part quand même, simplement sans lien.
 */
async function withLogtechPhotoUrls(order: Order): Promise<Order> {
  const hasPhoto = (order.packages ?? []).some((pkg) => pkg.goods_photo_url);
  if (!hasPhoto) return order;

  try {
    const serviceClient = createServiceClient();
    const packages = await Promise.all(
      (order.packages ?? []).map(async (pkg) => {
        if (!pkg.goods_photo_url) return pkg;
        const signedUrl = await resolveGoodsPhotoSignedUrl(
          serviceClient,
          pkg.goods_photo_url,
          GOODS_PHOTO_LOGTECH_SIGNED_URL_TTL_SEC,
        );
        return { ...pkg, goods_photo_url: signedUrl ?? pkg.goods_photo_url };
      }),
    );
    return { ...order, packages };
  } catch (photoError) {
    console.error('Logtech photo signing error:', photoError);
    return order;
  }
}

/**
 * Envoie la commande à Polypheme, avec un second essai en cas d'erreur
 * (coupure réseau, serveur momentanément indisponible…).
 */
async function sendOrderToLogtech(
  order: Order,
  context: LogtechOrderContext,
): Promise<{ ok: true; logtechRef: string } | { ok: false; error: string }> {
  const client = getLogtechClient({
    apiKey: process.env.LOGTECH_API_KEY,
    baseUrl: process.env.LOGTECH_API_URL,
  });

  let lastError = '';
  for (let attempt = 1; attempt <= LOGTECH_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await client.createOrder(order, context);
      return { ok: true, logtechRef: result.logtechRef };
    } catch (logtechError) {
      lastError = logtechError instanceof Error ? logtechError.message : String(logtechError);
      console.error(`Logtech createOrder error (essai ${attempt}/${LOGTECH_MAX_ATTEMPTS}):`, logtechError);
      if (attempt < LOGTECH_MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, LOGTECH_RETRY_DELAY_MS));
      }
    }
  }
  return { ok: false, error: lastError };
}

/** Échappe les caractères spéciaux avant d'insérer un texte dans un email HTML */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    }

    const body = (await request.json()) as OrderFormData;
    const [settings, showPricing] = await Promise.all([
      getAppSettings(supabase),
      getShowPricingEnabled(supabase),
    ]);

    const schema = createOrderFormSchemaWithContext({
      operatingHours: settings.operating_hours,
      cutoffs: settings.cutoffs,
      now: new Date(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Validation échouée', errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const isOtherPickup = data.pickup_location_id === PICKUP_OTHER_VALUE;

    // On nettoie chaque colis avant de l'enregistrer (valeurs vides → null)
    const packages = packagesInDisplayOrder(data.packages).map((pkg) => ({
      bag_number: pkg.bag_number?.trim() || null,
      description: pkg.description?.trim() || '',
      weight: pkg.weight,
      dimensions: pkg.dimensions ?? null,
      package_type: pkg.package_type ?? null,
      line_id: pkg.line_id ?? null,
      fragile: pkg.fragile,
      perishable: pkg.perishable,
      goods_photo_url: normalizeGoodsPhotoPath(pkg.goods_photo_url),
    }));

    // Assurance de la commande complète (tous les colis ensemble)
    const declaredValueChf =
      data.value_over_1000 && typeof data.declared_value_chf === 'number'
        ? data.declared_value_chf
        : null;
    const extraInsurance = declaredValueChf != null && data.extra_insurance;

    // Tarif recalculé côté serveur à partir de la grille Vélopostale.
    // On ignore le montant envoyé par le navigateur.
    const serverPriceChf = quoteDeliveryPrice(data.delivery_address, packages, declaredValueChf);

    const orderInsert = {
      pickup_location_id: isOtherPickup ? null : data.pickup_location_id,
      pickup_address_custom: isOtherPickup ? data.pickup_address_custom ?? null : null,
      delivery_address: data.delivery_address,
      access_type: data.access_type,
      access_detail: data.access_detail ?? null,
      is_hotel: data.is_hotel,
      is_villa_or_arcade: data.is_villa_or_arcade,
      hotel_name: data.is_hotel ? data.hotel_name ?? null : null,
      hotel_room_number: data.is_hotel ? data.hotel_room_number ?? null : null,
      floor: data.floor ?? null,
      client_name: data.client_name ?? null,
      client_phone: data.client_phone ?? null,
      requested_date: data.requested_date || null,
      requested_time_slot: data.requested_time_slot || null,
      time_slot_notes: data.time_slot_notes?.trim() || null,
      leave_at_door: data.leave_at_door,
      special_instructions: data.special_instructions ?? null,
      packages,
      declared_value_chf: declaredValueChf,
      extra_insurance: extraInsurance,
      price_chf: serverPriceChf,
      created_by: user.id,
      status: 'created' as const,
    };

    const db = supabase as ReturnType<typeof createServerClient> extends Promise<infer T> ? T : never;

    const { data: orderData, error } = await db
      .from('orders')
      .insert(orderInsert as never)
      .select()
      .single();

    const order = orderData as Order | null;

    if (error || !order) {
      console.error('Order insert error:', error);
      return NextResponse.json({ message: 'Erreur lors de la création' }, { status: 500 });
    }

    const { data: pickupLocations } = await supabase.from('pickup_locations').select('*');
    const locations = pickupLocations ?? [];
    const creator = await getProfile(supabase, user.id);

    // Envoi vers Logtech (staging) + sauvegarde de la référence — Supabase reste en parallèle pour l'instant
    const pickupAddress = isOtherPickup
      ? (data.pickup_address_custom ?? '')
      : (locations.find((loc) => loc.id === data.pickup_location_id)?.label ?? 'Globus Genève');

    // La commande reste enregistrée dans Supabase même si Logtech échoue
    const logtechResult = await sendOrderToLogtech(await withLogtechPhotoUrls(order), {
      pickupAddress,
      orderedBy: creator?.full_name ?? user.email ?? null,
    });
    if (logtechResult.ok) {
      await db
        .from('orders')
        .update({ logtech_ref: logtechResult.logtechRef } as never)
        .eq('id', order.id);
    }

    // Envoi des emails

    const dispatchEmail =
      process.env.DISPATCH_EMAIL ?? 'dispo@coursier.ch';
    const globusEmail =
      process.env.GLOBUS_NOTIFICATION_EMAIL ?? settings.globus_notification_email;
    const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';

    if (process.env.RESEND_API_KEY) {
      const resend = getResend();
      if (!resend) {
        return NextResponse.json({ id: order.id });
      }

      // Alerte : la commande n'est pas arrivée dans Polypheme, il faut la saisir à la main
      if (!logtechResult.ok) {
        const alertHtml = `
          <p><strong>Cette commande n'a pas pu être transmise à Polypheme.</strong></p>
          <p>Elle est bien enregistrée sur le portail Globus, mais doit être saisie manuellement dans Polypheme.
          Le détail complet suit dans l'email « Nouvelle course ».</p>
          <ul>
            <li>N° de commande : ${escapeHtml(order.id)}</li>
            <li>Adresse de livraison : ${escapeHtml(order.delivery_address)}</li>
            <li>Date / créneau : ${escapeHtml(order.requested_date ?? '—')} ${escapeHtml(order.requested_time_slot ?? '')}</li>
            <li>Erreur : ${escapeHtml(logtechResult.error || 'inconnue')}</li>
          </ul>`;
        await resend.emails
          .send({
            from: fromEmail,
            to: [dispatchEmail, globusEmail].filter(Boolean),
            subject: `[Globus] ALERTE : commande non transmise à Polypheme — ${order.delivery_address}`,
            html: alertHtml,
          })
          .catch((alertError) => console.error('Logtech alert email error:', alertError));
      }

      // Liens signés pour les photos dans les emails (destinataires sans compte)
      const serviceClient = createServiceClient();
      const orderForEmail: Order = {
        ...order,
        packages: await Promise.all(
          (order.packages ?? []).map(async (pkg) => ({
            ...pkg,
            goods_photo_url: pkg.goods_photo_url
              ? await resolveGoodsPhotoSignedUrl(
                  serviceClient,
                  pkg.goods_photo_url,
                  GOODS_PHOTO_EMAIL_SIGNED_URL_TTL_SEC,
                )
              : null,
          })),
        ),
      };

      const dispatchHtml = await render(
        OrderConfirmationEmail({
          order: orderForEmail,
          pickupLocations: locations,
          creator,
          recipientType: 'dispatch',
          showPricing,
        }),
      );

      const globusHtml = await render(
        OrderConfirmationEmail({
          order: orderForEmail,
          pickupLocations: locations,
          creator,
          recipientType: 'globus',
          showPricing,
        }),
      );

      await Promise.allSettled([
        resend.emails.send({
          from: fromEmail,
          to: dispatchEmail,
          subject: `[Globus] Nouvelle course — ${order.delivery_address}`,
          html: dispatchHtml,
        }),
        resend.emails.send({
          from: fromEmail,
          to: [globusEmail, user.email!].filter(Boolean),
          subject: `[Globus] Récapitulatif commande — ${order.delivery_address}`,
          html: globusHtml,
        }),
      ]);
    }

    return NextResponse.json({ id: order.id });
  } catch (e) {
    console.error('API orders error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
