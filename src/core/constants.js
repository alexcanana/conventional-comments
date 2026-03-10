(() => {
  window.GCC_CONSTANTS = {
    FALLBACK_TRIGGER: typeof DEFAULT_TRIGGER === 'string' ? DEFAULT_TRIGGER : 'cc',
    INSTANCE_KEY: '__gccInstance',
    BOUND_ATTRIBUTE: 'data-cc-bound',
    DROPDOWN_ID: 'gl-cc-dropdown',
    LABELS: [
      { key: 'praise', description: 'Highlights something done well.' },
      { key: 'nitpick', description: 'Minor preference or optional tweak.' },
      { key: 'suggestion', description: 'Concrete improvement proposal.' },
      { key: 'issue', description: 'Problem requiring a fix.' },
      { key: 'todo', description: 'Follow-up work item.' },
      { key: 'question', description: 'Clarification request.' },
      { key: 'thought', description: 'Non-blocking observation.' },
      { key: 'chore', description: 'Maintenance or refactor note.' },
      { key: 'note', description: 'General contextual comment.' },
      { key: 'polish', description: 'Quality/readability refinement.' },
      { key: 'typo', description: 'Spelling/wording correction.' },
      { key: 'quibble', description: 'Tiny preference-level disagreement.' }
    ],
    DECORATIONS: [
      { key: 'non-blocking', description: 'No action required to merge.' },
      { key: 'blocking', description: 'Must be addressed before merge.' },
      { key: 'if-minor', description: 'Ignore if this is intentionally small scope.' },
      { key: 'security', description: 'Security-sensitive concern.' },
      { key: 'test', description: 'Related to tests or verification.' },
      { key: 'ux', description: 'User experience concern.' }
    ]
  };
})();
