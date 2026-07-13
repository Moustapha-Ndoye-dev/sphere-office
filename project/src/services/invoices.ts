import { supabase } from '../lib/supabase';

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Session introuvable');
  }

  return session.access_token;
}

export async function downloadInvoicePdf(orderId: string) {
  const accessToken = await getAccessToken();
  const response = await fetch(`/api/invoices/pdf?orderId=${encodeURIComponent(orderId)}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    let errorMessage = `Erreur lors de la generation du PDF (${response.status})`;

    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        errorMessage = payload.error;
      }
    } catch {
      // Ignore invalid JSON errors and keep the fallback message.
    }

    throw new Error(errorMessage);
  }

  const pdfBlob = await response.blob();
  const fileUrl = window.URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = fileUrl;
  link.download = `facture-${orderId.slice(0, 8)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(fileUrl);
}
