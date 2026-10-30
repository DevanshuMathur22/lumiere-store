import { z } from 'zod';
import { db } from '@/lib/db';
import { requireUser,sameOrigin,readJson,errorResponse } from '@/lib/security';
import { rateLimit } from '@/lib/rate-limit';
const schema=z.object({subject:z.string().trim().min(5).max(120),body:z.string().trim().min(10).max(5000)});
export async function POST(request:Request){try{sameOrigin(request);const user=await requireUser();await rateLimit(user.id,'support',5);const input=schema.parse(await readJson(request));const ticket=await db().supportTicket.create({data:{...input,userId:user.id}});return Response.json({id:ticket.id},{status:201});}catch(e){return errorResponse(e);}}
