import { z } from 'zod';
import { db } from '@/lib/db';
import {
  requireUser, sameOrigin, readJson,
  errorResponse, HttpError
} from '@/lib/security';

const fields = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(/^[6-9][0-9]{9}$/),
  line1: z.string().trim().min(5).max(200),
  line2: z.string().trim().max(200).optional(),
  addressType: z.enum(['HOME','OFFICE','OTHER']).default('HOME'),
  building: z.string().trim().max(150).optional(),
  floor: z.string().trim().max(50).optional(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(100),
  postalCode: z.string().regex(/^[1-9][0-9]{5}$/)
});
const edit = fields.extend({ id: z.string().min(1) });
const remove = z.object({ id: z.string().min(1) });

export async function GET() {
  try {
    const user = await requireUser();
    const addresses = await db().address.findMany({
      where: { userId: user.id },
      orderBy: { id: 'asc' },
      take: 30
    });
    return Response.json({ addresses }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const input = fields.parse(await readJson(request));
    const count = await db().address.count({
      where: { userId: user.id }
    });
    if (count >= 20) throw new HttpError(400, 'Address limit reached.');
    const address = await db().address.create({
      data: { ...input, country: 'IN', userId: user.id, isDefault: count === 0 }
    });
    return Response.json({ address }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { id, ...input } = edit.parse(await readJson(request));
    const result = await db().address.updateMany({
      where: { id, userId: user.id },
      data: { ...input, country: 'IN' }
    });
    if (!result.count) throw new HttpError(404, 'Address not found.');
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const input = remove.parse(await readJson(request));
    const result = await db().address.deleteMany({
      where: { id: input.id, userId: user.id }
    });
    if (!result.count) throw new HttpError(404, 'Address not found.');
    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}


export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireUser();
    const { id } = remove.parse(await readJson(request));

    await db().$transaction(async tx => {
      const target = await tx.address.findFirst({
        where: { id, userId: user.id },
        select: { id: true }
      });
      if (!target) throw new HttpError(404, 'Address not found.');

      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false }
      });
      await tx.address.update({
        where: { id: target.id },
        data: { isDefault: true }
      });
    });

    return Response.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
