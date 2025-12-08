import { ColorTheme } from './types';

export const THEMES: Record<ColorTheme, { name: string; gradient: string }> = {
    mint: { name: 'Menta', gradient: 'linear-gradient(to right, #2DD4BF, #06B6D4)' },
    sapphire: { name: 'Zafiro', gradient: 'linear-gradient(to right, #3B82F6, #6366F1)' },
    amethyst: { name: 'Amatista', gradient: 'linear-gradient(to right, #A855F7, #D946EF)' },
    coral: { name: 'Coral', gradient: 'linear-gradient(to right, #FB923C, #EF4444)' },
    rose: { name: 'Cuarzo', gradient: 'linear-gradient(to right, #FB7185, #EC4899)' },
    solar: { name: 'Solar', gradient: 'linear-gradient(to right, #FBBF24, #EAB308)' },
};