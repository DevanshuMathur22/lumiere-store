import { requireUser, errorResponse } from '@/lib/security';

export async function GET(request: Request) {
  try {
    await requireUser();
    const pin = new URL(request.url).searchParams.get('pin') || '';
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      return Response.json({ error: 'Invalid PIN code' }, { status: 400 });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(
        `https://api.postalpincode.in/pincode/${pin}`,
        { signal: controller.signal, cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Postal lookup failed');

      const body = await response.json();
      const first = Array.isArray(body) ? body[0] : null;
      const offices = first?.Status === 'Success' &&
        Array.isArray(first.PostOffice) ? first.PostOffice : [];

      const locations = [...new Set(
        offices.map((office: { Name?: string }) => office.Name)
          .filter((name: unknown): name is string =>
            typeof name === 'string' && name.length > 0)
      )].slice(0, 100);

      return Response.json({
        state: offices[0]?.State || '',
        district: offices[0]?.District || '',
        locations
      }, {
        headers: { 'Cache-Control': 'private, max-age=3600' }
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return Response.json(
        { error: 'Lookup timed out' }, { status: 504 }
      );
    }
    return errorResponse(error);
  }
}
