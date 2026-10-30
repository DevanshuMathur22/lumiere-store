import 'server-only';
import { db } from '@/lib/db';
import { HttpError } from './security';
export async function rateLimit(userId:string,action:string,limit=30){const window=new Date(Math.floor(Date.now()/60000)*60000);const key=`${action}:${userId}:${window.toISOString()}`;const value=await db().rateLimit.upsert({where:{key},create:{key,window,count:1},update:{count:{increment:1}}});if(value.count>limit)throw new HttpError(429,'Too many requests. Please wait a minute.');}
