# TeachCraft privacy and retention plan

This is a product-planning document for legal and institutional review, not a legal-compliance claim.

## What TeachCraft stores

When authenticated persistence is enabled, TeachCraft stores:

- Lecturer profile identity supplied by Supabase Auth.
- Saved lesson content, metadata, lifecycle status, and version history.
- Teaching Sessions: delivery date, cohort/course labels supplied by the lecturer, planned and actual duration, checkpoints, timing changes, adaptations, difficult concepts, engagement, understanding observations, confidence, reflections, and improvement proposals.
- Generation usage telemetry: event type, model name, success/failure, safe error code, duration, and provider token counts when available.

Demo mode stores lesson/session/reflection state only in browser storage and does not create account records.

## Why it is stored

- Lesson and version data support reuse, editing, printing, and continuity.
- Teaching Session data supports lecturer-controlled Teaching History and future lesson improvement.
- Usage telemetry supports daily generation limits, abuse prevention, operational diagnostics, and cost awareness.

## What is sent to the model provider

When live generation is enabled, the lesson or course brief is sent to Anthropic to generate the requested lesson or course arc. The application does not intentionally send Supabase credentials, browser cookies, or unrelated library records. The provider’s current data-use and retention terms must be reviewed before institutional use.

## What is not stored by design

- API keys or service-role credentials in browser storage or user records.
- Raw prompts in `usage_events`.
- Provider response bodies in telemetry.
- Student names, grades, or personally identifying student records as part of the current product design.

Lecturers should avoid entering sensitive student information into lesson briefs, cohort labels, reflections, or model prompts until institutional review approves the workflow.

## Retention and deletion decisions requiring approval

Before launch, the product owner and legal/institutional stakeholders must decide:

- How long lessons and versions are retained.
- Whether Teaching Sessions should have a shorter retention period than lesson designs.
- How long usage telemetry is retained.
- Whether deleted lessons should cascade-delete sessions and versions, or be retained for audit purposes.
- Whether users can export all content before deletion.
- Whether institution-level data residency or a data-processing agreement is required.

The current database supports lecturer-owned deletion of lessons and cascading deletion of associated sessions and versions. This behavior must be confirmed against the chosen retention policy.
