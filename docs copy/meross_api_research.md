# Meross Cloud API for Smart Plug Integration: Authentication, Endpoints, Control, and Strategy

## Executive Summary

Meross smart plugs can be integrated programmatically via two distinct pathways that reflect the product’s architecture: a cloud-mediated approach and a local network approach. The cloud pathway relies on the Meross HTTP API for account authentication and device discovery, followed by control over Meross’ cloud MQTT infrastructure; the local pathway interacts directly with devices on the LAN via HTTP or a locally bound MQTT broker. As of 2024, Meross，旧版云接口已停用并升级至新API版本；官方并未发布开发者门户或正式HTTP/MQTT规范，整合工作主要依赖社区 reverse‑engineering 与开源库。社区经验显示 Meross 对账户行为有速率与token管理策略，未公开限制数值，但存在12–24小时暂时封禁与更高频调用导致账户受限的案例。[^12][^9][^1]

Cloud integration typically flows as follows: authenticate against a regional Meross HTTP endpoint to obtain a token and a key, list devices via the HTTP API, then issue control commands via cloud MQTT. Local integrations, by contrast, bypass the cloud by using LAN HTTP or a private MQTT broker. Device “keys” and specific headers/signatures are required for secure device communication; the meross_lan integration can either fetch the device key from the cloud profile (if devices remain cloud-paired) or work with locally paired devices that often use an empty key. A pragmatic approach is to keep devices cloud-paired for key retrieval while running control locally, thereby avoiding cloud control-plane dependency and reducing exposure to cloud rate limits.[^7][^2][^4]

Recommendation: adopt a local-first architecture for production. Use the cloud only for periodic profile refresh and key retrieval, not for routine control. Implement strict rate limiting and token hygiene, with exponential backoff and session lifecycle management. Leverage well-maintained open-source SDKs—MerossIot for Python and meross_lan for Home Assistant—to accelerate development while budgeting for ongoing maintenance due to the unofficial nature of these integrations.[^4][^2][^6][^1]

## API Landscape and Platform Architecture

Meross’ current platform comprises regional HTTP APIs for login and device discovery, and MQTT brokers for push updates and device control. On top of these, control can be executed either via cloud MQTT sessions or directly on the LAN through HTTP or a locally bound MQTT broker. In the ecosystem, MerossIot (Python) and meross_lan (Home Assistant) are the de facto integration stacks; both are community-maintained, reverse-engineered, and not officially documented by Meross. The discontinuation notice for旧版 cloud interfaces (effective 2024‑01‑01 PT) confirms a platform upgrade but does not provide developer-facing API specifications.[^12][^1][^8][^4]

To clarify roles across layers, the following table summarizes the protocol stack and how each component is used.

Table 1: Protocol stack overview—HTTP vs MQTT, Cloud vs LAN

| Layer | Role | Typical Usage | Implementation Notes |
|---|---|---|---|
| HTTP API (Cloud) | Authentication (login), Device listing, Profile refresh | Cloud login to obtain token/key; periodic device list/name refresh | Requires MD5 signature over params with timestamp/nonce; header set includes AppVersion, AppLanguage, User-Agent; regional endpoints (iotx-us/eu/ap) [^7][^2] |
| MQTT (Cloud) | Push updates, Device control | Subscribe/Publish for state and commands after login | Uses “key” from login; subject to rate limiting; real-time status updates [^2][^1][^4] |
| HTTP (LAN) | Direct device control and polling | Local control without cloud dependency | Faster polling, packing multiple requests to reduce overhead; device behavior varies; signatures/timestamps used per device-level protocol [^4][^8] |
| MQTT (Local broker) | Local-only push and control | Private MQTT binding to fully disconnect devices from cloud | Requires device key/credentials; broker TLS configuration matters; can auto-discover devices [^4][^16][^17] |
| Integration libraries | Orchestration | MerossIot (Python), meross_lan (HA) | Cloud vs LAN modes; auto-protocol switching; diagnostics and energy measurement handling [^1][^4][^8] |

The shift to new cloud interfaces in 2024 does not alter the core need for reverse-engineered clients; rather, it underscores the need for resilient designs that can tolerate protocol changes, including login structure adjustments and broker behaviors.[^12][^2]

### Cloud MQTT vs LAN HTTP vs Private MQTT

Each transport offers trade-offs across latency, reliability, rate-limiting risk, and setup complexity. The following matrix summarizes community observations.

Table 2: Cloud MQTT vs LAN HTTP vs Private MQTT—trade-off matrix

| Transport | Latency | Reliability | Rate-limit Risk | Setup Complexity | Notes |
|---|---|---|---|---|---|
| Cloud MQTT | Low (push-based) | Dependent on cloud; outages or broker changes affect control | High if overused; observed throttling and ban risk | Low to Medium | Excellent for status; control susceptible to cloud policy shifts; use sparingly [^1][^6] |
| LAN HTTP | Low to Medium (polling) | High on stable LAN; direct device reachability | Low (local); bounded by device capacity | Medium | Packing requests reduces overhead; ensure device firmware tolerates bursts; time sync/NTP matters [^4] |
| Private MQTT | Low (push-based locally) | High with correct broker; no cloud dependency | Low | High | Strong security posture; complex enrollment; broker TLS and device key handling critical; firmware quirks possible [^16][^17] |

The community reports variability across device families and firmware, especially for HomeKit/Matter-enabled plugs; some only respond reliably on LAN HTTP, while others support MQTT binding. The meross_lan integration’s “Auto” mode provides failover between HTTP and MQTT to increase robustness.[^4][^16]

## Authentication and Access (Cloud HTTP)

The Meross HTTP API is centered on a single sign-on style login and a corresponding device list call. Requests are JSON POSTs with a signed payload and specific headers. From a developer perspective, the key outputs of login are a token (for HTTP calls), a key (for MQTT sessions), and the assigned API/MQTT endpoints. Region selection is implicit via the chosen base URL (iotx-us/eu/ap). The library abstracts these flows and provides asynchronous clients for login, logout, and device listing.[^7][^2]

Table 3: HTTP methods overview—path, purpose, request payload, response, auth

| Path | Purpose | Request Payload (params) | Key Headers | Response Keys | Auth Needed |
|---|---|---|---|---|---|
| /v1/Auth/Login | Exchange credentials for token and key | Base64(JSON: email, password) | Authorization: Basic; Content-Type: application/json; AppVersion; AppLanguage; User-Agent; vender | token, key, userid, email | None beyond credentials; signature over params with timestamp/nonce [^7] |
| /v1/Device/devList | List devices bound to the account | Base64(JSON: {}) | Same as above | Array of device descriptors | token (from login) [^7] |

Upon successful login, the response provides a token for HTTP API usage and a key for MQTT broker authentication. Libraries expose these as credential objects that can be reused across sessions; login methods may also accept multi-factor authentication (MFA) codes when accounts have additional protection enabled.[^2]

Table 4: Login request/response parameters and credential fields

| Field | Type | Notes |
|---|---|---|
| email | String | Account email |
| password | String | Account password |
| token | String | Access token for HTTP API |
| key | String | Access key for MQTT authentication |
| sign | String | MD5 signature: MD5(secret + timestamp + nonce + base64(params)); lowercase hex |
| timestamp | Integer ms | Current timestamp in milliseconds |
| nonce | String | 16-character alphanumeric, uppercase |
| AppVersion, AppLanguage, User-Agent, vender | Headers | Required per API style; libraries set defaults [^7][^2] |

The documentation does not specify OAuth or API-key issuance flows; email/password remains the method for programmatic login via the HTTP API. Account security posture, including MFA, affects login methods exposed by libraries.[^2][^3]

#### Security Considerations for Authentication

Transport is encrypted via TLS. To minimize exposure, developers should avoid frequent re-login; instead, reuse tokens for the duration of a session and ensure logout is called to release resources. This is not only good hygiene but also mitigates the risk of accumulating too many active tokens, which has been linked to temporary bans. Library defaults for headers and identifiers should not be altered unless necessary, and credentials should be stored securely using environment variables and secret managers.[^9][^2]

## Device Discovery and Management

Discovery through the cloud follows the login sequence and a subsequent call to list devices. The device list returns metadata used by higher-level integrations to determine capabilities and channels; hubs appear as parent devices with sub-devices that must be enumerated separately. For example, the MSH300 hub exposes child thermostats and sensors which are discoverable via a dedicated sub-device listing call. Local integrations rely on DHCP-based discovery or manual IP entries and may augment device knowledge via the cloud profile (names, IDs) when allowed.[^7][^3][^4]

Table 5: Discovery matrix—cloud vs local methods and requirements

| Mode | Discovery Method | Prerequisites | Output |
|---|---|---|---|
| Cloud HTTP | /v1/Device/devList | Valid token; cloud-paired devices | Device descriptors for account-bound devices [^7] |
| Hub Subdevices | /v1/Device/subList | Hub UUID | Child device list (sensors, valves, etc.) [^3] |
| LAN HTTP | DHCP or manual IP | Device reachable on LAN; optional device key | Direct device entities; control via LAN protocol [^4][^8] |
| Private MQTT | Broker discovery | Device bound to local broker; client credentials | Auto-discovered devices; local push/control [^4][^16] |

A notable limitation is that device metadata and scheduling capabilities are not comprehensively documented. Many details are inferred by libraries through protocol inspection and runtime capability discovery, which can vary by firmware.[^1][^8]

## Smart Plug Control Operations (On/Off, Scheduling)

Community libraries expose device control methods such as turning a plug on or off by channel, and reading power/energy metrics for capable models (e.g., MSS310). These methods are implemented via a mix of LAN HTTP commands and MQTT topics, with the MerossIot manager orchestrating updates and push handling. For scheduling, there is no official cloud API documentation for smart plugs; users typically configure schedules via the Meross mobile app. Integrations can emulate schedules at the application layer by sending control commands at desired times, leveraging local or cloud transports depending on the architecture.[^2][^3][^4][^14][^15]

Table 6: Control operations mapping—cloud MQTT vs LAN HTTP

| Operation | Cloud MQTT | LAN HTTP |
|---|---|---|
| Turn ON/OFF | Publish command topics using key; rely on push for state | Send HTTP command; poll for state confirmation |
| Energy/power readings | Subscribe to push topics; some metrics still polled | Poll endpoint; packing reduces request count |
| Scheduling | Not exposed via public API; emulate via timed commands | Implement locally; device timezone may need set |

### Energy Monitoring Details

Meross plugs often measure energy internally and reset daily at device midnight. The meross_lan integration surfaces both the native energy readings and an estimated energy computed by integrating power samples; it also patches firmware bugs around reset behavior and persists offsets across reboots. Sampling cadence and reset alignment depend on device and integration configuration; time synchronization and timezone settings can influence these behaviors.[^8]

## Cloud vs Local Integration Strategy

A local-first architecture provides greater resilience against cloud changes and reduces ban risk. In practice:

- Use cloud for key retrieval and profile synchronization only.
- Use LAN HTTP for control and polling; enable request packing to minimize device load.
- Optionally bind devices to a private MQTT broker for local push and control, accepting higher setup complexity.

Table 7: Decision matrix—when to use Cloud MQTT, LAN HTTP, or Private MQTT

| Use Case | Preferred Transport | Rationale |
|---|---|---|
| High-frequency status updates | LAN HTTP or Private MQTT | Push-like behavior locally; avoids cloud throttling |
| Minimal setup, quick start | Cloud MQTT (temporary) | Simplifies configuration; use sparingly and rate-limit |
| Offline-resilient automations | Private MQTT or LAN HTTP | No cloud dependency; direct device reachability |
| Energy sampling continuity | LAN HTTP | Controlled polling; packing prevents device stress |
| Periodic profile sync only | Cloud HTTP | Pull names/keys; avoid control-plane reliance |

### Transport Selection and Failover

The meross_lan integration supports auto-protocol switching (“Auto” mode) that chooses between HTTP and MQTT and provides failover in both directions. Users can force a transport if device behavior or network policy requires it. Diagnostics entities reveal the active transport and protocol state, aiding operational troubleshooting.[^4][^8]

## Rate Limits, Throttling, and Operational Safety

Meross does not publish formal rate limits. Community reports indicate enforcement via temporary bans (12–24 hours) when too many tokens are active or requests are too frequent. Some users received warnings to lower request cadence to no more than one message every ten seconds per device, though these guidelines are not official. Integrations should implement rate limiting, exponential backoff, and session lifecycle management. Libraries have added rate limiting helpers over time, but the responsibility remains on the developer to avoid triggers that prompt security interventions.[^9][^10][^11][^19]

Table 8: Rate-limit strategy recommendations

| Strategy | Description | Operational Benefit |
|---|---|---|
| Token hygiene | Reuse tokens; always close/logout | Reduces token accumulation risk and bans [^9] |
| Exponential backoff | Increase delay after throttling errors | Avoids repeated triggers; stabilizes session |
| Request packing | Aggregate multiple queries per transaction | Fewer device requests; faster polling [^4] |
| Polling budgets | Upper-bound polling frequency (e.g., ≥10s/device) | Aligns with community warnings; lowers ban risk [^10] |
| Push-first on MQTT | Prefer push updates; reduce periodic pulls | Cuts HTTP calls; faster state convergence |

## Security and Compliance

Transport security relies on TLS for HTTP and MQTT. Device-level communication uses signatures and timestamps; the HTTP API’s MD5 signature scheme requires careful implementation of the secret, timestamp, nonce, and Base64-encoded params. In local setups, MQTT broker TLS configuration and certificate management are critical, and device keys must be handled as secrets—preferably retrieved from the cloud profile when devices are cloud-paired and stored securely.

Meross’ Security Advisory Policy defines responsible reporting and remediation timelines. While it does not provide development compliance specifications, it offers clear expectations for security research and disclosure. Teams should store credentials securely (e.g., environment variables, secret stores), prefer local transports where feasible, and isolate broker access via ACLs and credentials.[^7][^17][^13]

Table 9: Security control checklist

| Control | Description |
|---|---|
| TLS | Enforce TLS 1.2+ for HTTP/MQTT |
| Credential storage | Environment variables, secret managers; rotate periodically |
| MQTT broker hardening | ACLs, user auth, certificate management; avoid anonymous access unless necessary |
| Device keys | Treat as secrets; use cloud profile retrieval when possible |
| Network isolation | Restrict broker access; firewall policies for device segments |
| Logging | Avoid sensitive data; monitor for anomalies |
| Backoff and retries | Exponential backoff to avoid DoS-like patterns |
| Policy compliance | Align with Meross security advisory for reporting and remediation [^13] |

## Account Setup and Developer Access

There is no official Meross developer portal. Access is via user account credentials paired with the official Meross app. For local deployments, the meross_lan integration can fetch keys from the cloud profile or work with devices privately bound to a local MQTT broker. If devices are cloud-paired, configuration is simplified because names, UUIDs, and keys can be retrieved from the cloud; if devices are locally bound, manual entries (host, device key) are typically required. On Home Assistant, installation via HACS or manual upload, followed by discovery or manual addition, is standard. Firmware updates should be performed with the official app; changes may affect local configuration or features.[^4][^16][^3]

Table 10: Setup pathways—cloud-paired vs locally MQTT-bound

| Pathway | Prerequisites | Steps | Pros | Cons |
|---|---|---|---|---|
| Cloud-paired (keys from cloud) | Active Meross account; devices paired in app | Add Meross LAN; allow cloud profile fetch; set protocol to Auto/HTTP | Simple discovery; accurate keys; names synchronized | Cloud dependency for setup; rate-limit risk minimized but present |
| Locally MQTT-bound | Local MQTT broker; device enrollment | Bind devices to broker; configure HA integration; set device key | Cloudless control; strong resilience | Complex setup; TLS/cert management; device/firmware quirks |

## Code Examples and SDK Availability

The MerossIot Python library provides asynchronous device discovery and control. It includes an HTTP client for login and device listing, and a manager that coordinates MQTT interactions. Basic usage involves creating an HTTP client from user/password, initializing the manager, discovering devices, and issuing on/off commands. The library supports regional API base selection (iotx-us/eu/ap), rate limiting helpers, and optional local LAN HTTP control for certain devices.[^2][^1][^3][^18]

For Home Assistant, the meross_lan integration offers auto-protocol switching, diagnostics entities, and energy handling. It can be installed via HACS or manually, and supports both cloud and local modes. A service is exposed to send raw requests without manual signature/timestamp computation, and diagnostic tracing can reveal unknown message namespaces for extended capabilities.[^4][^8][^5]

Table 11: SDKs and integrations—features comparison

| SDK/Integration | Language | Protocols | Discovery | Control | Diagnostics | Notes |
|---|---|---|---|---|---|---|
| MerossIot | Python | Cloud HTTP, Cloud MQTT, LAN HTTP (select) | HTTP list devices; manager discovery | Toggle, energy, device-specific | Logging, sniffer utility | Unofficial; rate limiting helpers [^1][^2][^3] |
| meross_lan | Python (HA integration) | LAN HTTP, Local MQTT, Cloud MQTT (profile sync) | DHCP/manual; MQTT auto-discovery | Toggle, dim, sensors; service requests | DND, WiFi, protocol sensor, diagnostics | Auto-switching; energy patches [^4][^8] |
| meross-homeassistant | Python (HA custom component) | Cloud HTTP/MQTT | Cloud-based | Cloud-driven control | HA entity management | Community-maintained [^5] |
| meross-cloud | Node.js | Cloud MQTT/HTTP | Cloud login | MQTT control | N/A | Community library [^19] |

Example (Python, MerossIot): turn a smart plug on/off and read energy

```python
import asyncio
import os
from meross_iot.http_api import MerossHttpClient
from meross_iot.manager import MerossManager

EMAIL = os.environ.get("MEROSS_EMAIL")
PASSWORD = os.environ.get("MEROSS_PASSWORD")
# Choose regional base: iotx-us.meross.com | iotx-eu.meross.com | iotx-ap.meross.com
BASE = "iotx-eu.meross.com"

async def main():
    http_api_client = await MerossHttpClient.async_from_user_password(
        api_base_url=f"https://{BASE}", email=EMAIL, password=PASSWORD
    )
    manager = MerossManager(http_client=http_api_client)
    await manager.async_init()
    await manager.async_device_discovery()
    plugs = manager.find_devices(device_type="mss310")  # adjust as needed
    if not plugs:
        print("No plugs found")
    else:
        dev = plugs[0]
        await dev.async_update()
        print(f"Toggling {dev.name}")
        await dev.async_turn_on(channel=0)
        await asyncio.sleep(2)
        await dev.async_turn_off(channel=0)
    manager.close()
    await http_api_client.async_logout()

if __name__ == "__main__":
    asyncio.run(main())
```

Example (Home Assistant): key integration options

- Install meross_lan via HACS; restart Home Assistant.
- Add integration; optionally enable cloud profile to fetch device keys.
- Set protocol to Auto; adjust polling period (default 30 seconds).
- Use the service meross_lan.request to send raw commands where needed.
- Enable diagnostics entities for protocol and energy insights.[^4][^8]

## Risks, Constraints, and Maintenance Strategy

Unofficial APIs evolve. Meross has discontinued旧版 cloud interfaces, and changes can break integrations unexpectedly. Device firmware updates may remove or alter features, impacting local configuration or MQTT binding. The mitigation strategy includes pinning library versions, monitoring upstream repos for breaking changes, staging firmware updates, and validating behavior in a test environment. For high-availability deployments, prefer local transports and implement monitoring and alerts around device reachability and protocol state.[^12][^8]

## Implementation Plan and Checklists

A practical implementation progresses through environment setup, credentials management, discovery, control verification, rate-limit configuration, and documentation. The following checklist organizes workstreams to ensure completeness.

Table 12: End-to-end implementation checklist

| Step | Tasks | References |
|---|---|---|
| Environment setup | Choose integration (MerossIot or meross_lan); install dependencies; select transport | [^1][^4] |
| Credentials | Store email/password securely; plan MFA if needed; regional base selection | [^2][^3] |
| Discovery | Cloud HTTP devList; hub subdevices; LAN DHCP/manual; MQTT auto-discovery | [^7][^3][^4] |
| Control verification | Toggle on/off; energy reading; diagnostic entities | [^2][^8] |
| Scheduling | App-side configuration; application-layer emulation via timed commands | [^14][^15] |
| Rate limiting | Implement backoff; request packing; logout hygiene; polling budgets | [^9][^4][^10] |
| Security | Enforce TLS; secure broker; ACLs; secret storage; time sync | [^7][^17][^4] |
| Documentation | Record endpoints, credentials location, device keys, protocol states | [^8][^3] |

Table 13: Regional endpoints and recommended flows

| Region | HTTP Base | Flow |
|---|---|---|
| US | iotx-us.meross.com | Login → devList → MQTT control (cloud) or LAN HTTP/Local MQTT |
| EU | iotx-eu.meross.com | Same |
| AP | iotx-ap.meross.com | Same |

Testing should span multiple device models (MSS110, MSS310, MSS425, etc.) and include firmware variants. Validate energy sampling behavior, transport failover, and schedule emulation accuracy. Record operational metrics such as polling latency and MQTT push frequency to fine-tune rate budgets.

## Appendix: Command and Message Cheat Sheet

The following summarizes command/control flows at a high level. Exact topics and payloads are device-dependent and mediated by libraries.

Table 14: Command quick-reference—device type, action, transport, library method, flow

| Device Type | Action | Transport | Library Method | Flow Notes |
|---|---|---|---|---|
| Smart plug (MSS310) | Turn ON/OFF | LAN HTTP | async_turn_on/off | Packing reduces requests; poll for state [^2][^4] |
| Smart plug (MSS310) | Read energy | LAN HTTP | async_update; electricity mixins | Energy resets at device midnight; patches available [^8] |
| Hub (MSH300) | Enumerate subdevices | Cloud HTTP | async_list_hub_subdevices | Discover children after hub discovery [^3] |
| Garage opener (MSG100) | Toggle | Cloud MQTT or LAN HTTP | Device-specific methods | Push confirmation via MQTT; HTTP polling viable [^1][^4] |
| Thermostat (MTS100) | Set temperature | Cloud MQTT or LAN HTTP | Device-specific methods | Preset temperatures; scheduling via app or emulation [^4][^14] |

## Information Gaps

- No official Meross developer portal or public API documentation; protocols are reverse‑engineered.
- No authoritative documentation for plug scheduling APIs; schedules are app-side.
- Exact rate limits and ban criteria are not documented by Meross; community observations vary.
- Full MQTT topics and payload schemas for all device types are not formally documented.
- No official guidance on OAuth or API key issuance; email/password remains the primary method.
- Formal compliance requirements for API usage beyond the security advisory policy are not provided.

## References

[^1]: Welcome to MerossIot Library’s documentation! — https://albertogeniola.github.io/MerossIot/
[^2]: HTTP Client — MerossIot Library documentation — https://albertogeniola.github.io/MerossIot/api-reference/http.html
[^3]: Quick start — MerossIot Library documentation — https://albertogeniola.github.io/MerossIot/quick-start.html
[^4]: krahabb/meross_lan: Home Assistant integration for Meross devices — https://github.com/krahabb/meross_lan
[^5]: albertogeniola/meross-homeassistant: Custom component — https://github.com/albertogeniola/meross-homeassistant
[^6]: Apollon77/meross-cloud — https://github.com/Apollon77/meross-cloud
[^7]: HTTP APIs · MerossIot Wiki — https://github.com/albertogeniola/MerossIot/wiki/HTTP-APIs
[^8]: Meross LAN details · Wiki — https://github.com/krahabb/meross_lan/wiki/Meross-LAN-details
[^9]: Common gotchas — MerossIot Library documentation — https://albertogeniola.github.io/MerossIot/common-gotchas.html
[^10]: Too many request to meross cloud · Issue #151 — https://github.com/albertogeniola/meross-homeassistant/issues/151
[^11]: Meross rate limit · r/homeassistant — https://www.reddit.com/r/homeassistant/comments/1esafpd/meross_rate_limit/
[^12]: Discontinuation of Old Cloud API and Upgrade to New API #556 — https://github.com/homebridge-plugins/homebridge-meross/issues/556
[^13]: Meross Security Advisory Policy — https://www.meross.com/en-gc/mTerminal/security-advisory-policy
[^14]: What a Routine can do? — Meross — https://www.meross.com/support/FAQ/448.html
[^15]: How to set schedule for my smart thermostat? — Meross — https://www.meross.com/en-gc/mTerminal/FAQ/585.html
[^16]: A complete meross integration guide · Discussions — https://github.com/krahabb/meross_lan/discussions/63
[^17]: Guide: Local MQTT broker with Meross and Home Assistant — https://www.creatingsmarthome.com/index.php/2022/08/28/guide-local-mqtt-broker-with-meross-and-home-assistant/
[^18]: meross-iot — PyPI — https://pypi.org/project/meross-iot/
[^19]: meross-iot GitHub repository — https://github.com/albertogeniola/MerossIot
[^20]: Meross Protocol Inspection — https://albertogeniola.github.io/MerossIot/meross-protocol.html