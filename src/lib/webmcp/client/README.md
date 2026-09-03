# OpenInquiry page-local WebMCP client contract

This directory connects the browser's WebMCP runtime to the journal application.
It contains no session, entitlement, content-rights, or assurance policy.

## Endpoint

Every registered tool posts to:

```text
POST /api/openinquiry/journal/tools/{knowledge_tool}
```

The provider and tool segments come from fixed route configuration. The request
uses JSON, same-origin credentials, no cache, and no redirects. Its body is the
validated profile input itself.

The bridge never adds reader identity, entitlement, access basis, assurance,
policy decision, authentication data, full conversation, or a destination URL.
The server derives all authority from the journal session.

## Result handling

Expected profile outcomes, including `limited`, `denied`, and `not_found`, are
valid 2xx JSON results. The bridge validates the profile version, provider,
receipt, tool name, resource binding, and canonical action before publishing a
small visible result.

HTTP failure, invalid JSON, profile-invalid JSON, provider mismatch, or receipt
mismatch becomes a minimized `PROVIDER_UNAVAILABLE` result. The bridge does not
copy the raw server body, raw request, validation details, or exception text
into that response.

## Source opening

`knowledge_open` accepts a provider-issued resource ID and optional structured
locator. It never accepts a URL from the caller. The journal returns the
canonical action, and the bridge opens it only when it is same-origin,
resource-matched, within the journal route allowlist, and compatible with the
returned locator.

The bridge first emits an `openinquiry:knowledge-open-intent` event so the page
can focus the source in place. If the page does not handle the event, the
current tab navigates to the validated URL.

## Lifecycle

The execution `AbortSignal` passes through to `fetch`. A separate registration
signal removes tools when the reader leaves the journal route, and late results
cannot update the next page.

The journal homepage registers the complete seven-tool discovery surface. An
article route narrows that set to access, retrieval, resolution, status, and
canonical opening; a requested capability can narrow that route further but
cannot widen it.
