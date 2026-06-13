/**
 * Vendored subset of @sunfish/contracts — bundle manifest types only.
 *
 * Tender uses only BusinessCaseBundleManifest + ProviderCategory from the
 * contracts package. The full @sunfish/contracts package depends on a sibling
 * shipyard/ clone via `file:` path, which blocks standalone operator installs.
 *
 * This file vendors only the types Tender actually imports, copied from:
 *   shipyard/packages/contracts/src/bundles.ts
 *
 * Sync discipline: when the upstream C# canonical record changes, update
 * this file AND the Rust mirror in src-tauri/src/bundles.rs together.
 *
 * Canonical source:
 *   shipyard/packages/foundation-catalog/Bundles/BusinessCaseBundleManifest.cs
 */

/** Business-case bundle category. */
export type BundleCategory = 'Operations' | 'Diligence' | 'Finance' | 'Platform'

/** Bundle lifecycle status. */
export type BundleStatus = 'Draft' | 'Preview' | 'GA' | 'Deprecated'

/** Deployment mode supported by a bundle. */
export type DeploymentMode = 'Lite' | 'SelfHosted' | 'HostedSaaS'

/**
 * Provider category for a provider-requirement entry. Maps to
 * Sunfish.Foundation.Catalog.Bundles.ProviderCategory C# enum.
 */
export type ProviderCategory =
  | 'Billing'
  | 'Payments'
  | 'BankingFeed'
  | 'FeatureFlags'
  | 'ChannelManager'
  | 'Messaging'
  | 'Storage'
  | 'IdentityProvider'
  | 'Other'

/** A provider-category requirement declared by a bundle. */
export interface ProviderRequirement {
  category: ProviderCategory
  required: boolean
  purpose?: string | null
}

/**
 * Per ADR 0007-A1. Non-.NET consumers treat this as opaque-display only.
 * Field is absent from JSON when null (JsonIgnoreCondition.WhenWritingNull).
 */
export interface MinimumSpec {
  policy?: 'Required' | 'Recommended' | 'Informational'
  [key: string]: unknown
}

/**
 * Business-case bundle manifest. A bundle is configuration, not code.
 * Mirrors Sunfish.Foundation.Catalog.Bundles.BusinessCaseBundleManifest.
 * See ADR 0007.
 */
export interface BusinessCaseBundleManifest {
  key: string
  name: string
  version: string
  description?: string | null
  category: BundleCategory
  status: BundleStatus
  maturity: string
  requiredModules: string[]
  optionalModules: string[]
  featureDefaults: Record<string, string>
  editionMappings: Record<string, string[]>
  deploymentModesSupported: DeploymentMode[]
  providerRequirements: ProviderRequirement[]
  integrationProfiles: string[]
  seedWorkspaces: string[]
  personas: string[]
  dataOwnership?: string | null
  complianceNotes?: string | null
  requirements?: MinimumSpec | null
}
