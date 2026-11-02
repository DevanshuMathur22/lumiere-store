import { z } from 'zod';
import { db } from '@/lib/db';
import {
  requireUser,
  sameOrigin,
  errorResponse,
  readJson,
  HttpError
} from '@/lib/security';

const variantId = z.string().min(1).max(100);
const slug = z.string().min(1).max(150);
const cartLine = z.object({
  variantId,
  quantity: z.number().int().min(1).max(10)
});

const expectedUserId = z.string().min(1).max(100);

const mutation = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('merge'),
    cart: z.array(cartLine).max(40),
    wishlist: z.array(slug).max(100)
  }),
  z.object({
    expectedUserId: expectedUserId.optional(),
    action: z.literal('cart.set'),
    variantId,
    quantity: z.number().int().min(0).max(10)
  }),
  z.object({
    expectedUserId: expectedUserId.optional(),
    action: z.literal('cart.clear')
  }),
  z.object({
    expectedUserId: expectedUserId.optional(),
    action: z.literal('wishlist.add'),
    slug
  }),
  z.object({
    expectedUserId: expectedUserId.optional(),
    action: z.literal('wishlist.remove'),
    slug
  })
]);

async function readSaved(userId: string) {
  const [cart, wishlist] = await Promise.all([
    db().savedCartItem.findMany({
      where: { userId },
      select: { variantId: true, quantity: true },
      orderBy: { createdAt: 'asc' }
    }),
    db().savedWishlistItem.findMany({
      where: { userId },
      select: { slug: true },
      orderBy: { createdAt: 'asc' }
    })
  ]);
  return { userId, cart, wishlist: wishlist.map(item => item.slug) };
}

export async function GET() {
  try {
    const user = await requireUser();
    return Response.json(await readSaved(user.id), {
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
    const input = mutation.parse(await readJson(request));

    if (
      'expectedUserId' in input &&
      input.expectedUserId !== undefined &&
      input.expectedUserId !== user.id
    ) {
      throw new HttpError(409, 'Account changed. Please refresh.');
    }

    if (input.action === 'cart.set') {
      if (input.quantity === 0) {
        await db().savedCartItem.deleteMany({
          where: { userId: user.id, variantId: input.variantId }
        });
      } else {
        const variant = await db().productVariant.findUnique({
          where: { id: input.variantId },
          select: { id: true }
        });
        if (!variant) {
          throw new HttpError(400, 'Product variant not found.');
        }

        const exists = await db().savedCartItem.findUnique({
          where: {
            userId_variantId: {
              userId: user.id,
              variantId: input.variantId
            }
          }
        });

        if (!exists) {
          const count = await db().savedCartItem.count({
            where: { userId: user.id }
          });
          if (count >= 40) {
            throw new HttpError(400, 'Shopping bag limit reached.');
          }
        }

        await db().savedCartItem.upsert({
          where: {
            userId_variantId: {
              userId: user.id,
              variantId: input.variantId
            }
          },
          create: {
            userId: user.id,
            variantId: input.variantId,
            quantity: input.quantity
          },
          update: { quantity: input.quantity }
        });
      }
    }

    if (input.action === 'cart.clear') {
      await db().savedCartItem.deleteMany({
        where: { userId: user.id }
      });
    }

    if (input.action === 'wishlist.add') {
      const exists = await db().savedWishlistItem.findUnique({
        where: {
          userId_slug: { userId: user.id, slug: input.slug }
        }
      });

      if (!exists) {
        const count = await db().savedWishlistItem.count({
          where: { userId: user.id }
        });
        if (count >= 100) {
          throw new HttpError(400, 'Wishlist limit reached.');
        }
      }

      await db().savedWishlistItem.upsert({
        where: {
          userId_slug: { userId: user.id, slug: input.slug }
        },
        create: { userId: user.id, slug: input.slug },
        update: {}
      });
    }

    if (input.action === 'wishlist.remove') {
      await db().savedWishlistItem.deleteMany({
        where: { userId: user.id, slug: input.slug }
      });
    }

    if (input.action === 'merge') {
      const validVariants = await db().productVariant.findMany({
        where: {
          id: { in: input.cart.map(item => item.variantId) }
        },
        select: { id: true }
      });
      const valid = new Set(validVariants.map(item => item.id));

      await db().$transaction(async tx => {
        const [existingCart, existingWishlist] = await Promise.all([
          tx.savedCartItem.findMany({
            where: { userId: user.id },
            select: { variantId: true, quantity: true }
          }),
          tx.savedWishlistItem.findMany({
            where: { userId: user.id },
            select: { slug: true }
          })
        ]);

        const cartIds = new Set(existingCart.map(item => item.variantId));
        const wishlistSlugs = new Set(existingWishlist.map(item => item.slug));

        for (const item of input.cart) {
          if (!valid.has(item.variantId)) continue;
          const existing = existingCart.find(
            row => row.variantId === item.variantId
          );
          if (existing) continue;
          if (cartIds.size >= 40) break;

          await tx.savedCartItem.create({
            data: {
              userId: user.id,
              variantId: item.variantId,
              quantity: item.quantity
            }
          });
          cartIds.add(item.variantId);
        }

        for (const item of input.wishlist) {
          if (wishlistSlugs.has(item)) continue;
          if (wishlistSlugs.size >= 100) break;

          await tx.savedWishlistItem.create({
            data: { userId: user.id, slug: item }
          });
          wishlistSlugs.add(item);
        }
      });
    }

    return Response.json(await readSaved(user.id), {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
