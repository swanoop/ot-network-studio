# Protocol knowledge base

Generated from `src/data/protocols.ts`. Default ports drive the firewall rule matrix. Every flow can override them.

| Protocol | Family | Ports | Routable | Insecure by default | Secure alternative |
|---|---|---|---|---|---|
| TCP/IP | Generic | — | yes | no | — |
| Modbus TCP | Industrial | tcp/502 | yes | yes | Modbus/TCP Security |
| Modbus/TCP Security | Industrial | tcp/802 | yes | no | — |
| Modbus RTU | Fieldbus | — | no | yes | — |
| OPC UA | Industrial | tcp/4840 | yes | no | — |
| OPC DA (DCOM) | Industrial | tcp/135, tcp/1024-65535 | yes | yes | OPC UA |
| S7comm | Industrial | tcp/102 | yes | yes | S7comm-plus with TLS (TIA V17+) |
| EtherNet/IP | Industrial | tcp/44818, udp/2222 | yes | yes | CIP Security |
| CIP Security | Industrial | tcp/2221, udp/2221 | yes | no | — |
| PROFINET | Industrial | — | no | yes | — |
| PROFIBUS | Fieldbus | — | no | yes | — |
| HART | Fieldbus | — | no | yes | — |
| HART-IP | Industrial | tcp/5094, udp/5094 | yes | yes | — |
| DNP3 | Power / Utility | tcp/20000 | yes | yes | DNP3-SA |
| DNP3-SA | Power / Utility | tcp/20000 | yes | no | — |
| IEC 60870-5-104 | Power / Utility | tcp/2404 | yes | yes | IEC 60870-5-104 + IEC 62351-3 TLS |
| IEC 60870-5-101 | Fieldbus | — | no | yes | — |
| IEC 61850 MMS | Power / Utility | tcp/102 | yes | yes | IEC 61850 MMS over TLS (IEC 62351-4) |
| IEC 61850 MMS/TLS | Power / Utility | tcp/3782 | yes | no | — |
| IEC 61850 GOOSE | Power / Utility | — | no | yes | — |
| IEC 61850 SV | Power / Utility | — | no | yes | — |
| IEC 61850 R-GOOSE | Power / Utility | udp/102 | yes | yes | — |
| IEC 61400-25 | Power / Utility | tcp/102 | yes | yes | — |
| IEC 62351 / IPsec tunnel | Infrastructure | udp/500, udp/4500 | yes | no | — |
| BACnet/IP | Building | udp/47808 | yes | yes | BACnet/SC |
| BACnet/SC | Building | tcp/443 | yes | no | — |
| MQTT | IIoT | tcp/1883 | yes | yes | MQTT/TLS |
| MQTT/TLS | IIoT | tcp/8883 | yes | no | — |
| TRDP | Rail | udp/17224, tcp/17225, udp/17225 | yes | yes | — |
| MVB | Rail | — | no | yes | — |
| WTB | Rail | — | no | yes | — |
| CAN | Fieldbus | — | no | yes | — |
| CAN FD | Fieldbus | — | no | yes | — |
| Subset-037 (EuroRadio) | Rail | tcp/9001 | yes | no | — |
| Subset-098 (RBC-RBC) | Rail | — | yes | no | — |
| Interlocking proprietary | Rail | — | yes | yes | — |
| Serial | Fieldbus | — | no | yes | — |
| PTP (IEEE 1588) | Infrastructure | udp/319, udp/320 | yes | yes | — |
| NTP | Infrastructure | udp/123 | yes | yes | — |
| DNS | Infrastructure | udp/53, tcp/53 | yes | no | — |
| Syslog | Management / IT | udp/514 | yes | no | — |
| Syslog/TLS | Management / IT | tcp/6514 | yes | no | — |
| SNMPv2c | Management / IT | udp/161, udp/162 | yes | yes | SNMPv3 (authPriv) |
| SNMPv3 | Management / IT | udp/161, udp/162 | yes | no | — |
| SSH | Management / IT | tcp/22 | yes | no | — |
| Telnet | Management / IT | tcp/23 | yes | yes | SSH |
| HTTP | Management / IT | tcp/80 | yes | yes | HTTPS |
| HTTPS | Management / IT | tcp/443 | yes | no | — |
| FTP | Management / IT | tcp/21 | yes | yes | SFTP |
| SFTP | Management / IT | tcp/22 | yes | no | — |
| RDP | Management / IT | tcp/3389 | yes | no | — |
| SMB | Management / IT | tcp/445 | yes | yes | — |
| LDAPS | Management / IT | tcp/636 | yes | no | — |
| Kerberos | Management / IT | tcp/88, udp/88 | yes | no | — |
| SQL | Management / IT | tcp/1433 | yes | no | — |
