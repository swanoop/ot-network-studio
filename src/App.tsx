import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls, MiniMap, addEdge, useEdgesState, useNodesState, type Connection, type ReactFlowInstance } from "reactflow";
import { toPng } from "html-to-image";
import AssetNode from "./components/AssetNode";
import ZoneNode from "./components/ZoneNode";
import Sidebar from "./components/Sidebar";
import Inspector from "./components/Inspector";
import Toolbar from "./components/Toolbar";
import Inventory from "./components/Inventory";
import { TEMPLATES } from "./data/templates";
import type { AssetDefinition, DesignerData, DesignerEdge, DesignerNode, ProjectFile, ZoneData } from "./types";

const STORAGE_KEY="ot-network-studio.project.v1";
const nodeTypes={asset:AssetNode,zone:ZoneNode};
const clone=<T,>(value:T):T=>JSON.parse(JSON.stringify(value));

export default function App() {
  const canvasRef=useRef<HTMLDivElement>(null);
  const [nodes,setNodes,onNodesChange]=useNodesState<DesignerData>([]);
  const [edges,setEdges,onEdgesChange]=useEdgesState([]);
  const [flow,setFlow]=useState<ReactFlowInstance|null>(null);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [projectName,setProjectName]=useState("Untitled OT Architecture");
  const [saved,setSaved]=useState(true);
  const [view,setView]=useState<"canvas"|"inventory">("canvas");
  const [theme,setTheme]=useState<"dark"|"light">(()=>(localStorage.getItem("ot-network-studio.theme") as "dark"|"light")||"dark");

  useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem("ot-network-studio.theme",theme)},[theme]);

  useEffect(()=>{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw)return;
    try{
      const project=JSON.parse(raw) as ProjectFile;
      if(project.schemaVersion===1){
        setNodes(project.nodes||[]);
        setEdges(project.edges||[]);
        setProjectName(project.name||"Untitled OT Architecture");
      }
    }catch{localStorage.removeItem(STORAGE_KEY)}
  },[setEdges,setNodes]);

  useEffect(()=>{
    setSaved(false);
    const timer=window.setTimeout(()=>{
      const project:ProjectFile={schemaVersion:1,name:projectName,nodes:nodes as DesignerNode[],edges:edges as DesignerEdge[],updatedAt:new Date().toISOString()};
      localStorage.setItem(STORAGE_KEY,JSON.stringify(project));
      setSaved(true);
    },500);
    return()=>window.clearTimeout(timer);
  },[projectName,nodes,edges]);

  const selectedNode=useMemo(()=>selectedId?((nodes.find(n=>n.id===selectedId) as DesignerNode|undefined)||null):null,[nodes,selectedId]);

  const onConnect=useCallback((connection:Connection)=>{
    setEdges(current=>addEdge({...connection,type:"smoothstep",animated:false,label:"TCP/IP",data:{protocols:["TCP/IP"]}},current));
  },[setEdges]);

  const onDragOver=useCallback((event:React.DragEvent)=>{event.preventDefault();event.dataTransfer.dropEffect="move"},[]);

  const onDrop=useCallback((event:React.DragEvent)=>{
    event.preventDefault();
    if(!flow||!canvasRef.current)return;
    const raw=event.dataTransfer.getData("application/ot-network-asset");
    if(!raw)return;
    const item=JSON.parse(raw) as AssetDefinition;
    const bounds=canvasRef.current.getBoundingClientRect();
    const position=flow.project({x:event.clientX-bounds.left,y:event.clientY-bounds.top});
    const node:DesignerNode={
      id:item.type+"-"+Date.now(),
      type:"asset",
      position,
      data:{
        kind:"asset",title:item.label,assetType:item.type,category:item.category,status:"unknown",
        protocols:[...(item.defaultProtocols||[])],purdueLevel:item.defaultPurdueLevel,criticality:"medium"
      }
    };
    setNodes(current=>[...current,node]);
  },[flow,setNodes]);

  const updateNode=useCallback((id:string,patch:Partial<DesignerData>)=>{
    setNodes(current=>current.map(node=>node.id===id?{...node,data:{...node.data,...patch} as DesignerData}:node));
  },[setNodes]);

  const deleteNode=useCallback((id:string)=>{
    setNodes(current=>current.filter(node=>node.id!==id));
    setEdges(current=>current.filter(edge=>edge.source!==id&&edge.target!==id));
    setSelectedId(null);
  },[setEdges,setNodes]);

  const addZone=useCallback(()=>{
    const data:ZoneData={kind:"zone",title:"New OT Zone",zoneType:"iec62443",securityLevelTarget:"SL 2"};
    const node:DesignerNode={id:"zone-"+Date.now(),type:"zone",position:{x:100,y:100},zIndex:-1,style:{width:520,height:280},data};
    setNodes(current=>[...current,node]);
    setSelectedId(node.id);
  },[setNodes]);

  const loadTemplate=useCallback((id:string)=>{
    const template=TEMPLATES.find(item=>item.id===id);
    if(!template)return;
    if(nodes.length>0&&!window.confirm("Replace the current diagram with this template?"))return;
    setNodes(clone(template.nodes));
    setEdges(clone(template.edges));
    setProjectName(template.name);
    setSelectedId(null);
    setView("canvas");
    window.setTimeout(()=>flow?.fitView({padding:.1,duration:400}),20);
  },[flow,nodes.length,setEdges,setNodes]);

  const exportJson=useCallback(()=>{
    const project:ProjectFile={schemaVersion:1,name:projectName,nodes:nodes as DesignerNode[],edges:edges as DesignerEdge[],updatedAt:new Date().toISOString()};
    const blob=new Blob([JSON.stringify(project,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const anchor=document.createElement("a");
    anchor.href=url;
    anchor.download=projectName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".otns.json";
    anchor.click();
    URL.revokeObjectURL(url);
  },[edges,nodes,projectName]);

  const exportPng=useCallback(async()=>{
    const target=canvasRef.current?.querySelector(".react-flow") as HTMLElement|null;
    if(!target)return;
    try{
      const url=await toPng(target,{
        pixelRatio:2,
        backgroundColor:theme==="dark"?"#0b1220":"#f5f7fb",
        filter:(element)=>{
          const cls=(element as HTMLElement).classList;
          return !cls?.contains("react-flow__controls")&&!cls?.contains("react-flow__minimap")&&!cls?.contains("react-flow__attribution");
        }
      });
      const anchor=document.createElement("a");
      anchor.href=url;
      anchor.download=projectName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+".png";
      anchor.click();
    }catch{
      window.alert("PNG export failed. JSON export is still available.");
    }
  },[projectName,theme]);

  const importFile=useCallback((file:File)=>{
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const project=JSON.parse(String(reader.result)) as ProjectFile;
        if(project.schemaVersion!==1||!Array.isArray(project.nodes)||!Array.isArray(project.edges))throw new Error("Unsupported project format");
        setNodes(project.nodes);setEdges(project.edges);setProjectName(project.name||"Imported OT Architecture");
        setSelectedId(null);setView("canvas");
      }catch(error){
        window.alert(error instanceof Error?error.message:"Could not import project.");
      }
    };
    reader.readAsText(file);
  },[setEdges,setNodes]);

  const reset=useCallback(()=>{
    if(nodes.length>0&&!window.confirm("Create a new blank project?"))return;
    setNodes([]);setEdges([]);setProjectName("Untitled OT Architecture");setSelectedId(null);setView("canvas");
  },[nodes.length,setEdges,setNodes]);

  const selectFromInventory=useCallback((id:string)=>{
    setSelectedId(id);setView("canvas");
    window.setTimeout(()=>{
      const node=nodes.find(item=>item.id===id);
      if(node&&flow)flow.setCenter(node.position.x+90,node.position.y+55,{zoom:1.25,duration:350});
    },20);
  },[flow,nodes]);

  return (
    <div className="app-shell">
      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        saved={saved}
        view={view}
        onViewChange={setView}
        theme={theme}
        onThemeToggle={()=>setTheme(value=>value==="dark"?"light":"dark")}
        onAddZone={addZone}
        onTemplate={loadTemplate}
        onExportJson={exportJson}
        onExportPng={exportPng}
        onImport={importFile}
        onReset={reset}
      />
      {view==="inventory" ? (
        <Inventory nodes={nodes as DesignerNode[]} onSelect={selectFromInventory}/>
      ) : (
        <div className="workspace">
          <Sidebar/>
          <div className="canvas" ref={canvasRef}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_,node)=>setSelectedId(node.id)}
              onPaneClick={()=>setSelectedId(null)}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onInit={setFlow}
              nodeTypes={nodeTypes}
              fitView
              snapToGrid
              snapGrid={[20,20]}
              deleteKeyCode={["Backspace","Delete"]}
              minZoom={.2}
              maxZoom={2}
              defaultEdgeOptions={{type:"smoothstep"}}
              proOptions={{hideAttribution:true}}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.1}/>
              <Controls/>
              <MiniMap pannable zoomable/>
            </ReactFlow>
          </div>
          <Inspector node={selectedNode} onChange={updateNode} onClose={()=>setSelectedId(null)} onDelete={deleteNode}/>
        </div>
      )}
    </div>
  );
}
