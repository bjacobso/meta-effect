# Meta Effect Presentation

Slidev presentation for the inaugural Effect SF Meetup.

## Running the Presentation

```bash
# Install dependencies (if not already done)
pnpm install

# Start development server (will prompt for slide deck selection)
pnpm dev

# Or manually select slides first
pnpm select

# Build for production
pnpm build

# Export to PDF
pnpm export
```

## Multiple Slide Decks

This presentation supports multiple slide decks in the `slides/` directory. When you run `pnpm dev`, you'll be prompted to select which deck to present.

### Adding a New Deck

1. Create a new `.md` file in `slides/` (e.g., `slides/workshop.md`)
2. Run `pnpm dev` and select your new deck
3. The script will create a symlink: `slides.md -> slides/your-deck.md`

### Available Decks

- **meta-effect.md** - Main presentation for Effect SF Meetup

## Presentation Structure (meta-effect.md)

1. **Opening (Slides 1-3)** - Title, hook, problem statement
2. **Solution (Slides 4-6)** - Philosophy, how it works
3. **Component Showcase (Slides 7-11)** - Real code examples
4. **Architecture (Slides 12-14)** - Registry, services, patterns
5. **Live Demo (Slides 15-17)** - Copy, customize, compose
6. **Comparison (Slides 18-20)** - vs npm packages, shadcn inspiration
7. **Deep Dive (Slides 21-22)** - Component library, Effect principles
8. **Vision (Slides 23-25)** - Roadmap, contribution guide
9. **Closing (Slides 26-28)** - Resources, Q&A, thank you

## Customization

Create or edit slide decks in `slides/`:
- Content and examples
- Code snippets
- Transitions and animations
- Speaker notes

## Tips for Presenting

- Use arrow keys or space to navigate
- Press `o` for slide overview
- Press `d` to toggle dark mode
- Press `f` for fullscreen
- Press `c` to show presenter mode with notes

## Resources

- Slidev Docs: https://sli.dev
- Effect Docs: https://effect.website
- Meta Effect: https://github.com/effect-meta/meta-effect
