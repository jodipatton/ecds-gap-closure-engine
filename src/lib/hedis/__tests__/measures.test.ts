import { describe, expect, it } from 'vitest';
import { getMeasure } from '../measures';
import { claim, condition, ctx, documentRef, medication, member, observation, MY } from './fixtures';

const m = (id: string) => {
  const spec = getMeasure(id);
  if (!spec) throw new Error(`measure ${id} not registered`);
  return spec;
};

describe('BCS — breast cancer screening', () => {
  const woman62 = member({ birthDate: `${MY - 62}-03-01` });
  it('eligibility: women 50–74 continuously enrolled', () => {
    expect(m('BCS').isEligible(ctx(woman62))).toBe(true);
    expect(m('BCS').isEligible(ctx(member({ sex: 'M', birthDate: `${MY - 62}-03-01` })))).toBe(false);
    expect(m('BCS').isEligible(ctx(member({ birthDate: `${MY - 45}-03-01` })))).toBe(false);
  });
  it('excludes active bilateral mastectomy', () => {
    const c = ctx(woman62, { conditions: [condition(woman62.id, { icd10: 'Z90.13' })] });
    expect(m('BCS').isExcluded(c)).toBe(true);
    expect(m('BCS').isExcluded(ctx(woman62))).toBe(false);
  });
  it('closes on a mammogram claim in MY or prior year', () => {
    const c = ctx(woman62, { claims: [claim(woman62.id, { procedureCodes: ['77067'] })] });
    expect(m('BCS').satisfiedByClaims(c).ok).toBe(true);
    expect(m('BCS').satisfiedByClaims(ctx(woman62)).ok).toBe(false);
  });
});

describe('COL — colorectal cancer screening', () => {
  const adult60 = member({ birthDate: `${MY - 60}-03-01` });
  it('closes on a colonoscopy claim within the 10-year lookback', () => {
    const c = ctx(adult60, {
      claims: [claim(adult60.id, { procedureCodes: ['45378'], serviceDate: `${MY - 7}-05-01` })]
    });
    expect(m('COL').satisfiedByClaims(c).ok).toBe(true);
  });
  it('clinical pass accepts a colonoscopy DocumentReference, else flags a document gap', () => {
    const withDoc = ctx(adult60, { documents: [documentRef(adult60.id)] });
    expect(m('COL').satisfiedByClinical(withDoc).ok).toBe(true);
    const without = m('COL').satisfiedByClinical(ctx(adult60));
    expect(without.ok).toBe(false);
    expect(without.missing?.kind).toBe('document');
  });
});

describe('CIS — childhood immunization combo 10', () => {
  const two = member({ birthDate: `${MY - 2}-03-01` });
  it('only 2-year-olds are eligible', () => {
    expect(m('CIS').isEligible(ctx(two))).toBe(true);
    expect(m('CIS').isEligible(ctx(member({ birthDate: `${MY - 5}-03-01` })))).toBe(false);
  });
  it('needs all 10 antigen series; missing ones flag an immunization gap', () => {
    const all = ['20', '10', '03', '48', '08', '21', '133', '83', '116', '88'];
    const closed = ctx(two, {
      claims: all.map((cvx) => claim(two.id, { procedureCodes: [cvx], serviceDate: `${MY - 1}-06-01` }))
    });
    expect(m('CIS').satisfiedByClaims(closed).ok).toBe(true);
    const partial = ctx(two, { claims: [claim(two.id, { procedureCodes: ['20'] })] });
    expect(m('CIS').satisfiedByClaims(partial).ok).toBe(false);
    expect(m('CIS').satisfiedByClinical(partial).missing?.kind).toBe('immunization');
  });
});

describe('WCV — well-care visits', () => {
  const teen = member({ birthDate: `${MY - 15}-03-01` });
  it('closes on a well-visit claim in MY', () => {
    const c = ctx(teen, { claims: [claim(teen.id, { procedureCodes: ['99394'] })] });
    expect(m('WCV').satisfiedByClaims(c).ok).toBe(true);
    expect(m('WCV').satisfiedByClaims(ctx(teen)).ok).toBe(false);
  });
});

describe('HBD — A1c control for diabetes', () => {
  const diabetic = member({ birthDate: `${MY - 55}-03-01` });
  const dxClaims = [
    claim(diabetic.id, { diagnosisCodes: ['E11.9'] }),
    claim(diabetic.id, { diagnosisCodes: ['E11.9'] })
  ];
  it('eligibility needs two diabetes dx claims', () => {
    expect(m('HBD').isEligible(ctx(diabetic, { claims: dxClaims }))).toBe(true);
    expect(m('HBD').isEligible(ctx(diabetic, { claims: [dxClaims[0]] }))).toBe(false);
  });
  it('closes clinically on A1c < 8.0, stays open on ≥ 8.0, flags observation gap when absent', () => {
    const good = ctx(diabetic, {
      claims: dxClaims,
      observations: [observation(diabetic.id, { valueQuantity: { value: 7.2, unit: '%' } })]
    });
    expect(m('HBD').satisfiedByClinical(good).ok).toBe(true);
    const high = ctx(diabetic, {
      claims: dxClaims,
      observations: [observation(diabetic.id, { valueQuantity: { value: 9.1, unit: '%' } })]
    });
    expect(m('HBD').satisfiedByClinical(high).ok).toBe(false);
    const none = m('HBD').satisfiedByClinical(ctx(diabetic, { claims: dxClaims }));
    expect(none.missing?.kind).toBe('observation');
  });
});

describe('CBP — controlling high blood pressure', () => {
  const htn = member({ birthDate: `${MY - 60}-03-01` });
  const dxClaims = [
    claim(htn.id, { diagnosisCodes: ['I10'] }),
    claim(htn.id, { diagnosisCodes: ['I10'] })
  ];
  it('closes on most recent BP < 140/90', () => {
    const good = ctx(htn, {
      claims: dxClaims,
      observations: [
        observation(htn.id, { loinc: '8480-6', valueQuantity: { value: 124, unit: 'mmHg' } }),
        observation(htn.id, { loinc: '8462-4', valueQuantity: { value: 78, unit: 'mmHg' } })
      ]
    });
    expect(m('CBP').satisfiedByClinical(good).ok).toBe(true);
    const missing = m('CBP').satisfiedByClinical(ctx(htn, { claims: dxClaims }));
    expect(missing.ok).toBe(false);
    expect(missing.missing?.kind).toBe('observation');
  });
});

describe('DSF-E — depression screening', () => {
  const adult = member({ birthDate: `${MY - 30}-03-01` });
  it('closes on a PHQ observation in MY', () => {
    const c = ctx(adult, { observations: [observation(adult.id, { loinc: '44249-1' })] });
    expect(m('DSF-E').satisfiedByClinical(c).ok).toBe(true);
    expect(m('DSF-E').satisfiedByClinical(ctx(adult)).missing?.kind).toBe('observation');
  });
});

describe('AMM — antidepressant medication management', () => {
  const depressed = member({ birthDate: `${MY - 40}-03-01` });
  const base = {
    claims: [claim(depressed.id, { diagnosisCodes: ['F32.9'] })]
  };
  it('closes at ≥84 days supply, flags a medication gap below', () => {
    const enough = ctx(depressed, { ...base, medications: [medication(depressed.id, { daysSupply: 90 })] });
    expect(m('AMM').satisfiedByClinical(enough).ok).toBe(true);
    const short = ctx(depressed, { ...base, medications: [medication(depressed.id, { daysSupply: 30 })] });
    const r = m('AMM').satisfiedByClinical(short);
    expect(r.ok).toBe(false);
    expect(r.missing?.kind).toBe('medication');
  });
});

describe('FUM — follow-up after ED visit for mental illness', () => {
  const patient = member({ birthDate: `${MY - 25}-03-01` });
  const ed = claim(patient.id, {
    placeOfService: '23',
    diagnosisCodes: ['F32.9'],
    procedureCodes: ['99284'],
    serviceDate: `${MY}-04-10`
  });
  it('closes on a follow-up visit within 30 days', () => {
    const followed = ctx(patient, {
      claims: [ed, claim(patient.id, { diagnosisCodes: ['F32.9'], procedureCodes: ['90834'], serviceDate: `${MY}-04-25` })]
    });
    expect(m('FUM').satisfiedByClaims(followed).ok).toBe(true);
    const late = ctx(patient, {
      claims: [ed, claim(patient.id, { diagnosisCodes: ['F32.9'], procedureCodes: ['90834'], serviceDate: `${MY}-06-25` })]
    });
    expect(m('FUM').satisfiedByClaims(late).ok).toBe(false);
  });
  it('clinical pass accepts a discharge summary, else flags a document gap', () => {
    const withDoc = ctx(patient, { claims: [ed], documents: [documentRef(patient.id, { loincType: '18842-5' })] });
    expect(m('FUM').satisfiedByClinical(withDoc).ok).toBe(true);
    expect(m('FUM').satisfiedByClinical(ctx(patient, { claims: [ed] })).missing?.kind).toBe('document');
  });
});

describe('PND-E — postpartum care', () => {
  const mother = member({ birthDate: `${MY - 30}-03-01` });
  const delivery = claim(mother.id, { procedureCodes: ['59400'], serviceDate: `${MY}-05-01` });
  it('closes on a postpartum visit 7–84 days after delivery', () => {
    const good = ctx(mother, {
      claims: [delivery, claim(mother.id, { procedureCodes: ['0503F'], serviceDate: `${MY}-06-12` })]
    });
    expect(m('PND-E').satisfiedByClaims(good).ok).toBe(true);
    const tooSoon = ctx(mother, {
      claims: [delivery, claim(mother.id, { procedureCodes: ['0503F'], serviceDate: `${MY}-05-03` })]
    });
    expect(m('PND-E').satisfiedByClaims(tooSoon).ok).toBe(false);
  });
  it('clinical pass flags a document gap without the postpartum note', () => {
    expect(m('PND-E').satisfiedByClinical(ctx(mother, { claims: [delivery] })).missing?.kind).toBe('document');
  });
});
