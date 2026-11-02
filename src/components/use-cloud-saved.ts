'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSiteToast } from './site-toast';

export type SavedCartLine = {
  variantId: string;
  quantity: number;
};

type Kind = 'cart' | 'wishlist';
type Items = SavedCartLine[] | string[];
type Mutation = Record<string, unknown>;

const api = '/api/customer/saved';

function valid(kind: Kind, input: unknown): Items {
  if (!Array.isArray(input)) return [];
  if (kind === 'wishlist') {
    return [...new Set(input.filter(
      (x): x is string =>
        typeof x === 'string' && x.length > 0 && x.length <= 150
    ))].slice(0, 100);
  }
  const result: SavedCartLine[] = [];
  for (const item of input) {
    if (
      item && typeof item === 'object' &&
      typeof item.variantId === 'string' &&
      item.variantId.length > 0 &&
      item.variantId.length <= 100 &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 10 &&
      !result.some(x => x.variantId === item.variantId)
    ) {
      result.push({
        variantId: item.variantId,
        quantity: item.quantity
      });
    }
    if (result.length >= 40) break;
  }
  return result;
}

export function useCloudSaved<T extends Items>(kind: Kind) {
  const { notify } = useSiteToast();
  const storage = `lumiere-${kind}-v1`;
  const ownerStorage = `lumiere-${kind}-cloud-owner`;
  const pendingStorage = `lumiere-${kind}-pending-v1`;
  const guestStorage = `lumiere-${kind}-guest-v1`;
  const accountPending = (id: string) =>
    `${pendingStorage}-${id}`;

  const [items, setItems] = useState<T>([] as unknown as T);
  const [ready, setReady] = useState(false);
  const [cloud, setCloud] = useState(false);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const owner = useRef<string | null>(null);
  const current = useRef<T>([] as unknown as T);
  const pending = useRef<Mutation[]>([]);

  const update = useCallback((next: T) => {
    current.current = next;
    setItems(next);
    try {
      localStorage.setItem(storage, JSON.stringify(next));
      if (!owner.current) {
        localStorage.setItem(guestStorage, JSON.stringify(next));
      }
    } catch {}
  }, [storage, guestStorage]);

  const request = useCallback(async (
    action: Mutation
  ): Promise<Record<string, unknown>> => {
    const response = await fetch(api, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        action.action === 'merge'
          ? action
          : { ...action, expectedUserId: owner.current }
      )
    });
    if (!response.ok) {
      throw new Error(`Cloud save failed (${response.status})`);
    }
    return response.json();
  }, []);

  const persistPending = useCallback(() => {
    try {
      if (!owner.current) return;
      localStorage.setItem(
        accountPending(owner.current),
        JSON.stringify(pending.current)
      );
    } catch {}
  }, [pendingStorage]);

  const flush = useCallback(async () => {
    while (pending.current.length && owner.current) {
      await request(pending.current[0]);
      pending.current.shift();
      persistPending();
    }
  }, [request, persistPending]);

  const mutate = useCallback((action: Mutation) => {
    if (!owner.current) return;
    pending.current.push(action);
    persistPending();
    queue.current = queue.current
      .catch(() => {})
      .then(flush)
      .catch(() => {
        notify('Cloud save failed. Changes will retry next time.');
      });
  }, [flush, persistPending, notify]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      let local: T = [] as unknown as T;
      let previousOwner: string | null = null;
      let guest: T = [] as unknown as T;

      try {
        local = valid(kind, JSON.parse(
          localStorage.getItem(storage) || '[]'
        )) as T;
        previousOwner = localStorage.getItem(ownerStorage);
        guest = valid(
          kind,
          JSON.parse(localStorage.getItem(guestStorage) || '[]')
        ) as T;
      } catch {}

      try {
        const response = await fetch(api, {
          credentials: 'same-origin',
          cache: 'no-store'
        });

        if (response.status === 401 || response.status === 503) {
          if (!cancelled) {
            owner.current = null;
            setCloud(false);
            update((guest.length ? guest : previousOwner ? [] : local) as T);
            setReady(true);
          }
          return;
        }

        if (!response.ok) throw new Error('Cloud read failed');

        let data = await response.json();
        if (typeof data.userId !== 'string' || !data.userId) {
          throw new Error('Invalid account response');
        }

        const userId: string = data.userId;

        const recover = previousOwner === userId;
        const guestItems = guest.length
          ? guest
          : !previousOwner ? local : [];
        const mergeInput = {
          action: 'merge',
          cart: kind === 'cart' ? guestItems : [],
          wishlist: kind === 'wishlist' ? guestItems : []
        };

        if (guestItems.length) data = await request(mergeInput);

        let storedPending: Mutation[] = [];
        if (recover) {
          try {
            const value = JSON.parse(
              localStorage.getItem(accountPending(userId)) || '[]'
            );
            if (Array.isArray(value)) storedPending = value.slice(0, 150);
          } catch {}
        }

        if (cancelled) return;

        owner.current = userId;
        localStorage.setItem(ownerStorage, userId);
        pending.current = storedPending;
        persistPending();
        if (guestItems.length) {
          localStorage.removeItem(guestStorage);
        }

        const serverItems = valid(kind, data[kind]) as T;
        update(storedPending.length ? local : serverItems);
        setCloud(true);
        setReady(true);

        if (storedPending.length) {
          queue.current = queue.current
            .catch(() => {})
            .then(flush)
            .catch(() =>
              notify('Cloud sync pending. Changes will retry next time.')
            );
        }
      } catch {
        if (!cancelled) {
          update(local);
          setReady(true);
          notify('Cloud sync unavailable. Saved items kept on this device.');
        }
      }
    }

    initialize();
    return () => { cancelled = true; };
  }, [kind, storage, ownerStorage, pendingStorage, guestStorage,
      update, request, flush, persistPending, notify]);

  useEffect(() => {
    if (!ready) return;
    let checking = false;
    let active = true;

    async function checkAccount() {
      if (checking || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const response = await fetch(api, {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!response.ok && response.status !== 401) return;
        const data = response.ok ? await response.json() : null;
        if (!active) return;
        const serverOwner = typeof data?.userId === 'string'
          ? data.userId : null;
        if (serverOwner !== owner.current) {
          window.location.reload();
        } else if (serverOwner && pending.current.length) {
          queue.current = queue.current
            .catch(() => {})
            .then(flush)
            .catch(() => {
              notify('Cloud sync pending. Retry when connected.');
            });
        }
      } catch {
      } finally {
        checking = false;
      }
    }

    window.addEventListener('focus', checkAccount);
    window.addEventListener('online', checkAccount);
    document.addEventListener('visibilitychange', checkAccount);
    return () => {
      active = false;
      window.removeEventListener('focus', checkAccount);
      window.removeEventListener('online', checkAccount);
      document.removeEventListener('visibilitychange', checkAccount);
    };
  }, [ready, flush, notify]);

  return { items, ready, cloud, update, mutate };
}
