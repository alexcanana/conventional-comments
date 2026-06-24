import { definePreset } from '@primevue/themes';
import Aura from '@primevue/themes/aura';

// Bridge PrimeVue's design tokens to the page's --cc-* palette so every
// PrimeVue component renders in Ocean Blue / our surfaces automatically.
export const CcPreset = definePreset(Aura, {
  semantic: {
    colorScheme: {
      light: {
        primary: {
          color: 'var(--cc-accent)',
          contrastColor: '#ffffff',
          hoverColor: 'var(--cc-accent)',
          activeColor: 'var(--cc-accent)',
        },
        content: {
          background: 'var(--cc-surface)',
          borderColor: 'var(--cc-border)',
          color: 'var(--cc-text)',
        },
        text: {
          color: 'var(--cc-text)',
          mutedColor: 'var(--cc-dim)',
        },
      },
    },
  },
  components: {
    // Aura's toast colors each severity from a single `color` token (used for
    // BOTH text and icon) over a tinted background. Restore the old toast: a
    // plain surface with dark text and a neutral border. The severity-colored
    // icon + bold left accent are applied in CSS (.opt-toast), since one token
    // can't paint text and icon differently.
    toast: {
      colorScheme: {
        light: {
          success: {
            background: 'color-mix(in srgb, var(--cc-green) 8%, var(--cc-bg))',
            borderColor: 'var(--cc-green)',
            color: 'var(--cc-text)',
            detailColor: 'var(--cc-dim)',
          },
          error: {
            background: 'color-mix(in srgb, var(--cc-red) 8%, var(--cc-bg))',
            borderColor: 'var(--cc-red)',
            color: 'var(--cc-text)',
            detailColor: 'var(--cc-dim)',
          },
        },
      },
    },
  },
});
