import type { WizardProps } from './ConnectionWizard';

export function epicWizardProps(opts: {
  providerNpi: string;
  defaultFhirBaseUrl?: string;
}): WizardProps {
  return {
    providerNpi: opts.providerNpi,
    brandName: 'Epic',
    brandHeadline: 'We detected your practice runs Epic. Connect in 3 steps.',
    brandAccentClass: 'bg-red-50 border-red-200',
    brandBadgeClass: 'bg-red-100 text-red-700',
    authMethodLabel: 'SMART Backend Services · OAuth2 client_credentials JWT',
    scopes: [
      'system/Patient.read',
      'system/Observation.read',
      'system/Condition.read',
      'system/MedicationRequest.read',
      'system/Procedure.read',
      'system/DocumentReference.read',
      'system/Encounter.read'
    ],
    defaultFhirBaseUrl: opts.defaultFhirBaseUrl,
    steps: [
      {
        title: 'Register the app in the Epic Connection Hub',
        body: (
          <>
            <p>Your IT admin signs in to the Epic Connection Hub and registers this application. Upload the public key — Epic supports the JWK Set URL approach (mandatory by May 2026).</p>
            <p className="mt-2 text-xs"><strong>Pre-generated JWKS URL:</strong> <code className="bg-white px-1 rounded">https://ecds-gap-closure-engine.vercel.app/.well-known/jwks.json</code> <em className="text-slate-500">(illustrative — generated per-tenant in production)</em></p>
          </>
        ),
        externalLink: { label: 'Open Epic Connection Hub', href: 'https://connectionhub.epic.com' }
      },
      {
        title: 'Enter your organization\'s FHIR base URL',
        body: <p>The app will hit <code className="bg-white px-1 rounded">/metadata</code> at this URL to confirm it responds and parse the CapabilityStatement.</p>,
        fields: [
          {
            name: 'fhirBaseUrl',
            label: 'FHIR base URL',
            placeholder: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4/',
            type: 'url',
            defaultValue: opts.defaultFhirBaseUrl,
            helper: 'The base URL of your Epic FHIR R4 endpoint. The token endpoint is derived as <baseUrl>/oauth2/token.'
          }
        ]
      },
      {
        title: 'Test the connection',
        body: <p>The app signs a JWT with its private key, exchanges it at Epic\'s token endpoint, and pulls a test Patient resource to confirm end-to-end success.</p>,
        fields: [
          {
            name: 'clientId',
            label: 'Client ID (issued by Epic on app registration)',
            placeholder: 'a1b2c3d4-...',
            defaultValue: '',
            helper: 'Leave blank to use a demo client ID — useful for the wireframe walkthrough.'
          }
        ]
      }
    ],
    docs: [
      { label: 'Epic FHIR R4 OAuth2 & Backend Services documentation', href: 'https://fhir.epic.com/Documentation?docId=oauth2' },
      { label: 'Epic Connection Hub', href: 'https://connectionhub.epic.com' },
      { label: 'Epic FHIR R4 supported resources & search parameters', href: 'https://fhir.epic.com/' }
    ]
  };
}

export function athenaWizardProps(opts: {
  providerNpi: string;
  defaultFhirBaseUrl?: string;
}): WizardProps {
  return {
    providerNpi: opts.providerNpi,
    brandName: 'athenahealth',
    brandHeadline: 'We detected your practice runs athenahealth. Connect in 3 steps.',
    brandAccentClass: 'bg-indigo-50 border-indigo-200',
    brandBadgeClass: 'bg-indigo-100 text-indigo-700',
    authMethodLabel: 'OAuth2 client_credentials via Microsoft Azure AD',
    scopes: [
      'system/Patient.read',
      'system/Observation.read',
      'system/Condition.read',
      'system/MedicationRequest.read',
      'system/Procedure.read',
      'system/DocumentReference.read',
      'system/Encounter.read'
    ],
    defaultFhirBaseUrl: opts.defaultFhirBaseUrl,
    steps: [
      {
        title: 'Register the integration in the athenahealth Developer Portal',
        body: (
          <>
            <p>Your practice registers this integration in the Developer Portal and listed on the Athena Marketplace. (74% of athena practices already use Marketplace integrations — this flow will feel familiar.)</p>
            <p className="mt-2">After registration you\'ll receive a Client ID and Client Secret tied to your Practice ID.</p>
          </>
        ),
        externalLink: { label: 'Open athenahealth Developer Portal', href: 'https://www.athenahealth.com/developer-portal' }
      },
      {
        title: 'Enter your FHIR R4 base URL and Practice ID',
        body: <p>Athena FHIR R4 v25.0.0 supports athenaPractice and athenaFlow. The app will validate by hitting the metadata endpoint.</p>,
        fields: [
          {
            name: 'fhirBaseUrl',
            label: 'FHIR R4 base URL',
            placeholder: 'https://api.platform.athenahealth.com/fhir/r4',
            type: 'url',
            defaultValue: opts.defaultFhirBaseUrl,
            helper: 'Production base URL for athenaOne FHIR R4. Authentication runs through Azure AD client_credentials.'
          },
          {
            name: 'practiceId',
            label: 'Practice ID',
            placeholder: '195900',
            helper: 'Your athenahealth practice identifier.'
          }
        ]
      },
      {
        title: 'Authenticate and pull a test Patient',
        body: <p>The app exchanges your Client ID + Secret at the Azure AD token endpoint, then issues a Patient.read against your FHIR R4 endpoint.</p>,
        fields: [
          {
            name: 'clientId',
            label: 'Client ID',
            placeholder: 'demo-athena-client-id',
            helper: 'From your Developer Portal app registration.'
          }
        ]
      }
    ],
    docs: [
      { label: 'athenahealth FHIR R4 Implementation Guide (v25.0.0)', href: 'https://docs.mydata.athenahealth.com/fhir-r4/' },
      { label: 'FHIR R4 security & authentication', href: 'https://docs.mydata.athenahealth.com/fhir-r4/security.html' },
      { label: 'athenahealth Marketplace partner registration', href: 'https://www.athenahealth.com/solutions/marketplace-partners' }
    ]
  };
}

export function genericSmartWizardProps(opts: {
  providerNpi: string;
  ehrPlatform: string;
  defaultFhirBaseUrl?: string;
}): WizardProps {
  return {
    providerNpi: opts.providerNpi,
    brandName: opts.ehrPlatform || 'SMART on FHIR',
    brandHeadline: `Your practice uses ${opts.ehrPlatform || 'a SMART-on-FHIR EHR'}. Connect using SMART on FHIR.`,
    brandAccentClass: 'bg-slate-50 border-slate-200',
    brandBadgeClass: 'bg-slate-100 text-slate-700',
    authMethodLabel: 'SMART on FHIR · ONC Cures Act-compliant',
    scopes: [
      'system/Patient.read',
      'system/Observation.read',
      'system/Condition.read',
      'system/MedicationRequest.read',
      'system/Procedure.read',
      'system/DocumentReference.read',
      'system/Encounter.read'
    ],
    defaultFhirBaseUrl: opts.defaultFhirBaseUrl,
    steps: [
      {
        title: 'Enter your EHR\'s FHIR base URL',
        body: <p>Under the ONC Cures Act, all certified EHRs expose a standardized FHIR R4 API. The app will fetch the CapabilityStatement and auto-adjust which resources it queries based on what your EHR actually supports.</p>,
        fields: [
          {
            name: 'fhirBaseUrl',
            label: 'FHIR base URL',
            placeholder: 'https://your-ehr.example.com/fhir/r4',
            type: 'url',
            defaultValue: opts.defaultFhirBaseUrl
          }
        ]
      },
      {
        title: 'Register the app with your EHR vendor',
        body: (
          <>
            <p>Each EHR vendor has a developer or app marketplace where you register integrations. Download the configuration package below — it includes our public key and the FHIR scopes we\'ll request.</p>
            <p className="mt-2"><a className="text-accent hover:underline" href="#">Download SMART app configuration ↓</a> <em className="text-slate-500">(illustrative)</em></p>
          </>
        )
      },
      {
        title: 'Enter client credentials and test',
        body: <p>Once your EHR vendor issues credentials, paste them below. The app will exchange them at the token endpoint and pull a test Patient resource.</p>,
        fields: [
          {
            name: 'clientId',
            label: 'Client ID',
            placeholder: 'smart-client-id'
          }
        ]
      }
    ],
    docs: [
      { label: 'SMART on FHIR specification (HL7)', href: 'https://hl7.org/fhir/smart-app-launch/' },
      { label: 'ONC Cures Act Final Rule (FHIR R4 + USCDI v1+)', href: 'https://www.healthit.gov/curesrule/' },
      { label: 'Lantern: nationwide FHIR endpoint registry', href: 'https://lantern.healthit.gov/' }
    ]
  };
}
