# Cross-platform NFC in Ionic with Capacitor: Plugin Landscape, Capabilities, Security, and Implementation

## Executive Summary and Key Findings

Near Field Communication (NFC) has matured into a reliable, low-friction channel for mobile interactions ranging from product info and business cards to device provisioning and service workflows. In the Ionic ecosystem, two plugin families dominate: the legacy Ionic Native NFC wrapper targeting Cordova, and modern Capacitor plugins. For production-grade cross-platform NFC today, Capacitor plugins are the practical path, with two viable options that serve most needs: the Capawesome NFC plugin and the Capgo NFC plugin.

Capawesome’s plugin offers breadth across Android and iOS, including advanced capabilities such as Host Card Emulation (HCE) on Android and raw command exchange (transceive) for specific tag technologies. It also exposes NDEF utilities and comprehensive platform-specific options for iOS (polling options, reader alert messaging) and Android (tech and MIME type filtering, settings access). Its cross-platform API unifies reading, writing, formatting, erase, and make-read-only operations into a coherent developer experience, with an implementation guide that reinforces best practices for sessions, permissions, and error handling. The trade-off is its sponsorware licensing model, which requires a license key for access to packages in a private registry, and a clear warning that raw commands can permanently damage tags if misused[^2][^3][^5].

Capgo’s NFC plugin focuses on a straightforward developer experience for tag discovery, reading, and writing NDEF (Text and URI), alongside erase, make-read-only, status checks, and Android Beam. It requires manual iOS capability and Info.plist configuration and exposes helper methods that encode common NDEF records (Text, URL, vCard, JSON). It is open source and actively maintained, with clear installation and troubleshooting guidance for both Android and iOS[^6][^7][^8][^9].

Cross-platform parity is good for NDEF workflows. Android-only features include formatting tags as NDEF, opening NFC settings, checking enabled status, and HCE. Raw transceive and its safety caveats apply on both Android and iOS, but with different underlying constraints—Android exposes technology-specific connections while iOS exposes transceive for selected technologies (e.g., ISO 15693 and FeliCa). iOS requires the Near Field Communication Tag Reading capability and an NFCReaderUsageDescription in Info.plist; polling options must be carefully chosen based on tag types in scope[^2][^3][^13][^14][^15][^16].

Recommended defaults:
- NDEF-centric use cases with simple developer onboarding: Capgo NFC.
- Advanced scenarios (HCE, raw transceive, broader tech coverage, cross-platform polish): Capawesome NFC.

Web NFC remains limited to NDEF in browsers and is not a general substitute for native plugins; it is best used as a complement for specific browser-based flows and Progressive Web Apps (PWAs)[^19][^18].

To ground these recommendations, Table 1 provides a one-page comparison across features, platforms, and licensing.

To illustrate this point, the following table contrasts the primary options across features, platforms, and licensing.

Table 1. High-level comparison of NFC plugin options

| Plugin | Primary features (read/write NDEF, erase, read-only, raw, HCE) | Platforms | Licensing/Access | Notable advanced capabilities |
|---|---|---|---|---|
| Ionic Native NFC (Cordova wrapper) | Read/write NDEF, beam, receive from NFC devices | Android (primary), iOS via Cordova plugin | MIT (package) | Legacy ecosystem; relies on PhoneGap NFC |
| Capawesome NFC | Read/write NDEF, erase, make-read-only, format (Android), raw transceive, HCE (Android) | Android, iOS, Web | Sponsorware (license key, private registry) | HCE, broader tech types, iOS polling options, utilities |
| Capgo NFC | Tag discovery, read/write NDEF (Text, URI, vCard, JSON), erase, read-only, status, Beam (Android) | Android, iOS | Open source | Simple API, Beam, manual iOS setup, comprehensive examples |
| PhoneGap NFC (Cordova) | Read/write NDEF and more via native Android APIs | Android (primary), iOS via wrapper | OSS | Legacy baseline for NFC features |

Capawesome’s depth and cross-platform polish make it ideal when scenarios extend beyond simple NDEF read/write, especially on Android. Capgo’s approachable API and community posture make it a strong default for common NDEF use cases where ease and openness matter[^2][^6][^9][^11][^5][^3].

## Background: NFC Fundamentals and Ionic Native NFC

NFC enables short-range wireless communication at distances typically within a few centimeters, optimized for lightweight data exchange. The NFC Data Exchange Format (NDEF) is the lingua franca for interoperable payloads; it structures records so that diverse devices and operating systems can read and write consistently. In mobile contexts, devices act as readers that discover and interact with passive tags. Host Card Emulation (HCE) allows a phone to emulate a tag and respond to external readers, enabling scenarios such as access control or payments (subject to platform and regulatory constraints). Core NFC on iOS and the Android NFC stack provide the native foundations these plugins build upon[^3][^18].

Ionic Native is a set of wrappers around Cordova plugins that provide a more Ionic-friendly TypeScript API. The Ionic Native NFC package wraps the PhoneGap NFC plugin and exposes functions for reading and writing NDEF messages, beaming data to other devices, and receiving data from NFC devices. The PhoneGap NFC plugin relies on the underlying Android NFC APIs and, on iOS, the Cordova integration of Core NFC. While Ionic Native remains in wide use, it is firmly embedded in the Cordova plugin ecosystem and has aging maintenance signals, making it less aligned with modern Ionic projects that use Capacitor as the native runtime[^11][^12][^20].

When NFC availability or configuration is absent (e.g., NFC disabled, capability not added on iOS, permissions missing on Android), developers must handle user flows that guide users to settings or provide clear messaging about device capabilities. These fundamentals shape the user experience and error handling patterns that Capacitor plugins bring into a unified API[^17][^6].

## Plugin Landscape and Decision Framework

The decision framework is driven by platform scope, feature requirements, licensing tolerance, maintenance expectations, and the desired developer experience. NDEF-heavy use cases, where records are text or URI payloads for tagging products, assets, or personal profiles, generally align with Capgo NFC due to its simple encoder methods and clear setup. Advanced scenarios that involve non-NDEF tag technologies, raw commands, or HCE are better served by Capawesome NFC.

To make this selection concrete, Table 2 scores each option against key criteria.

Table 2. Decision matrix: selecting an NFC plugin

| Criterion | Ionic Native NFC (Cordova) | Capawesome NFC | Capgo NFC |
|---|---|---|---|
| Target platforms | Android, iOS via Cordova | Android, iOS, Web | Android, iOS |
| Maintenance signals | Legacy; last publish years ago | Sponsorware; monorepo; aligned with latest Capacitor | Active OSS; community-driven |
| Feature breadth | NDEF read/write, beam | NDEF, format, raw transceive, HCE, utilities | NDEF read/write, erase, read-only, status, Beam |
| Complexity | Moderate; Cordova lifecycle | Higher; advanced features require careful setup | Low-to-moderate; straightforward API |
| Licensing | MIT | Sponsorware (license key) | Open source |
| Developer onboarding | Forum-heavy; legacy docs | Polished docs and guides | Clear docs and examples |

For most teams, Capgo NFC provides a pragmatic default when workflows center on well-known NDEF Text/URI records, while Capawesome NFC is recommended for advanced cross-platform features and higher parity between Android and iOS. The community evidence shows developers migrating from outdated plugins or Cordova wrappers to Capacitor plugins to reduce friction and improve reliability[^5][^6][^9][^1].

## Deep Dive: Capawesome NFC Plugin (Capacitor)

Capawesome’s NFC plugin consolidates NFC operations across Android and iOS into a coherent API. Its surface includes reading and writing NDEF, erasing content by writing an empty NDEF message, making tags read-only, formatting tags as NDEF (Android-only), and executing raw transceive commands on supported tag technologies. On Android, it supports Host Card Emulation (HCE) to emulate an NFC card and exchange APDUs with external readers. It further exposes utility functions for constructing NDEF records and platform-specific options for fine control over scanning and user messaging[^2][^3].

The plugin’s cross-platform orientation is evident in its handling of scan sessions, where developers start a session, listen for tag scanned events, and stop the session to release resources. On iOS, reader session alert messages can be customized; polling options determine which tag families are discovered. On Android, tech and MIME type filtering reduces discovery noise, and settings access allows developers to prompt users to enable NFC or open system settings when necessary[^2][^3].

To clarify the platform boundaries, Table 3 organizes API features by platform.

Table 3. Capawesome API by platform

| Feature/Method | Android | iOS | Web |
|---|---|---|---|
| startScanSession, stopScanSession | Yes | Yes | N/A |
| nfcTagScanned listener | Yes | Yes | N/A |
| write (NDEF) | Yes | Yes | N/A |
| erase (empty NDEF) | Yes | Yes | N/A |
| makeReadOnly | Yes | Yes | N/A |
| format (NDEF) | Yes | No | N/A |
| transceive (raw) | Yes | Yes | N/A |
| connect, close (tech) | Yes | No | N/A |
| isEnabled, openSettings | Yes | No | N/A |
| isSupported, isAvailable | Yes | Yes | Yes |
| checkPermissions, requestPermissions | Yes (granted) | Yes (granted) | Yes (explicit) |
| setAlertMessage | No | Yes | N/A |
| getAntennaInfo | Yes | No | N/A |

Tag technology support varies across platforms; Table 4 summarizes coverage exposed by the plugin.

Table 4. Supported tag technologies and types

| Technology/Type | Android | iOS |
|---|---|---|
| NfcA, NfcB | Yes | No |
| NfcF (FeliCa) | Yes | Yes |
| NfcV (ISO 15693) | Yes | Yes |
| IsoDep (ISO 14443-4) | Yes | No |
| Iso7816 | No | Yes |
| Ndef | Yes | No |
| MifareClassic, MifarePlus | Yes | No |
| MifareDesfire | No | Yes |
| MifareUltralight | Yes | Yes |
| NfcBarcode, NdefFormatable | Yes | No |
| NFC Forum Type 1–4 | Yes | Type 3 supported on iOS |
| iOS Polling Options | N/A | iso14443, iso15693, iso18092 |

### Installation and Access (Sponsorware Model)

Access requires a Capawesome license key and configuration of a private npm registry. After installing the plugin, a standard Capacitor sync applies changes to native projects. This sponsorware model aligns ongoing development with sponsorship tiers while granting immediate access to insiders. Because installation flows can evolve, teams should verify current steps in the official guide before integration[^2][^5].

### Reading and Writing NDEF

The typical flow is to start a scan session, register a listener for nfcTagScanned, process the tag and its NDEF message, then stop the session. Utilities create well-known Text and URI records, and write operations are executed inside the tag-scanned handler. The plugin’s guide emphasizes session lifecycle discipline—starting scans only when needed, and stopping them promptly—to conserve battery and prevent UI deadlocks. Persisting decoded records and surfacing user feedback about tag type and content improves trust and task completion rates[^3][^23].

### Advanced: Raw Transceive and HCE

Raw command exchange enables vendor-specific workflows on supported tag families. Android requires connect and close around transceive for technologies such as NfcA; iOS exposes transceive with technology context (e.g., NFCV or FeliCa). The plugin warns that bad commands can permanently damage tags, making guardrails—validated command sets, preflight checks, and rollback strategies—essential. HCE on Android allows emulating a card and responding to APDUs through commandReceived and respond APIs; no scan session is required since interaction is driven by external readers[^2][^3].

### Permissions, Entitlements, and OS Configuration

iOS requires enabling the Near Field Communication Tag Reading capability and adding an NFCReaderUsageDescription to Info.plist. Polling options should match the tags you expect: iso14443 for certain MIFARE and ISO 7816-compatible tags, iso15693 for NFCV, and iso18092 for FeliCa. Android requires NFC permissions and features in the manifest and can optionally declare NFC as non-required to support devices without NFC. For HCE, the Android service and APDU grouping declarations must be added to the manifest. Background tag reading and launch via NFC depend on OS dispatching rules; on iOS, URI records with universal links or supported schemes are the bridge for app invocation[^16][^13][^14][^15][^2].

To make setup tangible, Table 5 consolidates configuration tasks by platform.

Table 5. Required configuration by platform

| Platform | Configuration |
|---|---|
| iOS | Add Near Field Communication Tag Reading capability; add NFCReaderUsageDescription; set polling options; ensure entitlements reflect NFC reading |
| Android | Add NFC permission and hardware feature; optionally set android:required=false for NFC; declare HCE service and APDU groups; configure intent filters for NFC dispatch |
| Web | Explicit permission checks/requests; generally not applicable to hardware-level NFC |

## Deep Dive: Capgo NFC Plugin (@capgo/capacitor-nfc)

Capgo’s NFC plugin aims for simplicity: it discovers tags, decodes common NDEF records, and writes Text and URL payloads, with helpers for vCard and JSON. It exposes erase and make-read-only, status checks (availability and enabled/disabled states), and Android Beam for peer-to-peer sharing. Its Android Beam support helps share NDEF records to another device without additional complexity. The documentation underscores practical setup steps and provides a complete TypeScript service example to accelerate adoption[^6][^7][^8][^9].

iOS configuration is manual: enable the NFC Tag Reading capability, add NFCReaderUsageDescription, and add the entitlement that signals NFC tag reading permission. Android setup requires manifest permissions and features; NFC can be marked optional to broaden device compatibility. The plugin’s status checks help guide users into NFC settings when disabled, improving task completion and reducing support friction[^6][^7].

To frame its capabilities against the Capawesome plugin, Table 6 offers a feature matrix.

Table 6. Capgo vs Capawesome capability matrix

| Capability | Capawesome | Capgo |
|---|---|---|
| Read/Write NDEF | Yes | Yes (Text, URI, vCard, JSON) |
| Erase | Yes | Yes |
| Make-read-only | Yes | Yes |
| Format (NDEF) | Yes (Android) | No |
| Raw transceive | Yes (Android/iOS) | No |
| HCE | Yes (Android) | No |
| Beam (Android P2P) | No | Yes |
| Status checks | Yes (supported, enabled, settings) | Yes (NFC_OK, NO_NFC, NFC_DISABLED, NDEF_PUSH_DISABLED) |
| Antenna info | Yes (Android) | No |

For teams prioritizing straightforward NDEF workflows, Capgo’s API provides a clean path with practical examples. When workflows demand broader technology support or HCE, Capawesome’s depth becomes necessary[^6][^2][^9].

## Implementation Patterns and Code Recipes

Robust NFC implementations start with availability and enabled checks, proceed only when permissions are satisfied, and manage scan sessions deliberately. A unifying pattern is to orchestrate flows through promises that resolve on tag scan events and always stop the session upon completion or failure. User guidance—positioning hints, feedback on antenna location, and explicit messages about NFC being disabled—reduces cognitive load and prevents abandonment[^3][^6][^17].

### Pattern: Read NDEF Tag

1. Check NFC availability and enabled status.
2. Start a scan session and register the nfcTagScanned listener.
3. When a tag is scanned, decode NDEF records (Text, URI).
4. Stop the session and surface decoded content to the user.

This pattern is implemented similarly in both plugins, with Capgo offering decoders for well-known types and Capawesome offering utilities to create records and full control over session lifecycle[^3][^6].

### Pattern: Write NDEF Text or URI

1. Create the NDEF record (Text or URI).
2. Start a scan session and register the nfcTagScanned listener.
3. On scan, perform the write operation and stop the session.

Best practices include guarding against duplicate writes (e.g., an isWriting flag) and providing confirmations that the tag now contains the expected payload. Capgo’s write helpers encapsulate common encodings, reducing the chance of malformed records[^3][^6].

### Pattern: Erase or Make Read-Only

Erase removes all data by writing an empty NDEF message; make-read-only permanently prevents future writes. Both must be executed inside a tag-scanned handler, and both require explicit user consent due to irreversibility. Capawesome exposes format on Android for tags that require NDEF initialization before writing, which is useful when handling raw tags that are not pre-formatted[^2][^3].

### Pattern: Raw Transceive (Advanced)

Transceive requires technology context (e.g., NfcA, NFCV, FeliCa). The Android sequence is connect → transceive → close; iOS may accept transceive directly for supported tech. Given the risk of tag damage, developers should use vetted command sets and consider test tags, protect against uncontrolled inputs, and include explicit warnings in the UI[^2][^3].

### Pattern: HCE (Android)

HCE allows the app to emulate a card. Listen for commandReceived, process incoming APDUs, and respond via respond. There is no scan session; link loss is signaled via nfcLinkDeactivated. HCE service declarations and APDU group configuration must be present in the manifest. This pattern enables reader-driven interactions such as door locks or point-of-sale acceptance, subject to OS constraints and reader compatibility[^14][^2][^3].

## Cross-Platform Compatibility and OS Constraints

iOS and Android differ in background handling and launch mechanisms. On iOS, the system manages NFC reader sessions with user-facing alerts and requires explicit polling options based on tag types in scope. Background tag reading is supported under specific conditions, and app invocation via NFC relies on URI records that either match a universal link or a supported URL scheme. On Android, the dispatch system can launch the app based on tag content and intent filters; NFC can be declared optional to broaden device eligibility, and HCE requires manifest-level service declarations[^15][^13][^14].

For common tag families, parity is strong for NDEF; raw tech support diverges more. Table 7 summarizes NDEF parity, and Table 8 maps raw tech availability.

Table 7. Platform parity matrix for key workflows

| Workflow | Android | iOS |
|---|---|---|
| Read NDEF | Yes | Yes |
| Write NDEF | Yes | Yes |
| Erase (empty NDEF) | Yes | Yes |
| Make-read-only | Yes | Yes |
| Format (NDEF) | Yes | No |
| HCE | Yes | No |

Table 8. Raw technology support snapshot

| Technology | Android | iOS |
|---|---|---|
| NfcA | Yes | No |
| NfcV (ISO 15693) | Yes | Yes |
| FeliCa (NFC-F) | Yes | Yes |
| IsoDep (ISO 14443-4) | Yes | No |
| Iso7816 | No | Yes |

These differences influence product design: tag selection should align to platform capabilities, and workflows should degrade gracefully when certain technologies are unsupported. Where platform exclusivity is unavoidable—HCE on Android, for example—consider architecture that isolates platform-specific components behind a common interface[^2][^15][^13][^14].

## Permissions, Security, and Risk Management

Security in NFC flows begins with explicit user consent and clear messaging. On iOS, the NFCReaderUsageDescription communicates why NFC access is needed and is presented during reader sessions. On Android, checks for isSupported and isEnabled, followed by guiding users to openSettings, ensure that NFC is available before workflows start. Beyond permission and availability, NFC introduces specific risks: data tampering, eavesdropping within short range, relay attacks, and tag cloning. A disciplined approach—using read-only when appropriate, validating payloads, and avoiding raw commands without safeguards—mitigates exposure[^16][^17][^2][^3].

Raw transceive warrants special caution. The plugin explicitly warns that a bad command can permanently damage tags, turning a routine operation into a bricked token. This risk profile makes it critical to limit transceive to vetted use cases, employ preflight checks, and design user flows that prevent accidental misuse[^2][^3].

To consolidate best practices, Table 9 presents a risk-to-mitigation matrix.

Table 9. Risk-to-mitigation matrix for NFC

| Risk | Description | Mitigation |
|---|---|---|
| Data tampering | Malicious modification of tag contents | Use read-only where possible; validate NDEF payloads before use |
| Eavesdropping | Interception within short range | Keep sessions short; restrict sensitive data on tags |
| Relay attacks | Prolonged validation using a proxy | Pair NFC with secondary checks (e.g., device presence, biometrics) |
| Tag cloning | Duplication of tag content | Use unique identifiers and server-side verification |
| Tag damage (raw) | Bad commands destroy tags | Restrict transceive to vetted sets; preflight checks; user warnings |

When dealing with personal data or security-sensitive contexts, incorporate broader Capacitor security practices: authenticate users, protect data at rest and in transit, and audit Web View exposure. These general security guidelines complement NFC-specific precautions and reduce the attack surface[^17].

## Alternatives and Ecosystem Options

Beyond the two primary Capacitor plugins, teams may encounter alternatives and legacy paths. PhoneGap NFC (via Cordova) remains a baseline for Android-first projects that rely on native APIs, with Ionic Native providing wrapper convenience. Community plugins such as Exxili and the thangman22 HCE plugin exist but vary in scope and maintenance; Exxili emphasizes cross-platform tag reading and writing, while thangman22 focuses on Android HCE and signals iOS openness to contribution. The Web NFC specification covers NDEF in browser contexts and can augment PWA experiences, particularly on Android, but it is not a general substitute for native plugins that expose raw technologies, HCE, or platform-specific features[^12][^24][^22][^19].

A full directory of Capacitor plugins is available for teams seeking additional options or complementary capabilities, and Capgo’s overview provides practical troubleshooting and performance considerations that apply broadly across NFC implementations[^21][^6].

## Testing, QA, and Troubleshooting

NFC requires real devices and disciplined testing. Emulators and simulators cannot fully replicate NFC behavior, so teams should build a device matrix that spans iOS and Android, representative tag types (Type 2, Type 3, MIFARE families), and OS versions. Test NFC disabled flows, re-entry behavior during active scans, and background/foreground transitions. A simple approach is to start scanning only when needed and stop immediately after operations to conserve battery; in error paths, clear listener state and provide user feedback to avoid zombie sessions[^6][^1].

Common pitfalls include forgetting to unsubscribe listeners (especially with legacy Ionic Native patterns), missing iOS capabilities or Info.plist entries, and incorrect polling options. Forum guidance for legacy Ionic Native implementations underscores lifecycle discipline—unsubscribing on view leave and managing flags to prevent multiple writes—which remains relevant when structuring Capacitor plugin flows with proper session management[^10].

To systematize diagnosis, Table 10 summarizes typical symptoms and fixes.

Table 10. Troubleshooting matrix

| Symptom | Probable cause | Corrective action |
|---|---|---|
| Tags not discovered on iOS | Missing NFC capability or Info.plist entry; incorrect polling options | Add Near Field Communication Tag Reading capability; set NFCReaderUsageDescription; match polling options to tag types |
| No NFC on Android | Manifest missing NFC permission/feature; hardware absent | Add manifest entries; optionally mark NFC as non-required; verify device hardware |
| Write fails repeatedly | Session not managed; tag not NDEF-formatted | Ensure write within nfcTagScanned; use format on Android as needed; stop session after write |
| App not launching on NFC tag | Dispatch rules not configured; iOS URI scheme/universal link mismatch | Configure intent filters on Android; use URI records with universal links or supported schemes on iOS |
| Battery drain | Scan session left open | Start/stop sessions explicitly; register listeners only when needed |
| Tag damaged | Unsafe raw transceive | Restrict to vetted commands; add guardrails and user warnings |

## Recommendations and Next Steps

For common NDEF use cases, choose Capgo NFC if you want an open-source plugin with a straightforward API and examples that encode Text, URL, vCard, and JSON. It is particularly effective for business cards, product information tags, and access control where tag ID verification is sufficient.

Choose Capawesome NFC for advanced needs: HCE, raw transceive, broader technology coverage, or cross-platform parity with careful iOS/Android configuration. Its utilities and event model streamline complex flows while its documentation enforces best practices for sessions and error handling.

Lock down your configuration early: enable iOS capabilities and Info.plist entries, verify Android manifests and HCE declarations if needed, and align polling and tech filters with your tag inventory. Build a QA plan around real devices, tag types, and negative cases (disabled NFC, unsupported technologies), and adopt security practices that mitigate NFC-specific risks and broader app attack surfaces[^2][^6][^17].

To translate these recommendations into action, Table 11 offers an implementation checklist.

Table 11. Implementation checklist

| Area | Action |
|---|---|
| Plugin selection | Choose Capgo for NDEF simplicity; choose Capawesome for advanced features |
| iOS setup | Add NFC capability; add NFCReaderUsageDescription; set polling options; verify entitlements |
| Android setup | Add NFC permission/feature; configure dispatch intents; declare HCE service if needed |
| Sessions | Always start/stop scan sessions; manage listeners; provide user feedback |
| Permissions | Check availability and enabled status; request permissions where applicable |
| Security | Use read-only when appropriate; validate payloads; avoid unsafe raw commands |
| QA | Test on real devices; cover tag types and OS versions; simulate disabled NFC and error paths |

## Appendices

### A. Capawesome NFC API Summary

Core methods: startScanSession, stopScanSession, write, erase, makeReadOnly, format (Android), transceive, connect/close (Android), isSupported, isEnabled (Android), openSettings (Android), checkPermissions/requestPermissions (Web; granted on Android/iOS). Utilities include NfcUtils for creating NDEF Text and URI records. Event listeners: nfcTagScanned, scanSessionCanceled (iOS), scanSessionError, commandReceived and nfcLinkDeactivated (Android). Platform exclusives include format, isEnabled, openSettings, getAntennaInfo on Android, and setAlertMessage and scanSessionCanceled on iOS[^2].

### B. Tag Technology Cross-Reference

Android supports NfcA, NfcB, NfcF, NfcV, IsoDep, Ndef, MIFARE families, NfcBarcode, and NdefFormatable. iOS exposes NfcF, NfcV, Iso7816, MIFARE Desfire, MIFARE Plus, and MIFARE Ultralight, with NFC Forum Type 3 support. Polling options on iOS (iso14443, iso15693, iso18092) determine discovery across these families[^2].

### C. Setup Snippets and Validation Checks

iOS:
- Capability: Near Field Communication Tag Reading.
- Info.plist: NFCReaderUsageDescription.
- Polling options: iso14443 (ISO 7816-compatible and some MIFARE), iso15693 (NFCV), iso18092 (FeliCa)[^16][^2].

Android:
- Manifest: NFC permission and hardware feature; optional android:required=false for NFC.
- Dispatch: intent filters for tag discovery.
- HCE: service declaration with APDU groups; ensure respond and commandReceived flows are tested[^13][^14][^2].

Validation:
- isSupported → isEnabled → openSettings when disabled.
- startScanSession → nfcTagScanned → stopScanSession.
- write/erase/makeReadOnly within scanned handler; format only on Android[^3][^2].

## Information Gaps

- Comparative performance metrics across plugins (latency, battery, throughput) are not formally benchmarked in the collected sources.
- iOS background tag reading constraints beyond high-level references require deeper perusal of Apple’s Core NFC guide.
- Comprehensive coverage for all MIFARE variants on iOS is not exhaustively mapped.
- Up-to-date maintenance status for certain community plugins (e.g., Exxili) is not fully verified.
- Licensing nuances of Capawesome’s sponsorware model for teams (tiers, costs) may need direct confirmation beyond the public overview.

## References

[^1]: Capawesome Team. “Announcing the Capacitor NFC Plugin.” DEV Community. https://dev.to/capawesome/announcing-the-capacitor-nfc-plugin-1550  
[^2]: Capawesome. “NFC Plugin for Capacitor.” https://capawesome.io/plugins/nfc/  
[^3]: Capawesome. “Exploring the Capacitor NFC API.” https://capawesome.io/blog/exploring-the-capacitor-nfc-api/  
[^4]: Capawesome Team. “capacitor-nfc GitHub (Archived).” https://github.com/capawesome-team/capacitor-nfc  
[^5]: Capawesome. “Announcing the Capacitor NFC Plugin.” https://capawesome.io/blog/announcing-the-capacitor-nfc-plugin/  
[^6]: Capgo. “NFC Plugin for Capacitor.” https://capgo.app/plugins/capacitor-nfc/  
[^7]: Capgo. “@capgo/capacitor-nfc - npm.” https://www.npmjs.com/package/@capgo/capacitor-nfc  
[^8]: Capgo. “Capacitor NFC - Capgo Docs.” https://capgo.app/docs/plugins/nfc/  
[^9]: Capgo Team. “Capacitor NFC - GitHub.” https://github.com/Cap-go/capacitor-nfc/  
[^10]: Ionic Forum. “NFC reading and writing [SOLVED].” https://forum.ionicframework.com/t/nfc-reading-and-writing-solved/96438  
[^11]: npm. “@ionic-native/nfc.” https://www.npmjs.com/package/@ionic-native/nfc  
[^12]: Chariot Solutions. “phonegap-nfc.” https://github.com/chariotsolutions/phonegap-nfc  
[^13]: Android Developers. “NFC Dispatching.” https://developer.android.com/guide/topics/connectivity/nfc/nfc#dispatching  
[^14]: Android Developers. “Host Card Emulation (HCE).” https://developer.android.com/develop/connectivity/nfc/hce#manifest-declaration  
[^15]: Apple Developer. “Adding Support for Background Tag Reading (Core NFC).” https://developer.apple.com/documentation/corenfc/adding_support_for_background_tag_reading#3032598  
[^16]: Apple Developer. “Adding a capability to a target.” https://help.apple.com/xcode/mac/current/#/dev88ff319e7  
[^17]: Capacitor. “Security Guide.” https://capacitorjs.com/docs/guides/security  
[^18]: Android Developers. “NFC Basics.” https://developer.android.com/develop/connectivity/nfc/nfc  
[^19]: W3C. “Web NFC (Draft).” https://w3c.github.io/web-nfc/  
[^20]: Ionic. “Native APIs: Open-Source Native Plugins.” https://ionicframework.com/docs/native  
[^21]: Capacitor. “Plugin Directory.” https://capacitorjs.com/directory  
[^22]: Exxili. “capacitor-nfc.” https://github.com/Exxili/capacitor-nfc  
[^23]: Capawesome Team. “NFC Utils - createNdefUriRecord.” https://github.com/capawesome-team/capacitor-plugins/tree/main/packages/nfc/docs/utils#createndefurirecord  
[^24]: thangman22. “capacitor-hce-plugin.” https://github.com/thangman22/capacitor-hce-plugin