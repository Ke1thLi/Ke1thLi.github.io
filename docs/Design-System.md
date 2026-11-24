# Design system

[Tokens](../src/styles/tokens.css) define the typography, sizing and light/dark surfaces shared by the sidebar, toolbar and content. Cool neutral backgrounds and restrained purple interactions carry through both themes. The reading page adds blue, teal and violet heading levels in light mode, with quieter heading colors in dark mode.

The homepage pairs a compact introduction and topic links with recent articles and featured projects. The default hero has a CSS ribbon. A template user can provide a local or remote illustration through [configuration](Configuration.md).

In the desktop reader, the article text follows a sticky table of contents. The shell switches to a navigation drawer below 56rem, and the reader moves the table of contents into the reading flow. Its visibility and the main sidebar preference remain independent.

The example configuration loads Inter, Noto Sans SC and JetBrains Mono through the existing Google Fonts option. Set `appearance.fontSource` to 'system' to use the installed font stack and avoid a font network request. Open `/design-system/` in development to inspect shared components.
