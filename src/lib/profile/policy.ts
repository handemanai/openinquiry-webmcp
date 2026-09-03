import {
  PROFILE_NAME,
  PROFILE_VERSION,
  type AccessDecision,
  type AllowedUse,
  type ContentGrant,
  type ContentRepresentation,
  type KnowledgeResponse,
  type ProfileError,
  type ProfileWarning,
  type ProviderAction,
  type RetrievalEvaluationInput,
  type RightsDecision,
} from "./types.ts";
import { createSourceReceipt } from "./receipts.ts";

const REQUEST_USE_TO_RIGHT: Partial<Record<string, AllowedUse>> = {
  link: "link",
  quote: "quote",
  summarize: "summarize",
  compare: "compare",
};

function accessDecision(input: RetrievalEvaluationInput, entitled: boolean): AccessDecision {
  const required = Boolean(input.policy.requiredEntitlement);
  const basis = required && entitled
    ? input.trustedAccess.basis
    : input.policy.publicAccessBasis ?? "public_web";
  return {
    state: required ? (entitled ? "entitled" : "not_entitled") : "public",
    basis,
    ...(input.trustedAccess.basis === basis && input.trustedAccess.basisLabel
      ? { basisLabel: input.trustedAccess.basisLabel }
      : {}),
    decidedBy: input.provider.id,
    ...(required && entitled && input.trustedAccess.validUntil
      ? { validUntil: input.trustedAccess.validUntil }
      : {}),
  };
}

function rightsDecision(
  input: RetrievalEvaluationInput,
  decision: RightsDecision["decision"],
  maxCharacters?: number,
  representation?: ContentRepresentation,
): RightsDecision {
  const allowedUses = representation
    ? input.policy.representationAllowedUses?.[representation] ?? input.policy.allowedUses
    : input.policy.allowedUses;
  return {
    policyId: input.policy.policyId,
    decision,
    allowedUses: [...allowedUses],
    ...(input.policy.prohibitedUses
      ? { prohibitedUses: [...input.policy.prohibitedUses] }
      : {}),
    ...(maxCharacters !== undefined || input.policy.maxSegments !== undefined
      ? {
          limits: {
            ...(maxCharacters !== undefined ? { maxCharacters } : {}),
            ...(input.policy.maxSegments !== undefined
              ? { maxSegments: input.policy.maxSegments }
              : {}),
          },
        }
      : {}),
    attribution: { ...input.policy.attribution },
    ...(input.policy.requestedHandling
      ? { requestedHandling: { ...input.policy.requestedHandling } }
      : {}),
    ...(input.policy.policyUrl ? { policyUrl: input.policy.policyUrl } : {}),
  };
}

function canonicalAction(input: RetrievalEvaluationInput) {
  return {
    type: input.resource.deepLink ? ("deep_link" as const) : ("open" as const),
    label: input.resource.deepLink ? "Open the exact source section" : "Open the canonical source",
    url: input.resource.deepLink ?? input.resource.canonicalUrl,
    providerId: input.provider.id,
  };
}

function baseActions(input: RetrievalEvaluationInput, includeAccessPath: boolean) {
  const actions: ProviderAction[] = [canonicalAction(input)];
  if (includeAccessPath && input.policy.accessActions) {
    actions.push(...input.policy.accessActions.map((action) => ({ ...action })));
  }
  return actions;
}

function denial(
  input: RetrievalEvaluationInput,
  access: AccessDecision,
  error: ProfileError,
): KnowledgeResponse {
  const rights = rightsDecision(input, "deny", input.policy.maxCharacters);
  return {
    profile: { name: PROFILE_NAME, version: PROFILE_VERSION },
    status: "denied",
    provider: input.provider,
    access,
    rights,
    resources: [input.resource],
    receipt: createSourceReceipt({
      seed: input.receipt,
      providerId: input.provider.id,
      toolName: "knowledge_retrieve",
      resourceIds: [input.resource.id],
      access,
      policyId: input.policy.policyId,
      decision: "denied",
    }),
    actions: baseActions(input, true),
    error,
  };
}

function requestedUseIsAllowed(input: RetrievalEvaluationInput): boolean {
  const representationUses = input.policy.representationAllowedUses
    ?.[input.request.requestedRepresentation] ?? input.policy.allowedUses;
  for (const requestedUse of input.request.requestedUse ?? []) {
    if (requestedUse === "discover") continue;
    const requiredRight = REQUEST_USE_TO_RIGHT[requestedUse];
    if (requiredRight && !representationUses.includes(requiredRight)) return false;
  }
  return true;
}

function boundedContent(content: string, maximum?: number) {
  if (maximum === undefined || content.length <= maximum) {
    return { content, truncated: false };
  }
  // Return an exact source substring. The structured CONTENT_TRUNCATED warning
  // communicates the boundary without inserting a character that was not in
  // the publisher's source text.
  return { content: content.slice(0, maximum), truncated: true };
}

function selectedMaximum(input: RetrievalEvaluationInput): number | undefined {
  const requested = input.request.maxCharacters;
  const policyMaximum = input.policy.maxCharacters;
  if (requested === undefined) return policyMaximum;
  if (policyMaximum === undefined) return requested;
  return Math.min(requested, policyMaximum);
}

function statusWarning(input: RetrievalEvaluationInput): ProfileWarning | undefined {
  if (input.resource.status === "corrected") {
    return {
      code: "RESOURCE_CORRECTED",
      message: input.resource.statusNote ?? "The provider supplied the corrected current version.",
    };
  }
  if (input.resource.status === "updated") {
    return {
      code: "RESOURCE_UPDATED",
      message: input.resource.statusNote ?? "The provider supplied the current updated version.",
    };
  }
  if (input.resource.status === "unknown") {
    return {
      code: "STATUS_UNKNOWN",
      message: input.resource.statusNote ?? "The provider could not verify the current resource status.",
    };
  }
  return undefined;
}

/**
 * Pure retrieval decision. Access comes only from trusted provider context;
 * request fields can narrow a use but can never create an entitlement.
 */
export function evaluateRetrieval(input: RetrievalEvaluationInput): KnowledgeResponse {
  if (input.provider.id !== input.policy.providerId) {
    throw new Error("Policy provider does not match the response provider.");
  }
  if (input.provider.id !== input.trustedAccess.providerId) {
    throw new Error("Trusted access context belongs to a different provider.");
  }
  if (input.request.resourceId !== input.resource.id) {
    throw new Error("Requested resource does not match the provider-selected resource.");
  }
  if (input.policy.maxCharacters !== undefined && input.policy.maxCharacters < 1) {
    throw new Error("Policy maxCharacters must be positive.");
  }
  if (input.request.profileVersion !== PROFILE_VERSION) {
    const access = accessDecision(input, false);
    return denial(input, access, {
      code: "PROFILE_VERSION_UNSUPPORTED",
      message: `This provider supports OpenInquiry profile ${PROFILE_VERSION}.`,
      field: "profileVersion",
    });
  }

  const entitled = input.policy.requiredEntitlement
    ? input.trustedAccess.state === "entitled"
      && input.trustedAccess.entitlementKeys.includes(input.policy.requiredEntitlement)
    : true;
  const access = accessDecision(input, entitled);

  if (input.resource.status === "retracted" && input.request.requestedRepresentation !== "metadata") {
    return denial(input, access, {
      code: "RESOURCE_RETRACTED",
      message: "The requested content is retracted. Review the provider's status notice and canonical record.",
    });
  }
  if (input.resource.status === "withdrawn" && input.request.requestedRepresentation !== "metadata") {
    return denial(input, access, {
      code: "RESOURCE_WITHDRAWN",
      message: "The requested content is withdrawn. Review the provider's status notice and canonical record.",
    });
  }
  if (!requestedUseIsAllowed(input)) {
    return denial(input, access, {
      code: "USE_NOT_PERMITTED",
      message: "The provider policy does not permit the requested use.",
    });
  }

  const requested = input.request.requestedRepresentation;
  const directlyAllowed = input.policy.publicRepresentations.includes(requested)
    || (entitled && input.policy.entitledRepresentations.includes(requested));
  let selected: ContentRepresentation | undefined = directlyAllowed ? requested : undefined;
  const limitedByEntitlement = Boolean(
    input.policy.requiredEntitlement
      && !entitled
      && input.policy.entitledRepresentations.includes(requested),
  );

  let usedFallback = false;
  if (!selected && input.policy.fallbackRepresentation) {
    const fallback = input.policy.fallbackRepresentation;
    if (
      (input.policy.publicRepresentations.includes(fallback)
        || (entitled && input.policy.entitledRepresentations.includes(fallback)))
      && input.availableContent[fallback] !== undefined
    ) {
      selected = fallback;
      usedFallback = true;
    }
  }

  if (!selected) {
    return denial(input, access, {
      code: input.policy.requiredEntitlement && !entitled
        ? "ENTITLEMENT_REQUIRED"
        : "USE_NOT_PERMITTED",
      message: input.policy.requiredEntitlement && !entitled
        ? "The current site session can receive metadata and an access pathway, but not the requested protected unit."
        : "The provider does not supply the requested representation under this policy.",
    });
  }

  const rawContent = input.availableContent[selected];
  if (selected !== "metadata" && rawContent === undefined) {
    return denial(input, access, {
      code: "RESOURCE_NOT_FOUND",
      message: "The provider could not locate the requested information unit.",
    });
  }

  const maximum = selected === "metadata"
    ? undefined
    : selectedMaximum(input);
  const bounded = rawContent === undefined
    ? { content: undefined, truncated: false }
    : boundedContent(rawContent, maximum);
  const isLimited = limitedByEntitlement || usedFallback || bounded.truncated;
  const grant: ContentGrant = {
    resourceId: input.resource.id,
    representation: selected,
    ...(bounded.content !== undefined ? { content: bounded.content } : {}),
    ...(selected !== "full_text" && input.resource.locator
      ? { locator: input.resource.locator }
      : {}),
    suppliedByProvider: true,
    ...(input.contentDigests?.[selected]
      ? { contentDigest: input.contentDigests[selected] }
      : {}),
  };
  const warnings = [statusWarning(input)].filter((warning): warning is ProfileWarning => Boolean(warning));
  if (bounded.truncated) {
    warnings.push({
      code: "CONTENT_TRUNCATED",
      message: `The provider limited this returned unit to ${maximum} characters.`,
    });
  }

  return {
    profile: { name: PROFILE_NAME, version: PROFILE_VERSION },
    status: isLimited ? "limited" : "ok",
    provider: input.provider,
    access,
    rights: rightsDecision(
      input,
      isLimited ? "allow_with_limits" : "allow",
      maximum,
      selected,
    ),
    resources: [input.resource],
    grants: [grant],
    receipt: createSourceReceipt({
      seed: {
        ...input.receipt,
        returnedUnitDigest: input.contentDigests?.[selected]
          ?? input.receipt.returnedUnitDigest,
      },
      providerId: input.provider.id,
      toolName: "knowledge_retrieve",
      resourceIds: [input.resource.id],
      access,
      policyId: input.policy.policyId,
      decision: selected === "metadata"
        ? "metadata_only"
        : isLimited
          ? "limited"
          : "supplied",
    }),
    actions: baseActions(input, limitedByEntitlement),
    ...(warnings.length ? { warnings } : {}),
    ...(limitedByEntitlement
      ? {
          error: {
            code: "ENTITLEMENT_REQUIRED" as const,
            message: "The requested protected unit was not supplied; the provider returned its permitted public alternative.",
          },
        }
      : {}),
  };
}
