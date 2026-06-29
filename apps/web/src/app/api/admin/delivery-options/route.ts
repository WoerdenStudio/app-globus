import { NextResponse } from 'next/server';
import { getProfile } from '@globus/core/supabase';
import { createServerClient } from '@/lib/supabase/server';

/** Met à jour une option de livraison (admin uniquement, côté serveur) */
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: 'Non authentifié' }, { status: 401 });
    }

    const profile = await getProfile(supabase, user.id);
    if (profile?.role !== 'admin' || !profile.active) {
      return NextResponse.json({ message: 'Accès réservé aux administrateurs' }, { status: 403 });
    }

    const body = (await request.json()) as {
      key?: string;
      label?: string;
      enabled?: boolean;
    };

    if (!body.key) {
      return NextResponse.json({ message: 'Clé d\'option manquante' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('delivery_options_config')
      .update({
        label: body.label,
        enabled: body.enabled,
      })
      .eq('key', body.key)
      .select()
      .single();

    if (error || !data) {
      console.error('delivery_options_config update error:', error);
      return NextResponse.json(
        { message: 'Impossible d\'enregistrer l\'option. Vérifiez vos droits administrateur.' },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error('API admin delivery-options error:', e);
    return NextResponse.json({ message: 'Erreur serveur' }, { status: 500 });
  }
}
