# Password Generator

A local black-and-white brutal-style password generator built with HTML, CSS, and JavaScript.

## Open

Double-click `index.html`, or run a small local server from this folder:

```powershell
node server.mjs
```

Then open:

```text
http://127.0.0.1:4173
```

## Files

- `index.html` - page structure
- `styles.css` - brutal black and white UI, accents, motion, responsive layout
- `script.js` - cryptographic password generation, copy, strength meter, session stack
- `server.mjs` - tiny localhost server for previewing the site
## Notes

The generator uses the browser Crypto API, runs locally, and does not send or store passwords on a server.
