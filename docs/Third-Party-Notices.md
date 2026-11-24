# Third-party notices

Keep `dist/third-party/` with the generated site. The [distribution notice](../public/third-party/NOTICE.txt) identifies the code and assets that ship to browsers and links to corresponding source for the Eclipse-licensed components.

- Vite emits `dist/third-party/bundled-licenses.md` with licenses for packages in its client bundles. The ELK.js chunk also carries the upstream Kiel University copyright notices and points to `third-party/NOTICE.txt`. ELK.js is distributed under the EPL-2.0 option. The notice covers separately licensed components embedded in the ELK.js bundle.
- KaTeX code and styles use MIT. The distributed KaTeX fonts use SIL OFL 1.1, with copyright statements and reserved font names in [the font notice](../public/third-party/KaTeX-Fonts-OFL.txt).
- Pagefind emits its core search runtime and WASM separately from Vite. See [the Pagefind notices](../public/third-party/Pagefind.txt). The theme uses the core API and does not distribute the unused stock UIs or highlighter.
- The inline Feather Icons glyphs retain the [Feather MIT notice](../public/third-party/Feather-MIT.txt). The example requests Google Fonts. The system font option uses installed fonts. Neither option bundles font files. If you add locally hosted fonts or assets, include their notices with your build.

The [project MIT license](../LICENSE) covers original Moonlit Folio material. Third-party dependencies and assets, including the inline Feather glyphs, retain their upstream licenses.
