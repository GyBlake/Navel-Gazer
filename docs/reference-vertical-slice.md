# Reference vertical slice

Navel Gazer includes a minimal executable reference application proving the core path from resource registration to verified execution.

The path is:

1. Register a typed resource.
2. Define a capability for the resource type and action.
3. Bind an explicit authorization rule to a subject, resource, and action.
4. Execute through the runtime.
5. Produce structured evidence and provenance.
6. Append an execution event.
7. Return the execution result together with its event record.

Run it with:

```bash
npm test
npm run cli -- demo
```

The reference application is intentionally domain-neutral. It is a testable integration example, not an agent identity or product-specific workflow.
