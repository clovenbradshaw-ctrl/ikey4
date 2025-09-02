# iKey Health - Secure Tiered Medical Information System

## Overview

iKey Health is a client-side encrypted, progressive web application for storing and managing personal medical information with three distinct security tiers. The system operates entirely in the browser with optional cloud backup via webhooks, ensuring users maintain complete control over their medical data while providing emergency access capabilities.

## Core Architecture

### Three-Tier Security Model

The system implements a progressive disclosure model with three security levels:

1. **Public Tier (Emergency Information)**
   - Accessible via QR code without authentication
   - Contains critical emergency data: name, blood type, allergies, medications, conditions, emergency contact
   - Encrypted with a base key embedded in the QR code
   - Designed for first responders in emergency situations

2. **PIN-Protected Tier (Health Records)**
   - Requires 6-digit PIN authentication
   - Contains medical history, surgeries, family history, health notes
   - PIN serves as encryption key derivation source (PBKDF2, 100,000 iterations)

3. **Password-Protected Tier (Full EHR)**
   - Requires strong password (8+ characters)
   - Contains comprehensive electronic health records
   - Includes provider management, detailed medications, conditions tracking, case notes
   - Password derives strongest encryption key (PBKDF2, 200,000 iterations)

## Security Implementation

### Encryption Architecture

```
User Data → JSON → AES-256-GCM Encryption → Base64 → localStorage
                        ↑
                    Derived Key
                        ↑
                PIN/Password + GUID + Salt → PBKDF2
```

- **Key Derivation**: Uses Web Crypto API's PBKDF2 with SHA-256
- **Encryption**: AES-256-GCM with random 12-byte IV per encryption
- **Key Hierarchy**:
  - Base Key: Random 32-byte key for emergency data
  - PIN Key: Derived from 6-digit PIN + GUID
  - Password Key: Derived from password + GUID + "secure" salt

### Client-Side Security Features

- All encryption/decryption happens in-browser
- No plaintext data transmitted to servers
- Keys never leave the client
- PIN and password ARE the encryption keys (not just authentication)
 - Cannot recover forgotten PIN/password

## Data Storage

### Local Storage Structure

```
localStorage:
├── ikey_guid                           # User's unique identifier
├── ikey_basekey_[GUID]                # Base encryption key
├── ikey_[GUID]_public                 # Encrypted emergency data
├── ikey_[GUID]_protected              # Encrypted health records
├── ikey_[GUID]_secure                 # Encrypted full EHR
└── ikey_[GUID]_lastSync              # Last cloud sync timestamp
```

### Starting Fresh

To create a new profile or bypass saved data, open the application with `?setup=new` in the URL. This forces the setup wizard even if a previous instance exists.

### Data Structure

```javascript
state = {
    publicData: {
        emergency: { 
            name,
            bloodType,
            allergies,
            medications,
            conditions,
            contactName
        }
    },
    protectedData: {
        health: {
            conditions,
            surgeries,
            familyHistory,
            notes
        }
    },
    secureData: {
        ehr: {
            identity: {
                chosenName,
                pronouns
            },
            providers: [],
            medications: [],
            conditions: [],
            caseNotes: []
        }
    }
}
```

## Cloud Storage Endpoints

The application synchronizes data across multiple services. Writes are sent to both the n8n webhook and a Xano cache for fast retrieval. Restores attempt to load from the Xano cache first, then Archive.org, and finally the n8n webhook as a fallback.

### Endpoint Configuration

- **n8n Webhook (Primary Write)**: `https://n8n.intelechia.com/webhook/d5e99c29-2cf1-44c1-b5b4-95a1ca048441`
- **Xano Cache (Fast Read/Write)**: `https://xvkq-pq7i-idtl.n7d.xano.io/api:Hj4C6PGO/ikey_cache`
- **Archive.org (Permanent Read)**: `https://archive.org/download/zuboff/{guid}.json`

Update the constants (`WEBHOOK_URL`, `XANO_CACHE_URL`, `ARCHIVE_BASE_URL`) in `index.html` if using different endpoints.

- **POST Method**: Creates new record (first sync for new GUID)
- **PUT Method**: Updates existing record (subsequent syncs for existing GUID)

### Rate Limiting

Add rate limiting to your n8n webhook to prevent brute-force attacks:

```javascript
const rateLimitMap = $getWorkflowStaticData('rateLimits') || {};
const key = `${items[0].json.guid}_${$context.clientIp}`;
const now = Date.now();

// Check rate limit
const attempts = rateLimitMap[key] || { count: 0, resetAt: now + 3600000 };
if (attempts.resetAt < now) {
    attempts.count = 0;
    attempts.resetAt = now + 3600000;
}

if (attempts.count > 5) {
    return {
        statusCode: 429,
        body: { error: 'Too many attempts. Try again in 1 hour.' }
    };
}

attempts.count++;
rateLimitMap[key] = attempts;
$setWorkflowStaticData('rateLimits', rateLimitMap);
```

### Webhook Payload Structure

```json
{
    "guid": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
    "version": "2.0.0",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "publicData": { 
        "emergency": {
            "name": "John Doe",
            "bloodType": "O+",
            "allergies": "Penicillin",
            "medications": "Lisinopril 10mg daily",
            "conditions": "Hypertension, Type 2 Diabetes",
            "contactName": "Jane Doe"
        }
    },
    "protectedData": {
        "health": {}
    },
    "secureData": { 
        "ehr": {}
    },
    "encrypted": {
        "public": "base64-encrypted-blob",
        "protected": "base64-encrypted-blob-or-null",
        "secure": "base64-encrypted-blob-or-null"
    }
}
```

### Sync Behavior

- **Auto-sync**: Triggers 2 seconds after any data change (debounced)
- **Manual sync**: Available via "Sync to Cloud" button in Security section
- **Visual indicator**: Shows sync status in header
- **Method selection**: Automatically uses POST for new GUIDs, PUT for updates
- **Encrypted blobs**: Allow server backup without server-side decryption capability
- **Decrypted data**: Included for optional server-side processing (if keys available)

### Webhook Flow

```
1. User modifies data
2. Auto-save triggers (2s debounce)
3. Data encrypted and saved to localStorage
4. Sync function checks if GUID has been synced before
   - No previous sync → POST request
   - Previous sync exists → PUT request
5. n8n webhook receives and processes data
6. Can forward to database, Archive.org, or other storage
```

## QR Code System

### QR Code Format

```
[origin]/[path]#[GUID]:[base64-encoded-base-key]

Example:
https://example.com/ikey.html#a1b2c3d4-e5f6-7890-abcd-ef1234567890:SGVsbG9Xb3JsZA==
```

### Use Cases

1. **Emergency Access**: First responders scan QR to access emergency information
2. **Device Transfer**: User scans their QR on new device to restore access
3. **Backup Recovery**: QR contains keys needed to decrypt cloud-backed data

## Recovery Mechanisms

A recovery key file provides an alternate login path if your PIN or password is lost. The key file is automatically downloaded during setup and whenever you change your PIN or EHR password. It is encrypted using the application's base URL—store it securely as a new key file is required after each credential change.

## User Experience Features

### Keyboard Support

PIN entry supports full keyboard interaction:
- **Number keys (0-9)**: Enter PIN digits
- **Backspace/Delete**: Clear current entry
- **Enter**: Confirm when 6 digits entered
- **Escape**: Cancel PIN entry
- **Tab navigation**: Accessible interface

### Auto-Save System

```javascript
Input Change → 2s Debounce → Encrypt → Save to localStorage → Sync to Cloud
```

- Triggers on any protected field change
- Visual confirmation of save status
- Automatic cloud backup after local save
- Non-blocking async operations

### Progressive Disclosure

1. **Initial Setup**: Minimal (name + emergency info + PIN)
2. **Health Records**: Unlock with PIN when needed
3. **Full EHR**: Add password for comprehensive records
4. **Visual Security Indicators**:
   - 🔓 Public Access (gray badge)
   - 🔐 PIN Protected (blue badge)
   - 🔒 Fully Secured (purple badge)

## Archive.org Integration Strategy

While not directly integrated, the webhook system enables Archive.org backup:

### Potential Implementation

```javascript
// n8n webhook can forward to Archive.org
async function archiveToWayback(data) {
    const htmlPage = generateStaticHTML(data.encrypted);
    const saveUrl = `https://web.archive.org/save/${deployedUrl}`;
    // Archive encrypted data as static HTML
}
```

### Benefits

1. **Permanent Backup**: Wayback Machine provides long-term storage
2. **Version History**: Each save creates timestamped snapshot
3. **Decentralized**: Not dependent on single server
4. **Public Good**: Aligns with Archive.org's mission
5. **Recovery URL**: `https://web.archive.org/web/[timestamp]/[url]`

## Security Considerations

### Strengths

- **Zero-knowledge architecture**: Server never sees plaintext data
- **Defense in depth**: Multiple encryption tiers
- **Client-side encryption**: Uses modern Web Crypto API
- **No account system**: Reduces attack surface
- **Deterministic key derivation**: PIN/password reproducibly generate same keys
- **Forward secrecy**: Each encryption uses new IV

### Limitations

- **No password recovery**: Lost password = lost data
- **Browser security**: Depends on device security
- **localStorage risks**: Vulnerable to XSS without proper CSP
- **Single point of failure**: QR code loss problematic without backup
- **Replay attacks**: Webhooks should implement idempotency

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Server compromise | Client-side encryption, zero-knowledge |
| Device theft | PIN/password protection |
| XSS attacks | Content Security Policy, input sanitization |
| Network interception | HTTPS only, encrypted payloads |
| Brute force | PBKDF2 high iterations, rate limiting |
| Social engineering | Recovery codes, user education |

## Implementation Notes for AI Systems

When working with this codebase:

1. **Never log sensitive data**: PINs, passwords, or decrypted medical information
2. **Maintain encryption boundaries**: Don't decrypt unnecessarily
3. **Respect security tiers**: Each tier has specific access requirements
4. **Handle crypto errors gracefully**: Invalid keys should fail safely
5. **Preserve client-side nature**: Avoid server dependencies for core functionality
6. **Test edge cases**: Wrong PIN, corrupted data, browser storage limits
7. **Consider offline-first**: Should work without network connection
8. **Validate all inputs**: Especially before encryption operations

### Code Patterns to Follow

```javascript
// Always wrap crypto operations in try-catch
try {
    const decrypted = await decrypt(encrypted, key);
} catch (error) {
    // Handle gracefully, don't expose error details
    showStatus('Unable to decrypt data', 'error');
}

// Always clear sensitive variables
let pin = getUserInput();
const key = await deriveKey(pin);
pin = null; // Clear immediately after use

// Use progressive enhancement
if (!window.crypto || !window.crypto.subtle) {
    showError('Browser does not support required encryption');
}
```

## Browser Compatibility

### Required APIs

- Web Crypto API (for encryption)
- localStorage (for persistence)
- Fetch API (for webhooks)
- FileReader API (for imports)
- Blob/URL APIs (for exports)

### Tested Browsers

| Browser | Minimum Version | Notes |
|---------|----------------|--------|
| Chrome | 60+ | Full support |
| Firefox | 57+ | Full support |
| Safari | 11+ | Full support |
| Edge | 79+ | Full support |
| Mobile Safari | 11+ | Touch optimized |
| Chrome Android | 60+ | Touch optimized |

## Privacy Model

### Data Minimization

- **No tracking**: No analytics or telemetry
- **No cookies**: Uses localStorage only
- **No external resources**: Self-contained application
- **No user accounts**: GUID-based identification only
- **Optional sync**: Cloud backup is opt-in

### User Rights

1. **Right to Access**: Export all data at any time
2. **Right to Deletion**: Clear localStorage removes all local data
3. **Right to Portability**: JSON export format
4. **Right to Rectification**: Direct editing of all fields
5. **Right to Restriction**: Operate fully offline

### GDPR/HIPAA Considerations

- **Data Controller**: User maintains full control
- **Data Processor**: Webhook endpoint (if used)
- **Encryption at Rest**: Always encrypted in localStorage
- **Encryption in Transit**: HTTPS + encrypted payloads
- **Audit Trail**: Optional via webhook timestamps
- **Data Residency**: User chooses via webhook configuration

## Deployment

### Static Hosting

The application is a single HTML file that can be served directly by the bundled
Node server or hosted on any static platform:
- Run `node server.js` and visit `http://localhost:3000`
- Serve from any static web server
- Save locally and run from `file://`
- Deploy to GitHub Pages, Netlify, Vercel
- Embed in native apps via WebView
- Distribute via IPFS for decentralization

### Configuration

No server-side configuration required. Optional webhook endpoint can be modified in the code:

```javascript
const WEBHOOK_URL = 'https://n8n.intelechia.com/webhook/d5e99c29-2cf1-44c1-b5b4-95a1ca048441';
```

## Future Enhancements

### Planned Features

1. **WebAuthn Support**: Biometric authentication option
2. **IndexedDB Storage**: For larger datasets
3. **Service Worker**: Offline support and PWA features
4. **Multi-language**: i18n support
5. **FHIR Format**: Healthcare data interoperability
6. **Backup Reminders**: Notification system for regular backups
7. **Encrypted Access Links**: Time-limited tokens

### Integration Opportunities

- **Health Apps**: Apple Health, Google Fit
- **EHR Systems**: Epic, Cerner via FHIR
- **Wearables**: Import vitals data
- **Telemedicine**: Provide records to providers
- **Insurance**: Controlled data sharing

## License and Attribution

This system is designed as a public good for personal health data management. Users maintain full ownership and control of their medical information. The encryption and security model ensures that even the application developers cannot access user data without explicit consent and keys.
