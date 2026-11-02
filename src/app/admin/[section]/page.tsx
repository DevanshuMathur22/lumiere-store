import Link from 'next/link';
import { sections,sectionTable,type Section } from '@/modules/admin/service';
import { notFound } from 'next/navigation';
import { AdminActions } from '@/components/admin-actions';
import { AdminCatalogOperations } from '@/components/admin-catalog-operations';
import { AdminWarehouseManager } from '@/components/admin-warehouse-manager';
import { AdminProductManager } from '@/components/admin-product-manager';
const titles:Record<Section,string>={products:'The product collection.',inventory:'A place for every piece.',orders:'Every order, in view.',customers:'The people behind the orders.',crm:'Customer care, considered.',analytics:'The bigger picture.',staff:'The people in your studio.'};
export default async function AdminSection({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!sections.includes(section as Section))notFound();const data=await sectionTable(section as Section);return <><div className="admin-title"><div><span className="eyebrow">THE STUDIO · {section}</span><h1>{titles[section as Section]}</h1></div></div>{data.demo&&<div className="notice">Read-only preview · Sample records. No real customer or operational data is shown.</div>}<div className="panel table-wrap"><table><thead><tr>{data.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{data.rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j} className={j===0?'table-name':undefined}>{cell}</td>)}</tr>)}</tbody></table>{!data.rows.length&&<p className="empty-state">No records yet.</p>}</div>{section==='products'&&<AdminProductManager demo={data.demo}/>} {section==='products'&&<AdminCatalogOperations demo={data.demo}/>} {section==='inventory'&&<AdminWarehouseManager demo={data.demo}/>} {section==='crm'&&(
  <div className="panel" style={{
    marginTop:24,
    padding:25,
    display:'flex',
    justifyContent:'space-between',
    alignItems:'center',
    flexWrap:'wrap',
    gap:18
  }}>
    <div>
      <h2 style={{marginBottom:8}}>Support Desk</h2>
      <p>Manage customer tickets, conversations and status updates.</p>
    </div>
    <Link href="/admin/support" className="button">
      Open Support Desk
    </Link>
  </div>
)}
<AdminActions section={section} demo={data.demo}/></>;}
