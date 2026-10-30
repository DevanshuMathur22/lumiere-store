import { getCatalog } from '@/modules/catalog/repository';
export async function GET() { return Response.json(await getCatalog()); }
