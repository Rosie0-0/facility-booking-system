import { useState } from 'react'

const VENUES = [
  'Classroom', 'Level 5 (Foyer) — max 13 groups', 'Lecture Theatre (LT)',
  'Multipurpose Hall (MPH)', 'Rooftop', 'Other',
]

const EQUIPMENT = [
  'Backdrop', 'Banquet Chairs', 'Plastic Chairs', 'Sofa', 'Chair Covers',
  "Banquet Table (6')", 'Classroom Table', 'Cocktail Table', 'Round Table (Small)',
  'Round Table (Big)', 'Coffee Table', 'Table Cloth', 'Audio Cable', 'Ext. Wire',
  'PA System (MPH/LT only)', 'Mobile White Board', 'Loud Hailer', 'Mic. Stand',
  'Microphone / Cordless Mic', 'Mobile Speakers', 'Musical Instruments (Guitar/Keyboard)',
  'Mobile Board (A4/A3)', 'Mobile Velvet Board (Red)', 'Plant', 'Projector Screen',
  'Rostrum', 'Flip Charts', 'TV with Stand',
]

const RULES = [
  'All event activities forms with approval must be submitted to AFM 2 weeks before the event/activities date.',
  'A fine of RM100 will be imposed if any of the tools/equipment used were not declared.',
  'Events that involve games need to attach the game description.',
  'Last-minute requisition / changes of event date / additional items during setup will not be entertained.',
  'A detailed floor plan needs to be attached if requesting AFM support to set up your event.',
  'Kindly clear and reset the venues to the original setup after the event.',
  'Any event after 6pm on weekdays, or on weekends/public holidays, must include a supervisor / event PIC (IICP staff only).',
  'All equipment/items requested must be returned to IICP in good working condition; any damage/lost is charged at full repair/replacement price.',
  'Venue availability is subject to RTP and AFM approval.',
]

const empty = {
  event_name: '', event_date: '', department: '', subject_code: '',
  venue: '', venue_room: '', venue_other: '',
  start_datetime: '', end_datetime: '', setup_datetime: '', clearing_datetime: '',
  floor_plan: false, external_party: '', participants: '',
  equipment: {}, other_equipment: '', own_appliances: '',
  van_name: '', van_dest: '', van_pax: '', van_pickup: '', van_pickup_time: '', van_dropoff: '', van_dropoff_time: '',
  carpark_name: '', carpark_plate: '', carpark_date: '', carpark_time: '',
  pic_name: '', pic_contact: '', pic_department: '',
  remarks: '', agreed: false,
}

export default function EventRequestForm({ user, minEventDate, submitting, error, onSubmit }) {
  const [f, setF] = useState({
    ...empty,
    requester_name: user?.full_name || '',
    requester_contact: user?.phone || '',
  })
  const [localError, setLocalError] = useState('')

  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }))
  const setEquip = (item, qty) => setF(prev => ({ ...prev, equipment: { ...prev.equipment, [item]: qty } }))
  const minDT = `${minEventDate}T00:00`

  function submit() {
    setLocalError('')
    if (!f.event_name.trim())  return setLocalError('Please enter the name of the event.')
    if (!f.venue)              return setLocalError('Please select a venue.')
    if (!f.start_datetime)     return setLocalError('Please enter the event start date & time.')
    if (!f.end_datetime)       return setLocalError('Please enter the event end date & time.')
    if (f.end_datetime <= f.start_datetime) return setLocalError('Event end must be after the start.')
    if (!f.participants)       return setLocalError('Please enter the number of participants.')
    if (!f.agreed)             return setLocalError('You must agree to the rules and regulations.')

    // strip empty equipment entries
    const equipment = Object.fromEntries(
      Object.entries(f.equipment).filter(([, q]) => q && Number(q) > 0)
    )
    onSubmit({ ...f, equipment,
      requester_email: user?.campus_email,
      venue_full: f.venue === 'Classroom' ? `Classroom — ${f.venue_room}` : f.venue === 'Other' ? `Other — ${f.venue_other}` : f.venue,
    })
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-8">
      <div>
        <h3 className="text-lg font-bold text-gray-900">AFM Logistic Requisition Form</h3>
        <p className="text-xs text-gray-500 mt-1">
          Complete this application for your Event Area booking. It will be reviewed by the AFM admin.
        </p>
      </div>

      {/* Part A */}
      <Section title="Part A — Event Details">
        <Grid2>
          <RO label="Requester Name" value={f.requester_name} onChange={v => set('requester_name', v)} editable />
          <RO label="Contact No" value={f.requester_contact} onChange={v => set('requester_contact', v)} editable />
        </Grid2>
        <RO label="Email" value={user?.campus_email} />
        <Grid2>
          <Text label="Name of the Event *" value={f.event_name} onChange={v => set('event_name', v)} />
          <Text label="Date of the Event" type="date" value={f.event_date} onChange={v => set('event_date', v)} />
        </Grid2>
        <Grid2>
          <Text label="Department / School" value={f.department} onChange={v => set('department', v)} />
          <Text label="Subject Code (if applicable)" value={f.subject_code} onChange={v => set('subject_code', v)} />
        </Grid2>

        {/* Venue */}
        <div>
          <label className="text-xs text-gray-500 font-medium block mb-2">Venue *</label>
          <div className="space-y-2">
            {VENUES.map(v => (
              <label key={v} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="radio" name="venue" checked={f.venue === v} onChange={() => set('venue', v)} className="accent-red-600" />
                {v}
              </label>
            ))}
          </div>
          {f.venue === 'Classroom' && (
            <Text label="Please indicate the room" value={f.venue_room} onChange={v => set('venue_room', v)} className="mt-2" />
          )}
          {f.venue === 'Other' && (
            <Text label="Other location" value={f.venue_other} onChange={v => set('venue_other', v)} className="mt-2" />
          )}
        </div>

        <Grid2>
          <Text label="Event Start (Date & Time) *" type="datetime-local" min={minDT} value={f.start_datetime} onChange={v => set('start_datetime', v)} />
          <Text label="Event End (Date & Time) *" type="datetime-local" min={f.start_datetime || minDT} value={f.end_datetime} onChange={v => set('end_datetime', v)} />
        </Grid2>
        <Grid2>
          <Text label="Event Setup (Date & Time)" type="datetime-local" value={f.setup_datetime} onChange={v => set('setup_datetime', v)} />
          <Text label="Event Clearing (Date & Time)" type="datetime-local" value={f.clearing_datetime} onChange={v => set('clearing_datetime', v)} />
        </Grid2>
        <Grid2>
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="floor_plan" checked={f.floor_plan} onChange={e => set('floor_plan', e.target.checked)} className="w-4 h-4 accent-red-600" />
            <label htmlFor="floor_plan" className="text-sm text-gray-700">Floor plan will be attached / provided</label>
          </div>
          <Text label="Number of Participants *" type="number" value={f.participants} onChange={v => set('participants', v)} />
        </Grid2>
        <Text label="External Party Involved? (if yes, please indicate)" value={f.external_party} onChange={v => set('external_party', v)} />
      </Section>

      {/* Part B */}
      <Section title="Part B — Item / Logistic Required">
        <p className="text-xs text-gray-500 mb-2">Tick the quantity needed for each item.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {EQUIPMENT.map(item => (
            <div key={item} className="flex items-center justify-between gap-2 border border-gray-100 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-700">{item}</span>
              <input
                type="number" min="0" placeholder="0"
                value={f.equipment[item] || ''}
                onChange={e => setEquip(item, e.target.value)}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          ))}
        </div>
        <Text label="Other Equipment" value={f.other_equipment} onChange={v => set('other_equipment', v)} className="mt-3" />
        <Text label="Bringing your own electrical appliances / equipment? (if yes, please specify)" value={f.own_appliances} onChange={v => set('own_appliances', v)} className="mt-3" />
      </Section>

      {/* Van + car park (campus event only) */}
      <Section title="Van Service Reservation (campus event only — subject to availability)">
        <Grid2>
          <Text label="Name" value={f.van_name} onChange={v => set('van_name', v)} />
          <Text label="Destination" value={f.van_dest} onChange={v => set('van_dest', v)} />
        </Grid2>
        <Grid2>
          <Text label="No. of Pax" type="number" value={f.van_pax} onChange={v => set('van_pax', v)} />
          <Text label="Pick Up Time" type="datetime-local" value={f.van_pickup_time} onChange={v => set('van_pickup_time', v)} />
        </Grid2>
      </Section>

      <Section title="Car Park Reservation (subject to availability)">
        <Grid2>
          <Text label="Name" value={f.carpark_name} onChange={v => set('carpark_name', v)} />
          <Text label="Car Plate No." value={f.carpark_plate} onChange={v => set('carpark_plate', v)} />
        </Grid2>
        <Grid2>
          <Text label="Date" type="date" value={f.carpark_date} onChange={v => set('carpark_date', v)} />
          <Text label="Time" type="time" value={f.carpark_time} onChange={v => set('carpark_time', v)} />
        </Grid2>
      </Section>

      {/* PIC */}
      <Section title="Event Supervisor / Person In Charge (PIC)">
        <p className="text-xs text-gray-500 mb-2">Required for events after 6pm on weekdays, or weekends/public holidays (IICP staff only).</p>
        <Grid2>
          <Text label="PIC Name" value={f.pic_name} onChange={v => set('pic_name', v)} />
          <Text label="PIC Contact No." value={f.pic_contact} onChange={v => set('pic_contact', v)} />
        </Grid2>
        <Text label="Department / School / Programme / Club" value={f.pic_department} onChange={v => set('pic_department', v)} />
        <Text label="Remarks / Additional Request" value={f.remarks} onChange={v => set('remarks', v)} />
      </Section>

      {/* Rules */}
      <Section title="Rules & Regulations">
        <ol className="list-decimal list-inside space-y-2 text-xs text-gray-600">
          {RULES.map((r, i) => <li key={i}>{r}</li>)}
        </ol>
        <label className="flex items-center gap-2 mt-4 text-sm text-gray-800">
          <input type="checkbox" checked={f.agreed} onChange={e => set('agreed', e.target.checked)} className="w-4 h-4 accent-red-600" />
          I hereby agree with all the rules and regulations as stated.
        </label>
      </Section>

      {(localError || error) && <p className="text-red-600 text-sm">{localError || error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg text-sm transition disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="font-semibold text-gray-900 border-b border-gray-100 pb-2 mb-4">{title}</h4>
      <div className="space-y-4">{children}</div>
    </div>
  )
}
function Grid2({ children }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
}
function Text({ label, value, onChange, type = 'text', min, className = '' }) {
  return (
    <div className={className}>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      <input
        type={type} min={min} value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
      />
    </div>
  )
}
// read-only (optionally editable) auto-filled field
function RO({ label, value, onChange, editable }) {
  return (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
      {editable ? (
        <input
          value={value} onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      ) : (
        <p className="text-sm font-medium text-gray-900 py-2">{value || '—'}</p>
      )}
    </div>
  )
}
