// Shared code catalogs (illustrative; not licensed NCQA value sets).
// Single source for both the measure logic and the synthetic-data seed, so
// what the seed generates and what the engine looks for can never drift.

export const CODES = {
  // Mammography (BCS)
  mammogram_cpt: ['77067', '77066', '77065'],
  mammogram_hcpcs: ['G0202', 'G0204', 'G0206'],
  mastectomy_icd10: ['Z90.13'],

  // Colorectal screening (COL)
  fobt_fit_cpt: ['82270', '82274'],
  fit_dna_cpt: ['81528'],
  flex_sig_cpt: ['45330', '45331', '45332', '45333', '45334', '45335'],
  colonoscopy_cpt: ['45378', '45380', '45385', '45388', '45398'],
  ct_colonography_cpt: ['74263'],
  colonoscopy_report_loinc: '34117-2',

  // Diabetes (HBD)
  diabetes_icd10: ['E10.9', 'E11.9', 'E11.65', 'E13.9'],
  diabetes_dx_prefixes: ['E10', 'E11', 'E13'],
  a1c_loinc: '4548-4',

  // Hypertension (CBP)
  hypertension_icd10: ['I10', 'I11.9', 'I12.9', 'I13.10', 'I15.9'],
  htn_dx_prefixes: ['I10', 'I11', 'I12', 'I13', 'I15', 'I16'],
  bp_sys_loinc: '8480-6',
  bp_dia_loinc: '8462-4',

  // Depression screening (DSF-E)
  phq9_loinc: ['44249-1', '44261-6'], // PHQ-9 & PHQ-2 panels (seeded)
  phq_screening_loinc: ['44249-1', '44261-6', '55758-7'], // accepted by the measure
  positive_depression_icd10: ['F32.9', 'F33.0'],
  antidepressants_rxnorm: ['sertraline', 'escitalopram', 'fluoxetine', 'duloxetine'],

  // Follow-up after ED for mental illness (FUM)
  ed_visit_pos: '23',
  mental_illness_icd10: ['F20.9', 'F31.9', 'F32.9', 'F33.0', 'F41.9', 'F43.10'],
  mental_illness_dx_prefixes: [
    'F20', 'F21', 'F22', 'F23', 'F25', 'F30', 'F31', 'F32', 'F33', 'F34',
    'F40', 'F41', 'F42', 'F43', 'F44', 'F45', 'F60'
  ],
  followup_visit_cpt: ['90832', '90834', '90837', '99213', '99214'],
  discharge_summary_loinc: '18842-5',

  // Prenatal & postpartum (PND-E)
  prenatal_visit_cpt: ['99201', '99202', '99203', '99204', '99205', '0500F'],
  pregnancy_icd10: ['Z34.00', 'Z34.80', 'Z34.90', 'O09.90'],
  delivery_cpt: ['59400', '59409', '59410', '59510', '59514', '59515'],
  postpartum_visit_cpt: ['0503F', '99213', '99214', '57170'],
  postpartum_note_loinc: '57133-1',

  // AMM (antidepressant medication management)
  amm_diagnosis_icd10: ['F32.0', 'F32.1', 'F32.2', 'F32.9', 'F33.0', 'F33.1', 'F33.2'],
  mdd_dx_prefixes: ['F32', 'F33'],

  // WCV (well-care visit)
  well_visit_cpt: ['99381', '99382', '99383', '99384', '99385', '99391', '99392', '99393', '99394', '99395'],

  // Childhood Immunization Status (CIS) — CVX codes
  cvx: {
    DTaP: ['20'],
    IPV: ['10'],
    MMR: ['03'],
    HiB: ['48', '49', '50', '51'],
    HepB: ['08'],
    VZV: ['21'],
    PCV: ['133'],
    HepA: ['83'],
    Rotavirus: ['116', '119'],
    Influenza: ['88', '141', '150', '155']
  } as Record<string, readonly string[]>
};
