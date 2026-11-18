# Design rule catalogue

Generated from `src/engine/rules.ts`. Each rule is a pure function of the modelled design. References are indicative pointers, not a compliance determination.

## Segmentation

### SEG-001 · Cross-zone flow bypasses a conduit

**Default severity:** high

A flow connects assets in different zones but does not terminate on, or route via, a boundary device (firewall, data diode, VPN gateway).

**Fix:** Route the flow through a boundary device: connect it to the firewall, add the firewall under 'Routed via', or model the physical links through it.

**References:** IEC 62443-3-3 SR 5.1, SR 5.2; IEC 62443-3-2 ZCR 3; NIST SP 800-82r3 §5.2

### SEG-002 · Enterprise talks directly to control level

**Default severity:** high

A flow connects Purdue level 4/5 directly with level 0–2 without a boundary device at either end.

**Fix:** Break the path at the industrial DMZ (level 3.5) using a broker, replica or jump host.

**References:** IEC 62443-3-3 SR 5.1; NIST SP 800-82r3 §5.2.2 (DMZ)

### SEG-003 · Enterprise ↔ operations without a DMZ

**Default severity:** medium

A flow connects level 4/5 with level 3 directly, with no DMZ intermediary or boundary device.

**Fix:** Terminate enterprise connections in the industrial DMZ (historian replica, broker, jump host).

**References:** NIST SP 800-82r3 §5.2.2; IEC 62443-3-2 ZCR 3.4

### SEG-004 · Asset outside any zone

**Default severity:** medium

The asset is not placed inside a zone on the canvas, so no security requirements apply to it.

**Fix:** Drag the asset into the zone it belongs to, or create a zone for it.

**References:** IEC 62443-3-2 ZCR 3.1

### SEG-005 · Zone has no Security Level Target

**Default severity:** low

The zone has no SL-T, so countermeasures can't be sized.

**Fix:** Set an SL-T from the zone risk assessment.

**References:** IEC 62443-3-2 ZCR 5

### SEG-007 · Flow from lower-SL zone into higher-SL zone

**Default severity:** low

A zone with a lower SL-T initiates communication into a zone with a higher SL-T.

**Fix:** Make sure the conduit enforces the higher zone's requirements (whitelisting, authentication, DPI).

**References:** IEC 62443-3-2 ZCR 3.3; IEC 62443-3-3 SR 5.2

### CAP-001 · Component SL-C below zone SL-T

**Default severity:** medium

The asset's security level capability is lower than the target of its zone.

**Fix:** Add compensating countermeasures at zone level, or select a component certified to the required SL-C (IEC 62443-4-2).

**References:** IEC 62443-3-3 §4; IEC 62443-4-2

## Model hygiene

### SEG-006 · Overlapping zones

**Default severity:** low

Two zones overlap without one fully containing the other, so membership is ambiguous.

**Fix:** Resize the zones so they either nest cleanly or don't overlap.

**References:** IEC 62443-3-2 ZCR 3.2

### PRO-005 · Cross-zone flow with unspecified protocol

**Default severity:** low

A cross-zone flow is generic TCP/IP or has no protocol, so no firewall rule can be derived.

**Fix:** Pick the actual application protocol(s), or set explicit ports.

**References:** IEC 62443-3-2 ZCR 3.4

### PRO-006 · Unknown protocol

**Default severity:** info

A protocol isn't in the knowledge base, so ports and security properties are unknown.

**Fix:** Set explicit ports on the flow, or add the protocol to src/data/protocols.ts.

### HYG-001 · Unconnected asset

**Default severity:** info

The asset has no flows or links.

**Fix:** Model its communications, or remove it if it's out of scope.

### HYG-002 · Empty zone

**Default severity:** info

The zone contains no assets.

**Fix:** Add assets or delete the zone.

### HYG-003 · 'Routed via' references a non-boundary device

**Default severity:** low

A flow lists a device under 'Routed via' that doesn't exist or isn't a boundary device.

**Fix:** Pick a firewall, data diode or VPN gateway.

## Safety

### SAF-001 · Safety system shares a zone with non-safety assets

**Default severity:** medium

A safety-related asset is in the same zone as basic control or IT assets.

**Fix:** Put safety systems (SIS, safety PLCs, SIL-rated rail systems) in a dedicated safety zone.

**References:** IEC 62443-3-2 ZCR 3.3 (safety-related assets); IEC 61511-1 §11.2.4; CLC/TS 50701 §6

### SAF-002 · Safety system reachable from enterprise or external

**Default severity:** critical

A safety-related asset has a direct flow to level 4/5 or an external/remote entry point.

**Fix:** Remove the flow. Safety data leaving the safety zone should go through a data diode or read-only gateway.

**References:** IEC 61511-1 §11.2.4; IEC 62443-3-3 SR 5.1

### SAF-003 · Non-safety system initiates communication to a safety system

**Default severity:** medium

A non-safety asset can start a session with a safety-related asset.

**Fix:** Make the flow read-only or one-way from the safety system, or enforce write protection (key switch, CIP Safety, SIL-rated gateway).

**References:** IEC 61511-1 §11.2.4; IEC 62443-3-3 SR 3.1

### SAF-004 · Wireless link to safety system or SL 3+ zone

**Default severity:** medium

A wireless link touches a safety-related asset or a zone with SL-T 3 or higher.

**Fix:** Use wired links for safety functions, or justify the wireless link with a dedicated risk assessment and strong link-layer security.

**References:** IEC 62443-3-3 SR 1.6, SR 5.1; IEC 61511-1 §11.2.4

## Remote access

### RA-001 · Remote entry point reaches OT directly

**Default severity:** high

An external or remote-entry asset (VPN, cloud, vendor, internet, cellular router) initiates a flow straight to an OT asset, without a jump host or DMZ.

**Fix:** Terminate remote sessions on a jump host or managed remote-access broker in the DMZ, with MFA, session recording and time-bound approval.

**References:** IEC 62443-3-3 SR 1.13; NCSC CAF B2.c; NIST SP 800-82r3 §6.2

### RA-002 · Control-level asset connects out to an external service

**Default severity:** medium

A level 0–2 asset initiates a connection directly to an external or remote-entry asset.

**Fix:** Publish data outward through a DMZ broker, or use a data diode for one-way telemetry.

**References:** IEC 62443-3-3 SR 5.1; NIST SP 800-82r3 §5.2

## Protocols

### PRO-001 · Insecure protocol crosses a zone boundary

**Default severity:** medium

A protocol with no built-in authentication or encryption is carried between zones and the flow isn't marked as protected.

**Fix:** Use the secure variant, wrap it in a tunnel (IPsec/TLS), or enforce DPI with read-only function codes at the conduit.

**References:** IEC 62443-3-3 SR 3.1, SR 4.1; IEC 62351

### PRO-002 · Non-routable protocol across zones

**Default severity:** medium

A layer-2 or fieldbus protocol (GOOSE, SV, PROFINET RT, MVB, CAN…) is modelled between different zones without a gateway.

**Fix:** Either the zone boundary is drawn in the wrong place, or a gateway is missing. Fix the model so the protocol stays within its broadcast domain.

**References:** IEC 61850-90-4; IEC 61375; IEC 62443-3-2 ZCR 3

### PRO-003 · Clear-text management protocol

**Default severity:** medium

Telnet, HTTP, FTP or SNMPv1/v2c is used, so credentials travel in clear text.

**Fix:** Switch to SSH, HTTPS, SFTP or SNMPv3 (authPriv) and disable the insecure service on the device.

**References:** IEC 62443-3-3 SR 1.5, SR 4.1; IEC 62443-4-2 CR 4.1

### PRO-004 · Bidirectional flow through a data diode

**Default severity:** high

A flow through a unidirectional gateway is modelled as bidirectional, which a diode can't carry.

**Fix:** Make the flow one-way, from the higher-trust side outward.

**References:** IEC 62443-3-3 SR 5.1 RE 3

## Addressing

### ADR-001 · Duplicate IP address

**Default severity:** high

Two or more assets share the same IPv4 address.

**Fix:** Give each interface a unique address.

### ADR-002 · Invalid IP address

**Default severity:** medium

The IP / CIDR field isn't a valid IPv4 address.

**Fix:** Use the form 10.10.20.5 or 10.10.20.5/24.

### ADR-003 · IP outside the zone subnet

**Default severity:** medium

The asset's address isn't inside the subnet assigned to its zone.

**Fix:** Re-address the asset, or move it to the correct zone.

**References:** IEC 62443-3-3 SR 5.1

### ADR-004 · VLAN differs from zone VLAN

**Default severity:** low

The asset's VLAN differs from the VLAN assigned to its zone.

**Fix:** Check whether the asset is in the right zone, or document why it uses another VLAN.

## Monitoring

### MON-001 · Critical zone without network monitoring

**Default severity:** medium

A zone with high or critical assets has no IDS sensor inside it or connected to it.

**Fix:** Add a passive OT IDS sensor fed from a SPAN or TAP in this zone.

**References:** IEC 62443-3-3 SR 6.2; NCSC CAF C1

## Resilience

### RES-001 · Critical asset has a single physical path

**Default severity:** low

A critical asset has only one physical link and no redundancy protocol.

**Fix:** Add a redundant path (PRP/HSR/MRP ring or dual-homing) where availability requirements need it.

**References:** IEC 62443-3-3 SR 7.6; IEC 62439

## Severity adjustments

- **SEG-002** drops to *medium* when the flow passes a boundary device, and to *low* when it is also encrypted or authenticated. It rises to *critical* when the control-level end is a safety system.
- **RA-001** is *critical* when the target is level 0–1 or safety-related, and drops to *low* through a protected conduit (boundary device plus encryption or authentication).
- **PRO-001** is *high* when either zone is SL 3 or above, and *low* when the flow is one-way through a data diode.
- **CAP-001** is *high* when the gap between SL-C and SL-T is two levels or more.
- **SAF-002** doesn't fire for an authenticated flow between two safety systems (for example EuroRadio between EVC and RBC).
