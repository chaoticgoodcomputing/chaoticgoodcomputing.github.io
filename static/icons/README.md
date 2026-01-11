# Custom Icons

Place custom SVG icons in this directory to use with the icon system.

## Usage

1. Add your SVG file: `my-icon.svg`
2. Reference in `quartz/util/iconConfig.ts`:
   ```typescript
   { tag: "my-tag", icon: "custom:my-icon" }
   ```

## Guidelines

- Use simple, single-path SVGs when possible
- Remove `fill` attributes from paths (icons are tinted programmatically to white)
- Use 24x24 viewBox for consistency with Material Design Icons
- Test icon visibility on both dark node backgrounds and light backgrounds

## Example

See `example-custom.svg` for a reference implementation.
