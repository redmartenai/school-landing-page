/** Geometry of the Greenfield tower, in metres. Origin = centre of the tower footprint at ground level. */
import type { RoomStatus } from '@/engine/campus'

export const H = 3.6 // floor to floor
export const SLAB = 0.32
export const W = 24 // tower width (x)
export const ROOM_BACK = -5.5 // back wall z
export const ROOM_FRONT = 2.2 // classroom glass wall z
export const EDGE = 5.4 // corridor balustrade z
export const CORE = 2.4 // half width of the lift/stair core
export const ROOM_W = W / 2 - CORE // 9.6
export const LEVELS = 8 // 0 = ground … 7 = principal's floor; roof garden above
export const LIFT_GAP = 13 // how far floors above a focused floor rise

export type RoomKind = 'class' | 'cafeteria' | 'staff' | 'library' | 'lab' | 'principal' | 'conference'
export interface RoomDef { id: string; kind: RoomKind; label: string; level: number; side: -1 | 1; roomNo: string }

const CLASS_LEVEL: Record<string, number> = { '6A': 1, '6B': 1, '7A': 2, '7B': 2, '8A': 3, '8B': 3, '9A': 4, '9B': 4, '10A': 5, '10B': 5 }

export const ROOMS: RoomDef[] = [
  { id: 'cafeteria', kind: 'cafeteria', label: 'Cafeteria & Reception', level: 0, side: -1, roomNo: 'G01' },
  { id: 'staff', kind: 'staff', label: 'Staff room', level: 0, side: 1, roomNo: 'G02' },
  ...Object.entries(CLASS_LEVEL).map(([id, level]): RoomDef => ({ id, kind: 'class', label: `Class ${id}`, level, side: id.endsWith('A') ? -1 : 1, roomNo: `${level}0${id.endsWith('A') ? 1 : 2}` })),
  { id: 'library', kind: 'library', label: 'Library', level: 6, side: -1, roomNo: '601' },
  { id: 'lab', kind: 'lab', label: 'Computer Lab', level: 6, side: 1, roomNo: '602' },
  { id: 'principal', kind: 'principal', label: 'Principal’s office', level: 7, side: -1, roomNo: '701' },
  { id: 'conference', kind: 'conference', label: 'Conference room', level: 7, side: 1, roomNo: '702' },
]

export const FLOOR_NAMES = ['Ground', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Library & Lab', 'Leadership']

export const roomX = (side: -1 | 1) => side * (CORE + ROOM_W / 2)

/** Field, bus bay and road placement */
export const FIELD = { x: 40, z: -4, w: 34, d: 22 }
export const PLAZA_Z = 9
export const BAY_Z = 15.5
export const ROAD_Z = 23
export const BUS_LEN = 10.2
export const BUS_SLOTS = [-21.6, -10.8, 0, 10.8, 21.6]

/* ───────── palette (from AfterOn.html) ───────── */

export const C = {
  ink: '#241F1B', charcoal: '#332F29', charcoal2: '#4A443C', stone: '#8B8377', stoneL: '#B6AFA3', stoneP: '#DCD6CB',
  ivory: '#F8F5EF', ivory2: '#FDFCF8', paper: '#F0EBE2', forest: '#2E5D4E', forestL: '#417A66', forestP: '#E4EDE9',
  copper: '#B4763A', copperL: '#D19A5C', copperP: '#F7EDE0', slate: '#4E5A66', slateL: '#7C8894', amber: '#E0A53F', rust: '#A4483A',
  oak: '#D9C3A0', oakDark: '#B99A72', concrete: '#E7E0D3', concreteDark: '#CFC6B6', lawn: '#B9C4A2', lawnDark: '#9DAE86', field: '#9FB58A',
  track: '#B9694A', asphalt: '#45403A', glass: '#CFE0E6', bus: '#E3A93C', board: '#2B4A40',
}

export const STATUS_META: Record<RoomStatus, { label: string; color: string; glow: string; tone: 'forest' | 'copper' | 'rust' | 'slate' | 'amber' | 'stone'; alarm?: boolean }> = {
  teaching: { label: 'Teaching', color: C.forestL, glow: '#7FC4A4', tone: 'forest' },
  substitute: { label: 'Substitute', color: C.copper, glow: '#F2B36B', tone: 'copper' },
  uncovered: { label: 'No teacher', color: C.rust, glow: '#FF6B52', tone: 'rust', alarm: true },
  'teacher-late': { label: 'Teacher not in', color: C.rust, glow: '#FF8A5C', tone: 'rust', alarm: true },
  playground: { label: 'On the field', color: C.slateL, glow: '#BFD3E6', tone: 'slate' },
  library: { label: 'In the library', color: C.slateL, glow: '#BFD3E6', tone: 'slate' },
  lab: { label: 'In the lab', color: C.slateL, glow: '#BFD3E6', tone: 'slate' },
  break: { label: 'Break', color: C.stoneL, glow: '#F3E7D2', tone: 'stone' },
  before: { label: 'Before school', color: C.stoneL, glow: '#F3E7D2', tone: 'stone' },
  after: { label: 'School’s out', color: C.stoneL, glow: '#F3E7D2', tone: 'stone' },
}

export const HOUSE_COLOR: Record<string, string> = { Willow: '#3F7462', Banyan: '#B07438', Cedar: '#4E5A66', Neem: '#C49A3E' }
export const SKIN = ['#EBC9A6', '#DDB089', '#C99467', '#AE7650', '#8D5D3D']

/* ───────── the wider campus ───────── */

export const BLOCKS = {
  science: { x: -47, z: -4, w: 30, d: 12, floors: 3 },
  junior: { x: -52, z: -44, w: 30, d: 13, floors: 2 },
  playground: { x: -52, z: -24 },
  auditorium: { x: 0, z: -46, r: 15 },
  arena: { x: 46, z: -46, w: 36, d: 22 },
  garden: { x: 0, z: -21 },
  courts: { x: 82, z: -4 },
  parking: { x: -84, z: 6 },
  gate: { x: -36, z: 19.6 },
  turbine: { x: 88, z: -44 },
  flag: { x: -17, z: 12.5 },
}

export interface PlaceDef { id: string; label: string; eyebrow: string; cam: [number, number, number, number, number, number] }
/** Camera shots for every block — position xyz, then target xyz. */
export const PLACES: Record<string, PlaceDef> = {
  campus: { id: 'campus', label: 'Whole campus', eyebrow: 'Greenfield School', cam: [104, 104, 160, -22, 0, -20] },
  tower: { id: 'tower', label: 'Academic Tower', eyebrow: 'Block A · 8 floors', cam: [58, 30, 86, -7, 10, 4] },
  science: { id: 'science', label: 'Science Block', eyebrow: 'Block B · 3 labs', cam: [-26, 13, 34, -48, 4, -3] },
  junior: { id: 'junior', label: 'Junior Wing', eyebrow: 'Block C · Grades 1–5', cam: [-28, 26, 8, -52, 2, -34] },
  arena: { id: 'arena', label: 'Aquatic & Sports Arena', eyebrow: 'Block D', cam: [66, 34, -14, 46, 0, -46] },
  auditorium: { id: 'auditorium', label: 'Auditorium', eyebrow: 'Block E · 420 seats', cam: [16, 30, -16, 0, 2, -46] },
  garden: { id: 'garden', label: 'Fountain garden', eyebrow: 'Between the blocks', cam: [14, 14, -6, 0, 1, -21] },
  field: { id: 'field', label: 'Sports field', eyebrow: 'Football & athletics', cam: [34, 16, 26, 40, 0, -4] },
  courts: { id: 'courts', label: 'Basketball courts', eyebrow: 'Two full courts', cam: [96, 18, 18, 82, 0, -4] },
  gate: { id: 'gate', label: 'Main gate & drop-off', eyebrow: 'Security & parking', cam: [-34, 26, 58, -54, 0, 14] },
}
