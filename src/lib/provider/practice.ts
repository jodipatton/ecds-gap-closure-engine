// The provider portal represents ONE mocked practice (no practice switcher).
// Within that practice we synthesize a small roster of individual clinicians
// and deterministically attribute each panel member to one of them, so the
// portal can answer "for the members seeing Dr. X, here are the gaps."

import { repos } from '@/lib/data/repository';
import type { ProviderOrg } from '@/lib/data/types';

export interface Clinician {
  id: string;
  name: string;
  specialty: string;
}

const FIRST = ['Dr. Aisha', 'Dr. Marcus', 'Dr. Lena', 'Dr. Raj', 'Dr. Sofia', 'Dr. Daniel'];
const LAST = ['Okafor', 'Bennett', 'Petrova', 'Nair', 'Alvarez', 'Cohen'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// The mocked practice = the largest-panel organization in the directory.
export async function getPractice(): Promise<ProviderOrg | null> {
  const providers = await repos.providers.list();
  if (providers.length === 0) return null;
  return [...providers].sort((a, b) => b.memberCount - a.memberCount)[0];
}

// Deterministic clinician roster for a practice (5 individuals).
export function practiceClinicians(practice: ProviderOrg): Clinician[] {
  const base = hash(practice.npi);
  const specialties =
    practice.specialty === 'Pediatrics'
      ? ['Pediatrics', 'Pediatrics', 'Adolescent Medicine']
      : practice.specialty === 'Obstetrics & Gynecology'
        ? ['Obstetrics & Gynecology', 'Obstetrics & Gynecology', 'Maternal-Fetal Medicine']
        : ['Family Medicine', 'Internal Medicine', 'Family Medicine', 'Geriatrics'];
  return Array.from({ length: 5 }, (_, i) => {
    const f = FIRST[(base + i) % FIRST.length];
    const l = LAST[(base + i * 7) % LAST.length];
    return {
      id: `${practice.npi}-C${i + 1}`,
      name: `${f} ${l}`,
      specialty: specialties[i % specialties.length]
    };
  });
}

export function clinicianForMember(memberId: string, clinicians: Clinician[]): Clinician {
  return clinicians[hash(memberId) % clinicians.length];
}
