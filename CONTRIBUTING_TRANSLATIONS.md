# Adding a language to LibreOTP

Thanks for wanting to translate LibreOTP! You don't need to touch any app
code, just a JSON file. It takes about 15-20 minutes.

## Steps

1. **Copy the reference English file**: `locales/en.json` → rename it with
   the language code (ISO 639-1, 2 letters):
    - Spanish → `locales/es.json`
    - Arabic → `locales/ar.json`
    - German → `locales/de.json`

2. **Translate only the values** (right of the `:`), never the keys
   (left of the `:`). Example:

   ```json
   {
     "settings": {
       "title": "Settings"   ==>   "title": "Configuración"
     }
   }
   ```

3. **Keep the `{{...}}` placeholders intact** — these are variables replaced
   by the app (e.g. `{{version}}`, `{{count}}`, `{{name}}`). Don't translate
   them, just move them if your language's word order requires it:

   ```json
   "copiedBody": "Code for {{name}} copied."   →   "Código de {{name}} copiado."
   ```

4. **Register the language** in `lib/i18n.js`:

   ```js
   import es from '../locales/es.json'; //  add the import

   export const SUPPORTED_LANGUAGES = [
     { code: 'fr', label: 'Français' },
     { code: 'en', label: 'English' },
     { code: 'es', label: 'Español' }, //  add the entry
   ];

   const resources = {
     en: { translation: en },
     fr: { translation: fr },
     es: { translation: es }, // add the resource
   };
   ```

5. **Test it**: in the app's Settings → Language, your language should show
   up in the list and apply immediately across every screen.

6. **Open a Pull Request** with only these 2 changed files
   (`locales/xx.json` + `lib/i18n.js`). No need to touch anything else.

## Good to know

- Don't add, remove, or rename any keys in your file — keep exactly the same
  structure as `en.json`, only the values change.
- If a translation is tricky or ambiguous, leave a comment in the PR
  description instead of guessing.
- You can validate that your JSON is syntactically correct before opening
  the PR with any online JSON validator, or locally:

  ```bash
  node -e "JSON.parse(require('fs').readFileSync('locales/es.json', 'utf8')); console.log('OK')"
  ```