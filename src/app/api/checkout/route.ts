import { requireUser, sameOrigin, readJson, errorResponse } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
import { prepareCheckout } from '@/modules/checkout/service';
export async function POST(request: Request) { try { sameOrigin(request); const user = await requireUser(); await rateLimit(user.id, 'checkout', 8); return Response.json(await prepareCheckout(user.id, await readJson(request))); } catch (e) { return errorResponse(e); } }
