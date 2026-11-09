# Tunes and Turns: Irish-ish Slow Session

*ad maiorem dei gloriam, sed non troppo presto*

This is a static website, ready for GitHub Pages. It preserves the established homepage and repertory design and incorporates the updated spreadsheet, ABC files, PDFs, and images uploaded November 8, 2026.

## Preview locally

Open this folder in Visual Studio Code and use **Open with Live Server** on `index.html`. Opening the HTML as a local `file://` URL will not load the repertory JSON reliably.

## Publish on GitHub Pages

1. Create a GitHub repository (public for free GitHub Pages on most plans).
2. Upload **the contents of this folder** to the repository root (not the ZIP and not an extra enclosing folder).
3. Commit to the `main` branch.
4. In repository **Settings → Pages**, select **Deploy from a branch**, `main`, `/ (root)`, and save.
5. After deployment, open the URL displayed under Pages. For a project repository, the URL typically ends in `/<repository-name>/`.

## Maintenance

`repertory.json` powers the website. The Excel workbook is included as an editorial source, but changing the spreadsheet alone will not automatically update the live site. Regenerate `repertory.json` when the workbook changes. ABC notation is rendered using the public abcjs CDN, so notation rendering requires an internet connection. External recording links may change independently.

## Quality checks

The site has been packaged with local references to its assets. Entries without matched ABC files remain visible but will not show notation. Check all notation and external links in a browser before public launch.

## Integrated melody playback and videos

Open a tune from the Repertory. The ABC notation is rendered with abcjs, and a built-in synthesized melody player provides play/pause and 60%, 80%, or 100% tempo choices. Where supported, a MIDI download link is generated from the ABC notation in the browser. YouTube links in the repertory data are embedded beneath the notation, with a fallback link for videos that disallow embedding. No API key or server is required. Playback requires browser audio support, user interaction, and access to the abcjs library CDN.

Important: Playback is a literal synthesized rendering of the ABC melody; it does not reproduce the feel or ornamentation of the referenced performances. Some ABC files may not be playable if their notation is malformed. Test in a modern browser through Live Server or GitHub Pages.
