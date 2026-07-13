import { supabase } from '../lib/supabase';

type StatusChangeKind = 'order_status' | 'payment_status';

type NotifyStatusChangeInput = {
  orderId: string;
  kind: StatusChangeKind;
  oldStatus: string;
  newStatus: string;
  oldLabel: string;
  newLabel: string;
};

function getActorDisplayName(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
} | null) {
  const metadata = user?.user_metadata || {};
  const fullName = [metadata.full_name, metadata.name]
    .find((value) => typeof value === 'string' && value.trim().length > 0);

  if (typeof fullName === 'string') return fullName.trim();
  if (user?.email) return user.email;
  return 'Administrateur';
}

function buildStatusChangeContent(input: NotifyStatusChangeInput, actorName: string) {
  const shortOrderId = `#${input.orderId.slice(0, 8)}`;
  if (input.kind === 'payment_status') {
    return `${actorName} a modifie le statut paiement de la commande ${shortOrderId} de ${input.oldLabel} a ${input.newLabel}.`;
  }

  return `${actorName} a change le statut de la commande ${shortOrderId} de ${input.oldLabel} a ${input.newLabel}.`;
}

export async function notifyOrderStatusChange(input: NotifyStatusChangeInput) {
  if (input.oldStatus === input.newStatus) return;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const actorName = getActorDisplayName(user);

  const { error } = await supabase.from('notifications').insert({
    type: input.kind === 'payment_status' ? 'payment_status_changed' : 'order_status_changed',
    title: input.kind === 'payment_status' ? 'Statut paiement modifie' : 'Statut commande modifie',
    content: buildStatusChangeContent(input, actorName),
    recipient_email: 'admin@sphere-office.com',
    is_read: false,
    metadata: {
      order_id: input.orderId,
      change_kind: input.kind,
      old_status: input.oldStatus,
      new_status: input.newStatus,
      old_label: input.oldLabel,
      new_label: input.newLabel,
      actor_id: user?.id ?? null,
      actor_email: user?.email ?? null,
      actor_name: actorName,
      changed_at: new Date().toISOString(),
    },
  });

  if (error) throw error;
}
