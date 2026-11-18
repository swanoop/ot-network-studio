/*
 * Protocol knowledge base used by the inspector, the rule engine and the
 * firewall-rule matrix. Port numbers are the IANA / standard defaults;
 * real deployments vary, so every flow can override them.
 */

export type ProtocolFamily =
  | "Generic"
  | "Industrial"
  | "Power / Utility"
  | "Building"
  | "Rail"
  | "Fieldbus"
  | "IIoT"
  | "Infrastructure"
  | "Management / IT";

export interface ProtocolDefinition {
  name: string;
  family: ProtocolFamily;
  /** Transport/ports, e.g. ["tcp/502"]. Empty for non-IP protocols. */
  ports: string[];
  /** false = layer-2 or fieldbus; cannot cross a routed boundary. */
  routable: boolean;
  /** No authentication or encryption in the base protocol. */
  insecure: boolean;
  /** Protection guaranteed by the selected protocol variant; never infer it from insecure:false. */
  protection?: "both" | "encrypted" | "authenticated";
  /** Clear-text management protocol (credentials on the wire). */
  cleartextManagement?: boolean;
  /** A secure alternative to suggest in findings. */
  secureAlternative?: string;
  description: string;
}

export const PROTOCOL_CATALOG: ProtocolDefinition[] = [
  { name: "TCP/IP", family: "Generic", ports: [], routable: true, insecure: false, description: "Unspecified IP traffic. Replace with a concrete protocol for a useful rule matrix." },

  // Industrial
  { name: "Modbus TCP", family: "Industrial", ports: ["tcp/502"], routable: true, insecure: true, secureAlternative: "Modbus/TCP Security", description: "No authentication; any client can read and write registers." },
  { name: "Modbus/TCP Security", family: "Industrial", ports: ["tcp/802"], routable: true, insecure: false, protection: "both", description: "Modbus over TLS with role-based authorisation." },
  { name: "Modbus RTU", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "Serial Modbus (RS-485/RS-232)." },
  { name: "OPC UA", family: "Industrial", ports: ["tcp/4840"], routable: true, insecure: true, description: "Secure when configured with Sign or SignAndEncrypt. Check the security policy." },
  { name: "OPC DA (DCOM)", family: "Industrial", ports: ["tcp/135", "tcp/1024-65535"], routable: true, insecure: true, secureAlternative: "OPC UA", description: "Classic OPC over DCOM; needs wide dynamic port ranges and is hard to firewall." },
  { name: "S7comm", family: "Industrial", ports: ["tcp/102"], routable: true, insecure: true, secureAlternative: "S7comm-plus with TLS (TIA V17+)", description: "Siemens S7 ISO-on-TCP; legacy variants have no authentication." },
  { name: "EtherNet/IP", family: "Industrial", ports: ["tcp/44818", "udp/2222"], routable: true, insecure: true, secureAlternative: "CIP Security", description: "CIP over Ethernet; explicit messaging on 44818, implicit I/O on 2222." },
  { name: "CIP Security", family: "Industrial", ports: ["tcp/2221", "udp/2221"], routable: true, insecure: false, protection: "both", description: "EtherNet/IP with TLS/DTLS." },
  { name: "PROFINET", family: "Industrial", ports: [], routable: false, insecure: true, description: "PROFINET IO RT/IRT is layer-2 (EtherType 0x8892) and stays within a cell." },
  { name: "PROFIBUS", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "RS-485 fieldbus." },
  { name: "HART", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "4–20 mA with a digital overlay." },
  { name: "HART-IP", family: "Industrial", ports: ["tcp/5094", "udp/5094"], routable: true, insecure: true, description: "HART over IP." },

  // Power / utility
  { name: "DNP3", family: "Power / Utility", ports: ["tcp/20000"], routable: true, insecure: true, secureAlternative: "DNP3-SA", description: "Widely used SCADA telemetry with no built-in authentication." },
  { name: "DNP3-SA", family: "Power / Utility", ports: ["tcp/20000"], routable: true, insecure: false, protection: "authenticated", description: "DNP3 with Secure Authentication v5/v6 (IEEE 1815)." },
  { name: "IEC 60870-5-104", family: "Power / Utility", ports: ["tcp/2404"], routable: true, insecure: true, secureAlternative: "IEC 60870-5-104 + IEC 62351-3 TLS", description: "Telecontrol over TCP; no authentication unless IEC 62351 is applied." },
  { name: "IEC 60870-5-101", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "Serial telecontrol." },
  { name: "IEC 61850 MMS", family: "Power / Utility", ports: ["tcp/102"], routable: true, insecure: true, secureAlternative: "IEC 61850 MMS over TLS (IEC 62351-4)", description: "Client/server reporting and control." },
  { name: "IEC 61850 MMS/TLS", family: "Power / Utility", ports: ["tcp/3782"], routable: true, insecure: false, protection: "both", description: "MMS secured per IEC 62351-4." },
  { name: "IEC 61850 GOOSE", family: "Power / Utility", ports: [], routable: false, insecure: true, description: "Layer-2 multicast trip and interlock messages (EtherType 0x88B8)." },
  { name: "IEC 61850 SV", family: "Power / Utility", ports: [], routable: false, insecure: true, description: "Layer-2 sampled values (EtherType 0x88BA) on the process bus." },
  { name: "IEC 61850 R-GOOSE", family: "Power / Utility", ports: ["udp/102"], routable: true, insecure: true, description: "Routable GOOSE. Apply IEC 62351-6 authentication between sites." },
  { name: "IEC 61400-25", family: "Power / Utility", ports: ["tcp/102"], routable: true, insecure: true, description: "Wind-turbine communications (MMS mapping)." },
  { name: "IEC 62351 / IPsec tunnel", family: "Infrastructure", ports: ["udp/500", "udp/4500"], routable: true, insecure: false, protection: "both", description: "Encrypted tunnel between sites." },

  // Building / IIoT
  { name: "BACnet/IP", family: "Building", ports: ["udp/47808"], routable: true, insecure: true, secureAlternative: "BACnet/SC", description: "Building automation; no authentication." },
  { name: "BACnet/SC", family: "Building", ports: ["tcp/443"], routable: true, insecure: false, protection: "both", description: "BACnet Secure Connect (TLS WebSockets)." },
  { name: "MQTT", family: "IIoT", ports: ["tcp/1883"], routable: true, insecure: true, secureAlternative: "MQTT/TLS", description: "Plain-text publish/subscribe." },
  { name: "MQTT/TLS", family: "IIoT", ports: ["tcp/8883"], routable: true, insecure: false, protection: "both", description: "MQTT over TLS." },

  // Rail (IEC 61375 and on-board)
  { name: "TRDP", family: "Rail", ports: ["udp/17224", "tcp/17225", "udp/17225"], routable: true, insecure: true, description: "Train Real-time Data Protocol (IEC 61375-2-3) on the ECN/ETB." },
  { name: "MVB", family: "Rail", ports: [], routable: false, insecure: true, description: "Multifunction Vehicle Bus (IEC 61375-3-1)." },
  { name: "WTB", family: "Rail", ports: [], routable: false, insecure: true, description: "Wire Train Bus (IEC 61375-2-1)." },
  { name: "CAN", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "Controller Area Network (ISO 11898)." },
  { name: "CAN FD", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "CAN with flexible data rate." },
  { name: "Subset-037 (EuroRadio)", family: "Rail", ports: ["tcp/9001"], routable: true, insecure: false, protection: "authenticated", description: "ETCS RBC–onboard safe connection. MAC-protected. The port is deployment-specific." },
  { name: "Subset-098 (RBC-RBC)", family: "Rail", ports: [], routable: true, insecure: false, protection: "authenticated", description: "Safe RBC handover link." },
  { name: "Interlocking proprietary", family: "Rail", ports: [], routable: true, insecure: true, description: "Vendor-specific interlocking ↔ object controller protocol. Check the safety-layer protection." },
  { name: "Serial", family: "Fieldbus", ports: [], routable: false, insecure: true, description: "Generic serial link." },

  // Infrastructure / management
  { name: "PTP (IEEE 1588)", family: "Infrastructure", ports: ["udp/319", "udp/320"], routable: true, insecure: true, description: "Precision time; spoofing affects protection and sequence-of-events." },
  { name: "NTP", family: "Infrastructure", ports: ["udp/123"], routable: true, insecure: true, description: "Network time." },
  { name: "DNS", family: "Infrastructure", ports: ["udp/53", "tcp/53"], routable: true, insecure: true, description: "Name resolution." },
  { name: "Syslog", family: "Management / IT", ports: ["udp/514"], routable: true, insecure: true, description: "Plain syslog. Use TLS (6514) across zones where possible." },
  { name: "Syslog/TLS", family: "Management / IT", ports: ["tcp/6514"], routable: true, insecure: false, protection: "both", description: "Syslog over TLS." },
  { name: "SNMPv2c", family: "Management / IT", ports: ["udp/161", "udp/162"], routable: true, insecure: true, cleartextManagement: true, secureAlternative: "SNMPv3 (authPriv)", description: "Community strings are sent in clear text." },
  { name: "SNMPv3", family: "Management / IT", ports: ["udp/161", "udp/162"], routable: true, insecure: false, description: "Authenticated, encrypted SNMP." },
  { name: "SSH", family: "Management / IT", ports: ["tcp/22"], routable: true, insecure: false, protection: "both", description: "Secure shell." },
  { name: "Telnet", family: "Management / IT", ports: ["tcp/23"], routable: true, insecure: true, cleartextManagement: true, secureAlternative: "SSH", description: "Clear-text remote shell." },
  { name: "HTTP", family: "Management / IT", ports: ["tcp/80"], routable: true, insecure: true, cleartextManagement: true, secureAlternative: "HTTPS", description: "Clear-text web management." },
  { name: "HTTPS", family: "Management / IT", ports: ["tcp/443"], routable: true, insecure: false, protection: "both", description: "TLS web traffic." },
  { name: "FTP", family: "Management / IT", ports: ["tcp/21"], routable: true, insecure: true, cleartextManagement: true, secureAlternative: "SFTP", description: "Clear-text file transfer." },
  { name: "SFTP", family: "Management / IT", ports: ["tcp/22"], routable: true, insecure: false, protection: "both", description: "File transfer over SSH." },
  { name: "RDP", family: "Management / IT", ports: ["tcp/3389"], routable: true, insecure: false, description: "Remote desktop. Broker through a jump host." },
  { name: "SMB", family: "Management / IT", ports: ["tcp/445"], routable: true, insecure: true, description: "File sharing; a common lateral-movement path." },
  { name: "LDAPS", family: "Management / IT", ports: ["tcp/636"], routable: true, insecure: false, protection: "both", description: "Directory services over TLS." },
  { name: "Kerberos", family: "Management / IT", ports: ["tcp/88", "udp/88"], routable: true, insecure: false, description: "Authentication." },
  { name: "SQL", family: "Management / IT", ports: ["tcp/1433"], routable: true, insecure: false, description: "Database replication (e.g. historian mirror)." }
];

/** Older names (schema v1) mapped to current catalogue entries. */
export const PROTOCOL_ALIASES: Record<string, string> = {
  "IEC 61850": "IEC 61850 MMS",
  "SNMP": "SNMPv2c"
};

const BY_NAME = new Map(PROTOCOL_CATALOG.map((p) => [p.name, p]));

export function getProtocol(name: string): ProtocolDefinition | undefined {
  return BY_NAME.get(name) ?? BY_NAME.get(PROTOCOL_ALIASES[name] ?? "");
}

export const PROTOCOLS = PROTOCOL_CATALOG.map((p) => p.name);

export const PROTOCOL_FAMILIES: ProtocolFamily[] = [
  "Generic", "Industrial", "Power / Utility", "Rail", "Fieldbus", "IIoT", "Building", "Infrastructure", "Management / IT"
];

/** Security guarantees of a flow: explicit flags take priority; insecure:false alone
 * means only that the protocol is not catalogued as inherently insecure.
 * A secure variant supplies guaranteed protection; configurable modes (e.g. OPC UA,
 * SNMPv3) require explicit flags to establish protection on this connection.
 */
export function protocolProtection(name: string, flow: { encrypted?: boolean; authenticated?: boolean }) {
  const intrinsic = getProtocol(name)?.protection;
  const encrypted = flow.encrypted === true || intrinsic === "both" || intrinsic === "encrypted";
  const authenticated = flow.authenticated === true || intrinsic === "both" || intrinsic === "authenticated";
  return { encrypted, authenticated, secured: encrypted && authenticated };
}
