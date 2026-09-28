import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, BrainCircuit, CalendarDays, CheckCircle2,
  ChevronDown, ChevronRight, CircleHelp, Clock3, Database, Gauge, Layers3, LayoutDashboard,
  Menu, Network, Play, RefreshCw, Route, Search, Settings2, ShieldCheck, Sparkles, TrainFront,
  TriangleAlert, X, Zap, Info, Wrench
} from 'lucide-react';
import './index.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const NAV = [
  { id:'Dashboard', icon:LayoutDashboard, meaning:'Overview of the railway network, maintenance priorities, AI plans and system health.' },
  { id:'Maintenance', icon:Wrench, meaning:'View and prioritize defects from TMS, SMMS and TDMS in one queue.' },
  { id:'AI Block Plan', icon:CalendarDays, meaning:'See the AI-generated weekly or monthly block schedule after combining compatible work.' },
  { id:'Trains', icon:TrainFront, meaning:'Review train timetable and goods-train forecast constraints used by the planner.' },
  { id:'Corridors & COA', icon:Route, meaning:'Inspect corridor availability and block windows received from COA.' },
   { id:'Data Sources', icon:Database, meaning:'See which operational systems feed the planning engine.' },
  { id:'Methodology', icon:BrainCircuit, meaning:'Review the end-to-end planning methodology and constraints.' },
];

const meaningMap = {
  'Generate AI Plan':'Creates a new train-aware block schedule using maintenance priority, corridor windows and train constraints.',
  'Recalculate':'Runs the planning engine again to produce an updated schedule for the selected horizon.',
  'Refresh':'Reloads current dashboard and operational data from the backend.',
  'View queue':'Opens the maintenance queue so you can inspect all defects and jobs.',
  'Open plan':'Opens the latest AI-generated block schedule.',
  'Weekly':'Shows the optimized schedule for the upcoming planning week.',
  'Monthly':'Shows the optimized schedule across the monthly planning horizon.',
  'Add maintenance':'Adds a new maintenance activity to the planning queue.',
};


const DEMO_JOBS = [
 {id:'M-1001',source:'TMS',asset:'Rail Joint R-218',corridor:'BPL-JBP',department:'Track',type:'Rail grinding',severity:'Critical',urgency:94,duration:90,preferredWindow:'10:00-12:00',compatible:['Track','Signal'],status:'Pending',due:'2026-09-28'},
 {id:'M-1002',source:'SMMS',asset:'Signal S-442',corridor:'BPL-JBP',department:'S&T',type:'Signal inspection',severity:'High',urgency:84,duration:60,preferredWindow:'10:00-12:00',compatible:['Track','S&T'],status:'Pending',due:'2026-09-29'},
 {id:'M-1003',source:'TDMS',asset:'OHE Mast 7A',corridor:'BPL-ET',department:'Electrical',type:'OHE maintenance',severity:'High',urgency:79,duration:120,preferredWindow:'13:00-16:00',compatible:['Electrical','Track'],status:'Pending',due:'2026-09-30'},
 {id:'M-1004',source:'TMS',asset:'Turnout T-91',corridor:'BPL-JBP',department:'Track',type:'Turnout inspection',severity:'Medium',urgency:66,duration:60,preferredWindow:'10:00-12:00',compatible:['Track','S&T'],status:'Pending',due:'2026-10-01'},
 {id:'M-1005',source:'SMMS',asset:'Point Machine PM-77',corridor:'BPL-JBP',department:'S&T',type:'Point machine service',severity:'Medium',urgency:62,duration:90,preferredWindow:'10:00-12:00',compatible:['S&T','Track'],status:'Pending',due:'2026-10-02'},
 {id:'M-1006',source:'TDMS',asset:'Transformer TR-14',corridor:'BPL-ET',department:'Electrical',type:'Transformer test',severity:'Low',urgency:42,duration:60,preferredWindow:'13:00-16:00',compatible:['Electrical'],status:'Pending',due:'2026-10-03'},
 {id:'M-1007',source:'TMS',asset:'Rail Weld W-12',corridor:'BPL-ET',department:'Track',type:'Ultrasonic testing',severity:'High',urgency:76,duration:60,preferredWindow:'13:00-16:00',compatible:['Track','Electrical'],status:'Pending',due:'2026-10-04'},
 {id:'M-1008',source:'SMMS',asset:'Signal S-510',corridor:'BPL-ET',department:'S&T',type:'Lamp and relay check',severity:'Low',urgency:38,duration:45,preferredWindow:'13:00-16:00',compatible:['S&T'],status:'Pending',due:'2026-10-05'}
];
const DEMO_TRAINS = [
 {id:'T-201',name:'Janshatabdi',corridor:'BPL-JBP',day:'Mon',start:'09:15',end:'10:05',type:'Passenger',priority:'High'},
 {id:'T-202',name:'Intercity Express',corridor:'BPL-JBP',day:'Mon',start:'12:20',end:'13:10',type:'Passenger',priority:'High'},
 {id:'T-203',name:'Goods Forecast G-17',corridor:'BPL-JBP',day:'Tue',start:'10:30',end:'11:20',type:'Goods',priority:'Medium'},
 {id:'T-204',name:'Narmada Express',corridor:'BPL-ET',day:'Wed',start:'12:20',end:'13:00',type:'Passenger',priority:'High'},
 {id:'T-205',name:'Goods Forecast G-22',corridor:'BPL-ET',day:'Thu',start:'16:00',end:'17:00',type:'Goods',priority:'Medium'}
];
const DEMO_CORRIDORS = [
 {id:'C-01',name:'BPL-JBP',route:'Bhopal – Jabalpur',availability:'10:00-12:00',capacity:'2 tracks',utilization:72,coaStatus:'Demo available'},
 {id:'C-02',name:'BPL-ET',route:'Bhopal – Itarsi',availability:'13:00-16:00',capacity:'3 tracks',utilization:61,coaStatus:'Demo available'},
 {id:'C-03',name:'BPL-VID',route:'Bhopal – Vidisha',availability:'22:00-01:00',capacity:'2 tracks',utilization:48,coaStatus:'Demo available'}
];
function demoPlan(horizon, jobs=DEMO_JOBS) {
 const weights={Critical:30,High:20,Medium:10,Low:5};
 const sorted=[...jobs].map(j=>({...j,priorityScore:Math.min(100,Math.round((Number(j.urgency)||50)*.55+(weights[j.severity]||5)))})).sort((a,b)=>b.priorityScore-a.priorityScore);
 const blocks=[];
 for(const job of sorted){
  let block=blocks.find(b=>b.corridor===job.corridor&&b.window===job.preferredWindow&&b.totalDuration+Number(job.duration)<=180&&b.departments.some(d=>(job.compatible||[]).includes(d)));
  if(!block){block={id:`B-${String(blocks.length+1).padStart(3,'0')}`,day:['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][blocks.length%7],corridor:job.corridor,window:job.preferredWindow||'22:00-01:00',departments:[],jobs:[],totalDuration:0,priority:job.priorityScore,status:'AI Proposed'};blocks.push(block);}
  if(!block.departments.includes(job.department))block.departments.push(job.department);
  block.jobs.push(job.id);block.totalDuration+=Number(job.duration)||60;block.priority=Math.max(block.priority,job.priorityScore);
 }
 const count=horizon==='monthly'?4:1;
 const out=Array.from({length:count},(_,week)=>blocks.map((b,i)=>({...b,id:`${b.id}${week?`-W${week+1}`:''}`,day:b.day,trainConflict:false,trainBuffer:'Needs control-office verification',efficiency:Math.min(100,Math.round(b.totalDuration/180*100))}))).flat();
 return {horizon,generatedAt:new Date().toISOString(),blocks:out,approved:false,summary:{blocks:out.length,jobs:sorted.length,departments:new Set(sorted.map(j=>j.department)).size,trainConflicts:0,avgEfficiency:out.length?Math.round(out.reduce((a,b)=>a+b.efficiency,0)/out.length):0}};
}

function App(){
  const [page,setPage]=useState('Dashboard');
  const [dash,setDash]=useState(null), [jobs,setJobs]=useState([]), [blocks,setBlocks]=useState([]), [trains,setTrains]=useState([]), [corridors,setCorridors]=useState([]);
  const [loading,setLoading]=useState(false), [horizon,setHorizon]=useState('weekly'), [search,setSearch]=useState('');
  const [help,setHelp]=useState(null), [mobileNav,setMobileNav]=useState(false), [apiOk,setApiOk]=useState(false), [approved,setApproved]=useState(false), [showAdd,setShowAdd]=useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const responses=await Promise.all(['dashboard','maintenance','blocks','trains','corridors'].map(x=>fetch(`${API}/${x}`).then(r=>{if(!r.ok)throw Error('API unavailable');return r.json()})));
      const [d,j,b,t,c]=responses; setDash(d);setJobs(j);setBlocks(b);setTrains(t);setCorridors(c);setApiOk(true);
    } catch(e) {
      setJobs(prev=>prev.length?prev:DEMO_JOBS);setTrains(prev=>prev.length?prev:DEMO_TRAINS);setCorridors(prev=>prev.length?prev:DEMO_CORRIDORS);
      setBlocks(prev=>prev.length?prev:demoPlan('weekly').blocks);
      setDash({totalJobs:DEMO_JOBS.length,critical:DEMO_JOBS.filter(j=>j.severity==='Critical').length,high:DEMO_JOBS.filter(j=>j.severity==='High').length,generatedBlocks:demoPlan('weekly').blocks.length,trainWindows:DEMO_TRAINS.length,corridors:DEMO_CORRIDORS.length});
      setApiOk(false);
    } finally {setLoading(false);}
  };
  const generate = async () => {
    setLoading(true);
    try {
      const r=await fetch(`${API}/plan/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({horizon})});
      if(!r.ok)throw Error('API unavailable'); const x=await r.json();setBlocks(x.blocks||[]);setApiOk(true);
    } catch(e) { const x=demoPlan(horizon,jobs.length?jobs:DEMO_JOBS);setBlocks(x.blocks);setApiOk(false);setApproved(false); }
    setPage('AI Block Plan');setLoading(false);
  };
  const addMaintenance = async (job) => {
    const item={...job,id:`M-${1001+jobs.length}`,source:job.source||'MANUAL',status:'Pending',compatible:[job.department],due:job.due||new Date().toISOString().slice(0,10)};
    try {const r=await fetch(`${API}/maintenance`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});if(!r.ok)throw Error();const saved=await r.json();setJobs(old=>[...old,saved]);setApiOk(true);}
    catch(e){setJobs(old=>[...old,item]);setApiOk(false);}
    setBlocks(demoPlan(horizon,[...jobs,item]).blocks);setDash(old=>({...old,totalJobs:(old?.totalJobs||jobs.length)+1,critical:(old?.critical||0)+(item.severity==='Critical'?1:0),high:(old?.high||0)+(item.severity==='High'?1:0)}));setShowAdd(false);
  };
  const approvePlan = async () => {
    try {const r=await fetch(`${API}/plan/approve`,{method:'POST'});if(!r.ok)throw Error();const x=await r.json();setBlocks(x.blocks||blocks);setApiOk(true);}
    catch(e){setBlocks(old=>old.map(b=>({...b,status:'Officer Approved'})));setApiOk(false);}
    setApproved(true);
  };
  const rightClick = (e, name, detail) => { e.preventDefault(); setHelp({name, detail: detail || meaningMap[name] || 'This control is part of the RailPlan AI prototype.'}); };
  const actionProps = (name, detail) => ({ onContextMenu:e=>rightClick(e,name,detail), title:`Right-click for meaning • ${detail||meaningMap[name]||''}` });

  return <div className="min-h-screen bg-[#06101d] text-slate-100 grid-bg">
    <header className="sticky top-0 z-40 border-b border-slate-700/30 bg-[#06101d]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3"><button className="rounded-xl border border-slate-700/50 p-2 lg:hidden" onClick={()=>setMobileNav(!mobileNav)} {...actionProps('Navigation menu','Opens the main navigation on smaller screens.')}><Menu size={19}/></button><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300 ring-1 ring-cyan-300/20"><BrainCircuit size={22}/></div><div><div className="font-black tracking-tight">RailPlan <span className="text-cyan-300">AI</span></div><div className="text-[10px] uppercase tracking-[.2em] text-slate-500">Automatic Block Planning</div></div></div>
        <div className="hidden items-center gap-3 md:flex"><div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${apiOk?'border-emerald-400/20 bg-emerald-400/5 text-emerald-300':'border-amber-400/20 bg-amber-400/5 text-amber-300'}`}><span className={`pulse-dot h-2 w-2 rounded-full ${apiOk?'bg-emerald-400':'bg-amber-400'}`}/>{apiOk?'Planning engine online':'Demo data mode'}</div><button className="rounded-xl border border-slate-700/60 p-2.5 hover:bg-white/5" onClick={load} {...actionProps('Refresh','Reloads the dashboard and operational data.')}><RefreshCw size={17}/></button><button className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-400/10 hover:bg-cyan-200" onClick={generate} {...actionProps('Generate AI Plan') }><Play size={15} className="mr-2 inline"/>Generate AI Plan</button></div>
      </div>
    </header>

    <div className="mx-auto flex max-w-[1600px]">
      <aside className={`${mobileNav?'fixed inset-y-16 left-0 z-30 flex':'hidden'} w-72 shrink-0 flex-col border-r border-slate-700/30 bg-[#071321] lg:sticky lg:top-16 lg:flex lg:h-[calc(100vh-4rem)]`}>
        <div className="flex-1 p-4"><div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.22em] text-slate-500">Operations</div>{NAV.map(n=>{const Icon=n.icon;return <button key={n.id} onClick={()=>{setPage(n.id);setMobileNav(false)}} onContextMenu={e=>rightClick(e,n.id,n.meaning)} title={`Right-click for meaning • ${n.meaning}`} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${page===n.id?'bg-cyan-300/10 text-cyan-200 ring-1 ring-cyan-300/15':'text-slate-400 hover:bg-white/5 hover:text-slate-100'}`}><Icon size={18}/><span className="font-semibold">{n.id}</span>{page===n.id&&<ChevronRight className="ml-auto" size={15}/>}</button>})}
          <div className="mt-6 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-4"><div className="mb-2 flex items-center gap-2 text-cyan-200"><ShieldCheck size={18}/><b className="text-sm">Train-aware planning</b></div><p className="text-xs leading-5 text-slate-400">The planner protects train movement windows while combining compatible maintenance activities.</p></div>
        </div><div className="border-t border-slate-700/30 p-4 text-xs text-slate-500"><div className="flex items-center gap-2"><Settings2 size={14}/> Prototype v2.1 · Demo-ready · React + Vite</div></div>
      </aside>

      <main className="min-w-0 flex-1 p-4 lg:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[.25em] text-cyan-300/70">AI Operations Control</div><h1 className="text-2xl font-black tracking-tight lg:text-3xl">{page}</h1></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 sm:flex"><Search size={14}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..." className="w-36 bg-transparent outline-none placeholder:text-slate-600"/></div><button className="rounded-xl border border-slate-700/60 p-2.5 lg:hidden" onClick={load} {...actionProps('Refresh')}><RefreshCw size={17}/></button></div></div>
        {loading&&<div className="mb-4 rounded-xl border border-cyan-300/15 bg-cyan-300/5 px-4 py-3 text-sm text-cyan-200">Planning engine is updating operational data…</div>}
        {page==='Dashboard'&&<Dashboard dash={dash} jobs={jobs} blocks={blocks} corridors={corridors} onGenerate={generate} go={setPage} actionProps={actionProps}/>} 
        {page==='Maintenance'&&<Maintenance jobs={jobs} search={search} onAdd={()=>setShowAdd(true)}/>} 
        {page==='AI Block Plan'&&<Plan blocks={blocks} horizon={horizon} setHorizon={setHorizon} onGenerate={generate} onApprove={approvePlan} approved={approved} actionProps={actionProps}/>} 
        {page==='Trains'&&<Trains trains={trains}/>} {page==='Corridors & COA'&&<Corridors corridors={corridors}/>} {page==='Data Sources'&&<Sources/>} {page==='Methodology'&&<Methodology/>}
      </main>
    </div>

    {showAdd&&<AddMaintenance onClose={()=>setShowAdd(false)} onSave={addMaintenance}/>}
    {help&&<div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={()=>setHelp(null)}><div className="card w-full max-w-md rounded-2xl p-5" onClick={e=>e.stopPropagation()}><div className="flex items-start gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><CircleHelp size={21}/></div><div className="min-w-0 flex-1"><div className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">Button / control meaning</div><h3 className="mt-1 text-lg font-black">{help.name}</h3><p className="mt-2 text-sm leading-6 text-slate-400">{help.detail}</p></div><button className="rounded-lg p-2 text-slate-500 hover:bg-white/5" onClick={()=>setHelp(null)}><X size={17}/></button></div><div className="mt-5 rounded-xl bg-slate-950/50 p-3 text-xs text-slate-500">Tip: you can right-click supported controls anywhere in this prototype to open this explanation.</div></div></div>}
  </div>
}

function Dashboard({dash,jobs,blocks,corridors,onGenerate,go,actionProps}){
 return <div className="animate-in space-y-5">
  <section className="relative min-h-[500px] overflow-hidden rounded-[28px] border border-slate-700/30 shadow-2xl shadow-black/20">
   <img src="/railway-hero.png" className="absolute inset-0 h-full w-full object-cover" alt="Railway maintenance and traction infrastructure"/><div className="hero-overlay absolute inset-0"/><div className="absolute inset-0 bg-gradient-to-t from-[#06101d] via-transparent to-transparent"/>
   <div className="relative flex min-h-[500px] max-w-3xl flex-col justify-end p-6 lg:p-10"><div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200"><Sparkles size={13}/> AI-assisted · train aware</div><h2 className="text-4xl font-black leading-[1.02] tracking-[-.04em] sm:text-5xl lg:text-6xl">One coordinated<br/><span className="text-cyan-300">block plan.</span></h2><p className="mt-5 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">Prioritize defects from TMS, SMMS and TDMS, protect COA corridor windows and merge compatible maintenance around passenger and goods-train movements.</p><div className="mt-7 flex flex-wrap gap-3"><button className="rounded-xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 shadow-xl shadow-cyan-500/10 hover:bg-cyan-200" onClick={onGenerate} {...actionProps('Generate AI Plan')}><BrainCircuit size={18} className="mr-2 inline"/>Generate optimized plan<ArrowRight size={17} className="ml-2 inline"/></button><button className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white backdrop-blur hover:bg-white/10" onClick={()=>go('Data Sources')} onContextMenu={e=>e.preventDefault()} title="See the operational systems feeding the planner">Explore data sources</button></div></div>
   <div className="absolute right-5 top-5 hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right backdrop-blur-md md:block"><div className="text-[10px] uppercase tracking-[.18em] text-slate-400">Live network view</div><div className="mt-1 flex items-center justify-end gap-2 text-xs font-bold text-emerald-300"><span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400"/>COA windows protected</div></div>
  </section>
  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat icon={AlertTriangle} label="Open maintenance jobs" value={dash?.totalJobs??'—'} sub={`${dash?.critical??0} critical · ${dash?.high??0} high`}/><Stat icon={Layers3} label="AI-generated blocks" value={dash?.generatedBlocks??'—'} sub="Compatible activities merged"/><Stat icon={TrainFront} label="Train windows" value={dash?.trainWindows??'—'} sub="Passenger + goods forecast"/><Stat icon={Route} label="Active corridors" value={dash?.corridors??corridors.length} sub="COA availability feeds"/></div>
  <div className="grid gap-5 xl:grid-cols-2"><Panel title="Priority maintenance" action="View queue" onAction={()=>go('Maintenance')}><div className="divide-y divide-slate-700/30">{jobs.slice(0,5).map(j=><div key={j.id} className="flex items-center gap-3 py-3"><span className={`h-2.5 w-2.5 rounded-full ${j.severity==='Critical'?'bg-red-400':j.severity==='High'?'bg-amber-400':'bg-cyan-400'}`}/><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{j.asset}</div><div className="text-xs text-slate-500">{j.department} · {j.source} · {j.corridor}</div></div><span className="rounded-lg bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">{j.urgency}/100</span></div>)}</div></Panel><Panel title="Latest AI block plan" action="Open plan" onAction={()=>go('AI Block Plan')}><div className="divide-y divide-slate-700/30">{blocks.slice(0,4).map(b=><div key={b.id} className="flex items-center gap-3 py-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-300/10 text-[10px] font-black text-cyan-200">{b.id}</div><div className="min-w-0 flex-1"><div className="text-sm font-bold">{b.day} · {b.corridor}</div><div className="text-xs text-slate-500">{b.window} · {b.departments?.join(' + ')}</div></div><span className="text-xs font-bold text-slate-400">{b.jobs?.length} jobs</span></div>)}</div></Panel></div>
 </div>
}
function Stat({icon:Icon,label,value,sub}){return <div className="card rounded-2xl p-4"><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Icon size={19}/></div><div><div className="text-xs text-slate-500">{label}</div><div className="text-2xl font-black">{value}</div><div className="text-[11px] text-slate-600">{sub}</div></div></div></div>}
function Panel({title,action,onAction,children}){return <section className="card rounded-2xl p-5"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">{title}</h3>{action&&<button onClick={onAction} className="flex items-center gap-1 text-xs font-bold text-cyan-300 hover:text-cyan-200" title={action}>{action}<ChevronRight size={14}/></button>}</div>{children}</section>}
function Maintenance({jobs,search,onAdd}){const filtered=jobs.filter(j=>JSON.stringify(j).toLowerCase().includes(search.toLowerCase()));return <div className="animate-in"><Panel title="Maintenance & defect queue" action={`${filtered.length} records`}><div className="mb-3 flex justify-end"><button onClick={onAdd} className="rounded-lg bg-cyan-300 px-3 py-2 text-xs font-black text-slate-950">+ Add maintenance</button></div><div className="mb-4 flex flex-wrap gap-2"><Badge icon={Activity}>TMS · Track</Badge><Badge icon={Network}>SMMS · Signal</Badge><Badge icon={Zap}>TDMS · Traction</Badge><Badge icon={Gauge}>AI priority</Badge></div><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[.15em] text-slate-600"><tr>{['ID','Asset','Source','Department','Corridor','Severity','Urgency','Duration'].map(x=><th className="border-b border-slate-700/30 px-3 py-3" key={x}>{x}</th>)}</tr></thead><tbody>{filtered.map(j=><tr className="border-b border-slate-700/20 last:border-0" key={j.id}><td className="px-3 py-4 font-bold text-cyan-200">{j.id}</td><td className="px-3 py-4"><b>{j.asset}</b><small className="mt-1 block text-xs text-slate-600">{j.type}</small></td><td className="px-3 py-4"><Badge>{j.source}</Badge></td><td className="px-3 py-4 text-slate-400">{j.department}</td><td className="px-3 py-4 text-slate-400">{j.corridor}</td><td className="px-3 py-4"><Severity value={j.severity}/></td><td className="px-3 py-4 font-black">{j.urgency}<span className="text-xs text-slate-600">/100</span></td><td className="px-3 py-4 text-slate-400">{j.duration} min</td></tr>)}</tbody></table></div></Panel></div>}

function AddMaintenance({onClose,onSave}) {
 const [form,setForm]=useState({asset:'',type:'Inspection',source:'TMS',department:'Track',corridor:'BPL-JBP',severity:'Medium',urgency:50,duration:60,preferredWindow:'22:00-01:00'});
 const change=e=>setForm({...form,[e.target.name]:e.target.value});
 return <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"><form className="card max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-5" onSubmit={e=>{e.preventDefault();onSave({...form,urgency:Number(form.urgency),duration:Number(form.duration)});}}>
 <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">Add maintenance activity</h2><button type="button" onClick={onClose}><X size={18}/></button></div>
 <div className="grid gap-3 sm:grid-cols-2">{[['asset','Asset / location'],['type','Maintenance task']].map(([n,l])=><label className="text-xs text-slate-400" key={n}>{l}<input required name={n} value={form[n]} onChange={change} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white"/></label>)}
 { [['source','Source',['TMS','SMMS','TDMS','MANUAL']],['department','Department',['Track','S&T','Electrical']],['corridor','Corridor',['BPL-JBP','BPL-ET','BPL-VID']],['severity','Severity',['Critical','High','Medium','Low']],['preferredWindow','Preferred window',['10:00-12:00','13:00-16:00','22:00-01:00']] ].map(([n,l,opts])=><label className="text-xs text-slate-400" key={n}>{l}<select name={n} value={form[n]} onChange={change} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white">{opts.map(o=><option key={o}>{o}</option>)}</select></label>)}
 <label className="text-xs text-slate-400">Urgency: {form.urgency}/100<input name="urgency" type="range" min="1" max="100" value={form.urgency} onChange={change} className="mt-2 w-full"/></label><label className="text-xs text-slate-400">Duration (minutes)<input name="duration" type="number" min="15" max="180" step="15" value={form.duration} onChange={change} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-sm text-white"/></label></div>
 <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Cancel</button><button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">Save activity</button></div>
 </form></div>
}
function Methodology(){const steps=[
 ['1','Data Collection','TMS, SMMS, TDMS, COA, passenger timetable and goods-train forecasts.'],
 ['2','Data Integration','Bring work orders, asset locations, corridor windows and train movements into one model.'],
 ['3','Data Preprocessing','Validate required fields, normalize departments/corridors, and flag missing or inconsistent records.'],
 ['4','Priority Analysis','Compute a transparent demo score using severity, urgency and due-date pressure.'],
 ['5','Compatibility Grouping','Group jobs only when corridor, time window, department compatibility and block capacity permit.'],
 ['6','Train & Block Constraint Check','Check the proposed window against timetable/forecast data; final conflict validation must be confirmed by the control office.'],
 ['7','AI Optimization','Compare feasible groupings to reduce repeated closures and unused block time. This demo uses deterministic heuristic rules, not a trained ML model.'],
 ['8','Weekly / Monthly Block Plan','Generate a weekly proposal or a month view organized into four illustrative planning weeks.'],
 ['9','Officer Review','Review conflicts, work duration, safety requirements and dependencies before approval.'],
 ['10','Final Coordinated Schedule','Save the officer-reviewed proposal as a demo approval state; it is not an operational railway authority.']
 ];return <div className="animate-in space-y-5"><section className="card rounded-2xl p-5 sm:p-7"><div className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Planning methodology</div><h2 className="mt-2 text-2xl font-black">From maintenance data to a coordinated block proposal</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">The prototype combines demo maintenance records and timetable windows to create a reviewable schedule. Treat outputs as planning suggestions only; confirm safety, possessions and train conflicts with authorized railway systems and officers.</p></section><div className="grid gap-3 md:grid-cols-2">{steps.map(([n,title,desc])=><article key={n} className="card flex gap-4 rounded-2xl p-4"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-300/10 font-black text-cyan-200">{n}</div><div><h3 className="font-black">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{desc}</p></div></article>)}</div><div className="card rounded-2xl p-5"><h3 className="font-black">Priority factors used in the demo</h3><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[['Criticality','Severity category weight'],['Urgency','User-entered urgency score'],['Safety impact','Represented indirectly by severity; requires officer validation'],['Asset availability','Can be captured as a due/age field in production'],['Train impact','Proposed windows compared with supplied timetable demo records'],['Compatibility','Department compatibility, corridor and duration capacity']].map(([a,b])=><div className="rounded-xl bg-slate-950/40 p-3" key={a}><b className="text-sm">{a}</b><p className="mt-1 text-xs leading-5 text-slate-500">{b}</p></div>)}</div></div></div>}

function Badge({children,icon:Icon}){return <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/40 bg-slate-950/30 px-2.5 py-1.5 text-[11px] font-bold text-slate-400">{Icon&&<Icon size={13}/>} {children}</span>}
function Severity({value}){const c=value==='Critical'?'border-red-400/20 bg-red-400/10 text-red-300':value==='High'?'border-amber-400/20 bg-amber-400/10 text-amber-300':'border-cyan-400/20 bg-cyan-400/10 text-cyan-300';return <span className={`rounded-lg border px-2 py-1 text-xs font-bold ${c}`}>{value}</span>}
function Plan({blocks,horizon,setHorizon,onGenerate,onApprove,approved,actionProps}){return <div className="animate-in"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="text-[10px] font-bold uppercase tracking-[.22em] text-cyan-300/70">Optimization output</div><h2 className="text-2xl font-black">AI Block Schedule</h2></div><div className="flex items-center rounded-xl border border-slate-700/50 bg-slate-950/30 p-1"><button className={`rounded-lg px-3 py-2 text-xs font-bold ${horizon==='weekly'?'bg-cyan-300 text-slate-950':'text-slate-400'}`} onClick={()=>setHorizon('weekly')} {...actionProps('Weekly')}>Weekly</button><button className={`rounded-lg px-3 py-2 text-xs font-bold ${horizon==='monthly'?'bg-cyan-300 text-slate-950':'text-slate-400'}`} onClick={()=>setHorizon('monthly')} {...actionProps('Monthly')}>Monthly</button><button className="ml-1 rounded-lg p-2 text-slate-300 hover:bg-white/5" onClick={onGenerate} {...actionProps('Recalculate','Runs the AI planning engine again for the selected horizon.') }><RefreshCw size={15}/></button></div></div><div className="mb-5 grid gap-3 md:grid-cols-3"><Mini label="Planning objective" value="Minimize operational downtime"/><Mini label="Constraint" value="Protect train movement windows"/><Mini label="Optimization" value="Merge compatible work"/></div><div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-950/30 p-3"><div className="text-sm text-slate-400">{approved?"Officer review recorded (demo state).":"Proposal awaiting officer review."}</div><button onClick={onApprove} disabled={approved} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-black text-slate-950 disabled:opacity-50">{approved?"Approved":"Officer review & approve"}</button></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{blocks.map(b=><article className="card rounded-2xl p-5" key={b.id}><div className="flex items-center justify-between"><span className="rounded-lg bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-200">{b.id}</span><span className="rounded-lg bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">{b.status||"AI PROPOSED"}</span></div><h3 className="mt-4 text-lg font-black">{b.day} · {b.corridor}</h3><div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-950/40 p-3"><Clock3 size={16} className="text-cyan-300"/><b>{b.window}</b><span className="ml-auto text-[10px] font-bold uppercase text-emerald-300">protected</span></div><div className="mt-3 flex flex-wrap gap-1.5">{b.departments?.map(d=><Badge key={d}>{d}</Badge>)}</div><div className="mt-4 flex items-center justify-between border-t border-slate-700/30 pt-3 text-xs text-slate-500"><span>{b.jobs?.length} activities</span><b className="text-slate-300">{b.efficiency}% utilization</b></div></article>)}</div></div>}
function Mini({label,value}){return <div className="rounded-xl border border-slate-700/30 bg-slate-950/25 p-3"><div className="text-[10px] uppercase tracking-[.15em] text-slate-600">{label}</div><div className="mt-1 text-sm font-bold text-slate-300">{value}</div></div>}
function Trains({trains}){return <div className="animate-in"><Panel title="Train timetable & goods forecast" action="Train-aware constraints"><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-[10px] uppercase tracking-[.15em] text-slate-600"><tr>{['Train','Corridor','Day','Movement','Type','Priority'].map(x=><th className="border-b border-slate-700/30 px-3 py-3" key={x}>{x}</th>)}</tr></thead><tbody>{trains.map(t=><tr className="border-b border-slate-700/20" key={t.id}><td className="px-3 py-4"><b>{t.name}</b><small className="mt-1 block text-xs text-slate-600">{t.id}</small></td><td className="px-3 py-4 text-slate-400">{t.corridor}</td><td className="px-3 py-4 text-slate-400">{t.day}</td><td className="px-3 py-4 font-bold">{t.start} – {t.end}</td><td className="px-3 py-4 text-slate-400">{t.type}</td><td className="px-3 py-4"><Severity value={t.priority}/></td></tr>)}</tbody></table></div></Panel></div>}
function Corridors({corridors}){return <div className="animate-in grid gap-4 lg:grid-cols-2">{corridors.map((c,i)=><article className="card overflow-hidden rounded-2xl" key={c.id}><div className="relative h-44"><img src={i%2===0?'/ohe-maintenance.png':'/railway-hero.png'} className="h-full w-full object-cover" alt="Railway corridor"/><div className="absolute inset-0 bg-gradient-to-t from-[#071321] to-transparent"/><div className="absolute bottom-3 left-4 rounded-lg bg-black/30 px-2.5 py-1 text-xs font-black backdrop-blur">{c.id} · COA {c.coaStatus}</div></div><div className="p-5"><h2 className="text-xl font-black">{c.route}</h2><p className="mt-1 text-sm text-slate-500">{c.name}</p><div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span className="text-slate-500">Corridor utilization</span><b>{c.utilization}%</b></div><div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-300" style={{width:`${c.utilization}%`}}/></div></div><div className="mt-4 grid grid-cols-2 gap-3"><Mini label="Block availability" value={c.availability}/><Mini label="COA status" value={c.coaStatus}/></div></div></article>)}</div>}
function Sources(){const data=[['TMS','Track Management System','Track defects, rail condition and maintenance work orders',Activity],['SMMS','Signal Maintenance Management System','Signals, point machines and S&T defects',Network],['TDMS','Traction Distribution Management System','OHE, transformer and electrical maintenance',Zap],['COA','Control Office Application','Corridor availability and approved block windows',Route],['TIMETABLE','Train timetable + goods forecast','Passenger and freight movement constraints',TrainFront]];return <div className="animate-in"><section className="relative overflow-hidden rounded-[28px] border border-slate-700/30 p-7 lg:p-10"><img src="/ohe-maintenance.png" className="absolute inset-0 h-full w-full object-cover opacity-20" alt="OHE maintenance"/><div className="absolute inset-0 bg-gradient-to-r from-[#06101d] via-[#06101d]/95 to-[#06101d]/50"/><div className="relative max-w-2xl"><span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.18em] text-cyan-200">Data fusion layer</span><h2 className="mt-4 text-3xl font-black">Five inputs. One planning brain.</h2><p className="mt-3 text-sm leading-6 text-slate-400">The prototype normalizes maintenance, corridor and train information into a common planning model before optimization.</p></div></section><div className="mt-5 grid gap-3 lg:grid-cols-2">{data.map(([a,b,c,Icon])=><div className="card flex items-center gap-4 rounded-2xl p-4" key={a}><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300"><Icon size={20}/></div><div className="min-w-0 flex-1"><div className="text-[10px] font-black uppercase tracking-[.16em] text-cyan-300/70">{a}</div><b className="block mt-1">{b}</b><p className="mt-1 text-xs leading-5 text-slate-500">{c}</p></div><CheckCircle2 className="shrink-0 text-emerald-400" size={19}/></div>)}</div></div>}

createRoot(document.getElementById('root')).render(<App/>);
