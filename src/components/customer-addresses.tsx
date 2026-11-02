'use client';

import { useCallback, useEffect, useState } from 'react';

type Address = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  addressType: string;
  isDefault: boolean;
  building: string | null;
  floor: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};
type Values = Omit<Address, 'id' | 'country' | 'isDefault'>;

const blank: Values = {
  name: '', phone: '', line1: '', line2: '',
  addressType: 'HOME', building: '', floor: '',
  city: '', state: '', postalCode: ''
};
const rajasthanCities = ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur", "Sikar", "Pali", "Bhilwara", "Chittorgarh", "Jhunjhunu", "Nagaur", "Tonk", "Barmer", "Jaisalmer", "Hanumangarh", "Sri Ganganagar", "Dausa", "Dholpur", "Baran", "Bundi", "Sawai Madhopur", "Churu", "Beawar", "Kishangarh", "Pushkar", "Abu Road", "Mount Abu", "Neemrana"];

const indianStates = ["Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"];

const fields = [
  ['name', 'Full name'],
  ['phone', 'Mobile number'],
  ['line1', 'Street address'],
  ['line2', 'Area / Landmark (optional)'],
  ['building', 'Building / Society'],
  ['floor', 'Floor Number'],
  ['city', 'City'],
  ['state', 'State'],
  ['postalCode', 'PIN code']
] as const;

export function CustomerAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [values, setValues] = useState<Values>(blank);
  const [pinLocations, setPinLocations] = useState<string[]>([]);
  const [pinMessage, setPinMessage] = useState('');
  const [pinBusy, setPinBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/customer/addresses', {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Unable to load addresses.');
    const data = await response.json();
    setAddresses(data.addresses);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch(() => {
      if (active) setError('Unable to load saved addresses.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [load]);


  useEffect(() => {
    const pin = values.postalCode;
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPinLocations([]);
      setPinMessage('');
      setPinBusy(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setPinBusy(true);
      setPinMessage('');
      try {
        const response = await fetch(
          `/api/customer/pincode?pin=${encodeURIComponent(pin)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Lookup unavailable');
        const data = await response.json();
        if (controller.signal.aborted) return;

        const places: string[] = Array.isArray(data.locations)
          ? data.locations.filter(
              (x: unknown): x is string => typeof x === 'string'
            )
          : [];

        setPinLocations(places);

        if (data.state || data.district) {
          setValues(old => old.postalCode !== pin ? old : ({
            ...old,
            state: data.state || old.state,
            city: data.district || old.city
          }));
          setPinMessage('Location found. Select your locality or edit manually.');
        } else {
          setPinMessage('PIN not found. Enter city and state manually.');
        }
      } catch {
        if (!controller.signal.aborted)
          setPinMessage('PIN lookup unavailable. Manual entry is allowed.');
      } finally {
        if (!controller.signal.aborted) setPinBusy(false);
      }
    }, 450);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [values.postalCode]);

  async function request(method: 'POST' | 'PATCH' | 'DELETE' | 'PUT',
                         data: Record<string, unknown>) {
    const response = await fetch('/api/customer/addresses', {
      method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Request failed.');
    return result;
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request(editing ? 'PATCH' : 'POST',
        editing ? { ...values, id: editing } : { ...values });
      await load();
      setEditing(null);
      setValues(blank);
      setMessage('Address saved successfully.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save address.');
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('PUT', { id });
      await load();
      setMessage('Default delivery address updated.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to set default.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy || !window.confirm('Delete this saved address?')) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await request('DELETE', { id });
      await load();
      if (editing === id) {
        setEditing(null);
        setValues(blank);
      }
      setMessage('Address deleted.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to delete address.');
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(a: Address) {
    setEditing(a.id);
    setValues({
      name: a.name, phone: a.phone,
      line1: a.line1, line2: a.line2 || '',
      addressType: a.addressType || 'HOME',
      building: a.building || '',
      floor: a.floor || '',
      city: a.city, state: a.state,
      postalCode: a.postalCode
    });
    setError('');
    setMessage('');
    document.getElementById('address-form')?.scrollIntoView({
      behavior: 'smooth'
    });
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%', padding: '13px',
    border: '1px solid #cfc9bd',
    borderRadius: 5,
    fontFamily: 'Arial, sans-serif',
    fontSize: 15
  };

  return (
    <div style={{display:'grid',gap:24}}>
      {error && <p role="alert" className="notice error">{error}</p>}
      {message && <p role="status" className="notice">{message}</p>}

      <section>
        <h2 style={{marginBottom:20}}>My Addresses</h2>
        {loading ? <p>Loading addresses…</p> :
          addresses.length === 0 ? <p>No addresses saved yet.</p> :
          <div style={{display:'grid',gap:14}}>
            {addresses.map(a => (
              <article key={a.id} style={{
                border:'1px solid #d9d3c9',borderRadius:10,
                padding:23,display:'grid',gap:12
              }}>
                <strong>
                  {a.name} · {a.addressType || 'HOME'}
                  {a.isDefault && ' · ✓ DEFAULT'}
                </strong>
                <p>{a.line1}{a.line2 ? `, ${a.line2}` : ''}<br/>
                  {a.city}, {a.state} — {a.postalCode}<br/>
                  India · {a.phone}
                </p>
                <div style={{display:'flex',gap:18,flexWrap:'wrap'}}>
                  {!a.isDefault && (
                    <button type="button" className="text-link"
                      disabled={busy} onClick={() => makeDefault(a.id)}>
                      Set as Default
                    </button>
                  )}
                  <button type="button" className="text-link"
                    disabled={busy} onClick={() => beginEdit(a)}>
                    Edit address
                  </button>
                  <button type="button" className="text-link"
                    disabled={busy} onClick={() => remove(a.id)}>
                    Delete address
                  </button>
                </div>
              </article>
            ))}
          </div>
        }
      </section>

      <form id="address-form" onSubmit={save} style={{
        display:'grid',gap:20,padding:25,
        border:'1px solid #d9d3c9',borderRadius:10
      }}>
        <h2>{editing ? 'Edit Address' : 'Add New Address'}</h2>
        <fieldset style={{border:0,padding:0}}>
          <legend style={{marginBottom:12}}>Address Type</legend>
          <div style={{display:'flex',gap:20,flexWrap:'wrap'}}>
            {(['HOME','OFFICE','OTHER'] as const).map(type => (
              <label key={type} style={{cursor:'pointer'}}>
                <input type="radio" name="addressType"
                  checked={values.addressType===type}
                  onChange={()=>setValues(v=>({...v,addressType:type}))}/>
                {' '}{type === 'HOME' ? 'Home' :
                  type === 'OFFICE' ? 'Office' : 'Other'}
              </label>
            ))}
          </div>
        </fieldset>
        <div style={{
          display:'grid',
          gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',
          gap:16
        }}>
          {fields.map(([field,label]) => (
            <label key={field} style={{display:'grid',gap:8,
              fontFamily:'Arial, sans-serif',fontSize:14}}>
              {label}
              <input
                style={fieldStyle}
                required={field !== 'line2'}
                list={field === 'state' ? 'india-states' :
                  field === 'city' ? 'india-cities' : undefined}
                value={values[field] || ''}
                maxLength={field === 'phone' ? 10 :
                  field === 'postalCode' ? 6 : 200}
                inputMode={field === 'phone' || field === 'postalCode'
                  ? 'numeric' : 'text'}
                onChange={e => setValues(old => ({
                  ...old, [field]: e.target.value
                }))}
              />
            </label>
          ))}
          <datalist id="india-states">
            {indianStates.map(state => (
              <option key={state} value={state}/>
            ))}
          </datalist>
          <datalist id="india-cities">
            {[...new Set([
              ...pinLocations,
              ...(values.state.trim().toLowerCase() === 'rajasthan'
                ? rajasthanCities : [])
            ])].map(place => (
              <option key={place} value={place}/>
            ))}
          </datalist>
        </div>
        {(pinBusy || pinMessage) && (
          <p role="status" style={{
            fontFamily:'Arial, sans-serif',
            fontSize:13,
            color:'#555b43'
          }}>
            {pinBusy ? 'Finding PIN location…' : pinMessage}
          </p>
        )}
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <button className="button" disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Update Address' : 'Save Address'}
          </button>
          {editing && <button className="text-link" type="button"
            onClick={() => { setEditing(null); setValues(blank); }}>
            Cancel edit
          </button>}
        </div>
      </form>
    </div>
  );
}
