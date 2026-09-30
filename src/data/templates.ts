import type { ArchitectureTemplate, DesignerEdge, DesignerNode, AssetData, ZoneData } from "../types";
import { getAssetDefinition } from "./catalog";

function asset(id:string, assetType:string, x:number, y:number, title?:string, extra:Partial<AssetData>={}):DesignerNode {
  const d=getAssetDefinition(assetType)!;
  return {id,type:"asset",position:{x,y},data:{kind:"asset",title:title||d.label,assetType,category:d.category,status:"online",protocols:[...(d.defaultProtocols||[])],purdueLevel:d.defaultPurdueLevel,criticality:"medium",...extra}};
}

function zone(id:string,title:string,x:number,y:number,width:number,height:number,sl:ZoneData["securityLevelTarget"]):DesignerNode {
  return {id,type:"zone",position:{x,y},zIndex:-1,style:{width,height},data:{kind:"zone",title,zoneType:"iec62443",securityLevelTarget:sl}};
}

function edge(id:string,source:string,target:string,protocols:string[]=["TCP/IP"]):DesignerEdge {
  return {id,source,target,type:"smoothstep",animated:false,data:{protocols},label:protocols.join(" / ")};
}

const purdueNodes:DesignerNode[]=[
  zone("z-ent","Enterprise / Level 4-5",40,30,1100,190,"SL 1"),
  zone("z-idmz","Industrial DMZ",40,250,1100,190,"SL 2"),
  zone("z-ops","Site Operations / Level 3",40,470,1100,210,"SL 2"),
  zone("z-ctrl","Supervisory & Control / Level 1-2",40,710,1100,220,"SL 2"),
  zone("z-field","Field / Level 0",40,960,1100,200,"SL 2"),
  asset("ent","enterprise-client",120,80,"Enterprise Client",{zone:"Enterprise",purdueLevel:4}),
  asset("siem","siem",370,80,"SIEM",{zone:"Enterprise",purdueLevel:4}),
  asset("cloud","cloud-service",650,80,"Cloud Analytics",{zone:"Enterprise",purdueLevel:5}),
  asset("fw1","firewall",120,300,"Enterprise Firewall",{zone:"Industrial DMZ",purdueLevel:4}),
  asset("jump","jump-host",390,300,"Jump Host",{zone:"Industrial DMZ",purdueLevel:3}),
  asset("dmz","dmz-app",680,300,"DMZ Broker",{zone:"Industrial DMZ",purdueLevel:3}),
  asset("ifw","industrial-firewall",120,530,"OT Firewall",{zone:"Operations",purdueLevel:3,criticality:"high"}),
  asset("scada","scada",390,530,"SCADA Server",{zone:"Operations",purdueLevel:3,criticality:"high"}),
  asset("hist","historian",680,530,"Historian",{zone:"Operations",purdueLevel:3}),
  asset("ids","ids-sensor",900,530,"Passive IDS",{zone:"Operations",purdueLevel:3}),
  asset("isw","industrial-switch",120,770,"Cell Switch",{zone:"Control",purdueLevel:2}),
  asset("hmi","hmi",390,770,"Operator HMI",{zone:"Control",purdueLevel:2,criticality:"high"}),
  asset("plc","plc",680,770,"Process PLC",{zone:"Control",purdueLevel:1,criticality:"critical",protocols:["PROFINET"]}),
  asset("splc","safety-plc",900,770,"Safety PLC",{zone:"Safety",purdueLevel:1,criticality:"critical"}),
  asset("sensor","sensor",250,1020,"Pressure Transmitter",{zone:"Field",purdueLevel:0}),
  asset("vfd","vfd",520,1020,"Motor Drive",{zone:"Field",purdueLevel:1}),
  asset("act","actuator",790,1020,"Control Valve",{zone:"Field",purdueLevel:0})
];

const purdueEdges=[
  edge("e1","ent","fw1"),edge("e2","siem","fw1"),edge("e3","fw1","jump"),
  edge("e4","jump","ifw"),edge("e5","dmz","ifw"),edge("e6","ifw","scada"),
  edge("e7","scada","hist"),edge("e8","scada","isw"),edge("e9","ids","isw"),
  edge("e10","isw","hmi"),edge("e11","isw","plc",["PROFINET"]),
  edge("e12","plc","sensor",["HART"]),edge("e13","plc","vfd",["PROFINET"]),
  edge("e14","plc","act"),edge("e15","splc","act")
];

const substationNodes=[
  zone("z-c","Substation Control Zone",50,50,1000,300,"SL 2"),
  zone("z-b","Bay / Process Zone",50,390,1000,350,"SL 3"),
  asset("fw","industrial-firewall",110,120,"Substation Firewall",{criticality:"high",zone:"Control"}),
  asset("gw","protocol-gateway",350,120,"Protocol Gateway",{protocols:["IEC 60870-5-104","IEC 61850"],criticality:"high",zone:"Control"}),
  asset("hmi","hmi",610,120,"Local HMI",{criticality:"high",zone:"Control"}),
  asset("eng","engineering-ws",820,120,"Engineering Station",{zone:"Control"}),
  asset("sw","industrial-switch",330,470,"Station Bus Switch",{protocols:["IEC 61850"],criticality:"high",zone:"Bay"}),
  asset("ied1","protection-relay",110,610,"Protection Relay A",{protocols:["IEC 61850"],criticality:"critical",zone:"Bay"}),
  asset("ied2","protection-relay",430,610,"Protection Relay B",{protocols:["IEC 61850"],criticality:"critical",zone:"Bay"}),
  asset("meter","smart-meter",750,610,"Metering IED",{protocols:["IEC 61850"],zone:"Bay"})
];

const substationEdges=[
  edge("s1","fw","gw",["IEC 60870-5-104"]),edge("s2","gw","hmi"),edge("s3","hmi","eng"),
  edge("s4","gw","sw",["IEC 61850"]),edge("s5","sw","ied1",["IEC 61850"]),
  edge("s6","sw","ied2",["IEC 61850"]),edge("s7","sw","meter",["IEC 61850"])
];

const remoteNodes=[
  zone("z-central","Central Operations",50,50,1000,270,"SL 2"),
  zone("z-remote","Remote Process Site",50,360,1000,380,"SL 2"),
  asset("scada","scada",120,120,"Central SCADA",{criticality:"high",zone:"Central"}),
  asset("hist","historian",390,120,"Central Historian",{zone:"Central"}),
  asset("ras","remote-access",680,120,"Managed Remote Access",{criticality:"high",zone:"Central"}),
  asset("fw","industrial-firewall",120,430,"Remote Firewall",{criticality:"high",zone:"Remote"}),
  asset("rtu","rtu",390,430,"Site RTU",{protocols:["DNP3"],criticality:"critical",zone:"Remote"}),
  asset("iiot","iiot-gateway",680,430,"Telemetry Gateway",{protocols:["MQTT"],zone:"Remote"}),
  asset("sensor","sensor",260,620,"Process Sensor",{zone:"Remote"}),
  asset("act","actuator",580,620,"Remote Actuator",{zone:"Remote",criticality:"high"})
];

const remoteEdges=[
  edge("r1","scada","fw",["DNP3"]),edge("r2","hist","scada"),edge("r3","ras","fw"),
  edge("r4","fw","rtu",["DNP3"]),edge("r5","rtu","sensor",["HART"]),
  edge("r6","rtu","act"),edge("r7","iiot","hist",["MQTT"])
];

export const TEMPLATES:ArchitectureTemplate[]=[
  {id:"purdue-site",name:"Purdue-style OT Site",description:"Generic enterprise, IDMZ, operations, control and field architecture.",nodes:purdueNodes,edges:purdueEdges},
  {id:"substation",name:"Electrical Substation",description:"Simplified substation control and IEC 61850 station-bus layout.",nodes:substationNodes,edges:substationEdges},
  {id:"remote-process",name:"Remote Process Site",description:"Central SCADA with a segmented remote RTU and telemetry site.",nodes:remoteNodes,edges:remoteEdges}
];
