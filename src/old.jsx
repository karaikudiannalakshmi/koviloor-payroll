import { useState, useMemo, useEffect, useRef, Component } from "react";

// ── Error Boundary (catches mobile crashes) ──────────────────────
class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state={error:null}; }
  static getDerivedStateFromError(e){ return {error:e?.message||"Unknown error"}; }
  render(){
    if(this.state.error) return (
      <div style={{padding:32,fontFamily:"Georgia,serif",background:"#fdf3e3",minHeight:"100vh",color:"#6b1a1a"}}>
        <div style={{fontSize:40,marginBottom:16}}>🛕</div>
        <div style={{fontWeight:700,fontSize:18,marginBottom:12}}>Koviloor Madalayam</div>
        <div style={{background:"#fde8e8",border:"2px solid #8b1a1a",borderRadius:8,padding:16,fontSize:13,marginBottom:16}}>
          <b>App Error:</b> {this.state.error}
        </div>
        <button onClick={()=>{ localStorage.clear(); window.location.reload(); }}
          style={{padding:"10px 20px",background:"#6b1a1a",color:"white",border:"none",borderRadius:6,fontSize:14,cursor:"pointer",fontWeight:700}}>
          🔄 Clear & Reload
        </button>
      </div>
    );
    return this.props.children;
  }
}

const LS  = "koviloor_payroll_v3";
const ALS = "koviloor_auth_v2";
const SLS = "koviloor_session_v2";
const load  = ()=>{ try{const s=localStorage.getItem(LS);  return s?JSON.parse(s):null;}catch{return null;}};
const save  = d=>{ try{localStorage.setItem(LS,JSON.stringify(d));}catch{}};
const lAuth = ()=>{ try{const s=localStorage.getItem(ALS);return s?JSON.parse(s):{admin:"admin123",operator:"koviloor2024"};}catch{return{admin:"admin123",operator:"koviloor2024"};}};
const sAuth = d=>{ try{localStorage.setItem(ALS,JSON.stringify(d));}catch{}};
const lSess = ()=>{ try{return localStorage.getItem(SLS)||null;}catch{return null;}};
const sSess = r=>{ try{r?localStorage.setItem(SLS,r):localStorage.removeItem(SLS);}catch{}};

const MONTHS=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dim=(y,m)=>new Date(y,m,0).getDate();
const dow=(y,m,d)=>new Date(y,m-1,d).getDay();
const DOW=["Su","Mo","Tu","We","Th","Fr","Sa"];
const r2=n=>Math.round(n*100)/100;
const fi=n=>Math.abs(Math.round(n*100)/100).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:2});
const fv=v=>parseFloat(v||0)||0;

const T={
  maroon:"#6b1a1a",maroonD:"#4a0e0e",maroonL:"#8b2a2a",
  saffron:"#d4780a",saffronL:"#f0a030",saffronPale:"#fdf3e3",
  goldL:"#e8c06a",cream:"#fef9f0",border:"#e8d5b0",muted:"#8a7060",
  text:"#2d1a0e",bg:"#f5efe3",success:"#1a6b3a",danger:"#8b1a1a",white:"#ffffff",
  blue:"#1a3d6b",blueL:"#dde8ff",green:"#1a5a3a",greenL:"#ddf5e8",
};
const thS={background:T.maroon,color:"white",padding:"7px 10px",fontSize:11,fontWeight:700,textAlign:"center",whiteSpace:"nowrap"};
const tdS={padding:"6px 10px",fontSize:13,borderBottom:`1px solid ${T.border}`,textAlign:"right",color:T.text};
const tdL={padding:"6px 10px",fontSize:13,borderBottom:`1px solid ${T.border}`,textAlign:"left",color:T.text};
const inp=(w)=>({padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:13,outline:"none",color:T.text,background:T.white,width:w||"100%",boxSizing:"border-box",fontFamily:"inherit"});
const card={background:T.white,borderRadius:12,boxShadow:"0 2px 12px rgba(107,26,26,0.08)",marginBottom:16,overflow:"hidden"};
const sec={padding:"12px 18px",background:T.maroon,color:"white",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between"};
const btn=(bg,fg="#fff",sm)=>({padding:sm?"5px 10px":"7px 15px",borderRadius:6,border:"none",cursor:"pointer",fontSize:sm?11:12,fontWeight:700,background:bg,color:fg,fontFamily:"inherit"});

const INIT_DEPTS=[{id:"d1",name:"Office",color:"#6b1a1a"},{id:"d2",name:"Kitchen",color:"#8b4513"},{id:"d3",name:"Garden",color:"#2d6b1a"}];
const INIT_EMPS=[
  {id:1,deptId:"d1",name:"Rajendran",rate:18000,bankName:"Rajendran",acc:"",ifsc:""},
  {id:2,deptId:"d1",name:"Meenakshi",rate:15000,bankName:"Meenakshi",acc:"",ifsc:""},
  {id:3,deptId:"d2",name:"Murugan",rate:16000,bankName:"Murugan",acc:"",ifsc:""},
  {id:4,deptId:"d2",name:"Selvi",rate:14000,bankName:"Selvi",acc:"",ifsc:""},
  {id:5,deptId:"d3",name:"Krishnan",rate:13000,bankName:"Krishnan",acc:"",ifsc:""},
];

function AppInner(){
  const [role,setRole]=useState(()=>lSess());
  const doLogin=r=>{sSess(r);setRole(r);};
  const doLogout=()=>{sSess(null);setRole(null);};

  const [tab,setTab]=useState("att");
  const [deptId,setDeptId]=useState(null);
  const [year,setYear]=useState(()=>(load()||{}).year??new Date().getFullYear());
  const [month,setMonth]=useState(()=>(load()||{}).month??new Date().getMonth()+1);
  const [depts,setDepts]=useState(()=>(load()||{}).depts??INIT_DEPTS);
  const [emps,setEmps]=useState(()=>(load()||{}).emps??INIT_EMPS);
  const [att,setAtt]=useState(()=>(load()||{}).att??{});
  const [ot,setOt]=useState(()=>(load()||{}).ot??{});
  const [adv,setAdv]=useState(()=>(load()||{}).adv??{});
  // loan[id] = { ob, given, ded }  →  balance = ob + given - ded
  const [loan,setLoan]=useState(()=>(load()||{}).loan??{});
  const [pf,setPf]=useState(()=>(load()||{}).pf??{});
  const [esi,setEsi]=useState(()=>(load()||{}).esi??{});
  const [dbAcc,setDbAcc]=useState(()=>(load()||{}).dbAcc??"");
  const [nid,setNid]=useState(()=>(load()||{}).nid??6);
  const [ndid,setNdid]=useState(()=>(load()||{}).ndid??4);
  const [toast,setToast]=useState("");
  const [showPwd,setShowPwd]=useState(false);
  const importRef=useRef();

  const activeDept=deptId||(depts[0]?.id||null);
  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  const sr=useRef();
  sr.current={year,month,depts,emps,att,ot,adv,loan,pf,esi,dbAcc,nid,ndid};
  useEffect(()=>{save(sr.current);},[year,month,depts,emps,att,ot,adv,loan,pf,esi,dbAcc,nid,ndid]);

  const exportData=()=>{
    const b=new Blob([JSON.stringify(sr.current,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);
    a.download=`Koviloor_${MONTHS[month]}_${year}.json`;a.click();
    showToast("✅ Exported");
  };
  const importData=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        if(d.depts)setDepts(d.depts);if(d.emps)setEmps(d.emps);
        if(d.att)setAtt(d.att);if(d.ot)setOt(d.ot);
        if(d.adv)setAdv(d.adv);if(d.loan)setLoan(d.loan);
        if(d.pf)setPf(d.pf);if(d.esi)setEsi(d.esi);
        if(d.year)setYear(d.year);if(d.month)setMonth(d.month);
        if(d.dbAcc)setDbAcc(d.dbAcc);if(d.nid)setNid(d.nid);if(d.ndid)setNdid(d.ndid);
        showToast("✅ Imported");
      }catch{showToast("❌ Invalid file");}
    };
    r.readAsText(f);e.target.value="";
  };

  const nd=dim(year,month);
  const days=Array.from({length:nd},(_,i)=>i+1);
  const ga=(eid,d)=>{const v=att[`${eid}_${d}`];return v===undefined?null:v;};
  const sa=(eid,d,v)=>setAtt(p=>({...p,[`${eid}_${d}`]:v}));
  const got=(eid,d)=>ot[`${eid}_${d}`]??"";
  const sot=(eid,d,v)=>setOt(p=>({...p,[`${eid}_${d}`]:v}));

  const settle=useMemo(()=>emps.map(emp=>{
    const dr=emp.rate/26;let daysWorked=0;
    days.forEach(d=>{const v=ga(emp.id,d);if(v!==null&&v!==undefined)daysWorked+=fv(v);});
    const otHours=days.reduce((s,d)=>{const h=fv(got(emp.id,d));return s+(isNaN(h)?0:h);},0);
    const baseSal=r2(dr*daysWorked),otPay=r2(otHours*(dr/8)),gross=r2(baseSal+otPay);
    const advAmt=r2(fv(adv[emp.id]));
    const ln=loan[emp.id]||{};
    const lnOB=r2(fv(ln.ob)),lnGiven=r2(fv(ln.given)),lnDed=r2(fv(ln.ded));
    const lnBal=r2(lnOB+lnGiven-lnDed);
    const pfAmt=r2(fv(pf[emp.id])),esiAmt=r2(fv(esi[emp.id]));
    const totalDed=r2(advAmt+lnDed+pfAmt+esiAmt);
    const net=r2(gross-totalDed);
    return {emp,daysWorked:r2(daysWorked),otHours:r2(otHours),baseSal,otPay,gross,advAmt,lnOB,lnGiven,lnDed,lnBal,pfAmt,esiAmt,totalDed,net};
  }),[emps,att,ot,adv,loan,pf,esi,nd,year,month]);

  const ALL_TABS=[
    {id:"att",icon:"📅",label:"Attendance"},
    {id:"salary",icon:"💰",label:"Salary"},
    {id:"ded",icon:"📋",label:"Deductions"},
    {id:"payslip",icon:"🧾",label:"Payslips"},
    {id:"bank",icon:"🏦",label:"Bank Upload"},
    {id:"emps",icon:"👥",label:"Employees"},
    {id:"depts",icon:"🏛️",label:"Departments"},
  ];
  const TABS=role==="admin"?ALL_TABS:ALL_TABS.filter(t=>t.id==="att");
  const safeTab=TABS.find(t=>t.id===tab)?tab:"att";

  return(
    <div style={{fontFamily:"Georgia,serif",background:T.bg,minHeight:"100vh",fontSize:14}}>
      {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.startsWith("✅")?T.success:T.danger,color:"white",padding:"10px 24px",borderRadius:8,fontWeight:700,fontSize:13,zIndex:9998,pointerEvents:"none",boxShadow:"0 4px 20px rgba(0,0,0,0.3)"}}>{toast}</div>}
      {showPwd&&<PwdModal onClose={()=>setShowPwd(false)} showToast={showToast}/>}
      <input ref={importRef} type="file" accept=".json" onChange={importData} style={{display:"none"}}/>

      {/* ── Header ── */}
      <div style={{background:`linear-gradient(135deg,${T.maroonD},${T.maroon},${T.maroonL})`,color:"white",padding:"12px 20px",boxShadow:"0 4px 16px rgba(107,26,26,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{fontSize:32}}>🛕</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:700,letterSpacing:"0.04em"}}>Koviloor Madalayam</div>
            <div style={{fontSize:10,opacity:0.65,letterSpacing:"0.1em",marginTop:2,fontFamily:"sans-serif"}}>STAFF SALARY MANAGEMENT</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {role==="admin"&&<>
              <select value={month} onChange={e=>setMonth(+e.target.value)} style={{padding:"5px 10px",borderRadius:5,border:"none",background:"rgba(255,255,255,0.12)",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {MONTHS.slice(1).map((m,i)=><option key={i} value={i+1} style={{background:T.maroon}}>{m}</option>)}
              </select>
              <input type="number" value={year} onChange={e=>setYear(+e.target.value)} style={{width:68,padding:"5px 8px",borderRadius:5,border:"none",background:"rgba(255,255,255,0.12)",color:"white",fontSize:13,textAlign:"center"}}/>
              <div style={{width:1,height:22,background:"rgba(255,255,255,0.2)"}}/>
              <button onClick={exportData} style={{...btn("rgba(212,120,10,0.4)",T.saffronL,true),border:"1px solid rgba(212,120,10,0.5)"}}>⬇ Export</button>
              <button onClick={()=>importRef.current.click()} style={{...btn("rgba(255,255,255,0.1)","rgba(255,255,255,0.8)",true),border:"1px solid rgba(255,255,255,0.2)"}}>⬆ Import</button>
              <div style={{width:1,height:22,background:"rgba(255,255,255,0.2)"}}/>
            </>}
            <div style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",fontSize:11,fontWeight:700,color:role==="admin"?T.saffronL:"#a5d8ff",fontFamily:"sans-serif"}}>
              {role==="admin"?"🔐 ADMIN":"👤 OPERATOR"}
            </div>
            {role==="admin"&&<button onClick={()=>setShowPwd(true)} style={{...btn("rgba(255,255,255,0.08)","rgba(255,255,255,0.7)",true),border:"1px solid rgba(255,255,255,0.15)"}}>🔑</button>}
            <button onClick={doLogout} style={btn(T.danger,"white",true)}>⏏ Logout</button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontFamily:"sans-serif"}}>DEPT:</span>
          {depts.map(d=>(
            <button key={d.id} onClick={()=>setDeptId(d.id)}
              style={{padding:"4px 14px",borderRadius:20,border:`2px solid ${activeDept===d.id?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.2)"}`,background:activeDept===d.id?"rgba(255,255,255,0.2)":"transparent",color:"white",cursor:"pointer",fontSize:12,fontWeight:activeDept===d.id?700:400,fontFamily:"sans-serif"}}>
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{background:T.maroonL,display:"flex",overflowX:"auto",borderBottom:`3px solid ${T.saffron}`}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{padding:"10px 16px",border:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:13,background:safeTab===t.id?T.cream:"transparent",color:safeTab===t.id?T.maroon:"rgba(255,255,255,0.8)",fontWeight:safeTab===t.id?700:400,borderBottom:safeTab===t.id?`3px solid ${T.saffron}`:"3px solid transparent",display:"flex",alignItems:"center",gap:5,fontFamily:"sans-serif",marginBottom:-3}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{padding:16,maxWidth:1600,margin:"0 auto"}}>
        {safeTab==="att"    &&<AttTab {...{emps,depts,activeDept,days,year,month,ga,sa,got,sot,role}}/>}
        {safeTab==="salary" &&role==="admin"&&<SalaryTab {...{settle,depts,activeDept,month,year}}/>}
        {safeTab==="ded"    &&role==="admin"&&<DedTab {...{emps,depts,activeDept,adv,setAdv,loan,setLoan,pf,setPf,esi,setEsi,month,year,showToast}}/>}
        {safeTab==="payslip"&&role==="admin"&&<PayslipTab {...{settle,depts,activeDept,month,year}}/>}
        {safeTab==="bank"   &&role==="admin"&&<BankTab {...{settle,depts,activeDept,month,year,dbAcc,setDbAcc}}/>}
        {safeTab==="emps"   &&role==="admin"&&<EmpsTab {...{emps,setEmps,depts,activeDept,nid,setNid}}/>}
        {safeTab==="depts"  &&role==="admin"&&<DeptsTab {...{depts,setDepts,emps,ndid,setNdid,setDeptId}}/>}
      </div>
      {!role&&<LoginOverlay onLogin={doLogin}/>}
    </div>
  );
}

export default function App(){
  return <ErrorBoundary><AppInner/></ErrorBoundary>;
}

// ════════ LOGIN ════════
function LoginOverlay({onLogin}){
  const [user,setUser]=useState("");const [pass,setPass]=useState("");
  const [err,setErr]=useState("");const [showP,setShowP]=useState(false);const [which,setWhich]=useState(null);
  const go=()=>{
    const c=lAuth();
    if(!user.trim()||!pass.trim()){setErr("Enter username and password.");return;}
    if(user==="admin"&&pass===c.admin){onLogin("admin");return;}
    if(user==="operator"&&pass===c.operator){onLogin("operator");return;}
    setErr("Incorrect username or password.");
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:`linear-gradient(160deg,${T.maroonD} 0%,${T.maroon} 40%,${T.saffron} 100%)`,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:56,marginBottom:8}}>🛕</div>
          <div style={{fontSize:22,fontWeight:700,color:"white",letterSpacing:"0.04em"}}>Koviloor Madalayam</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginTop:4,fontFamily:"sans-serif"}}>STAFF SALARY MANAGEMENT</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[{r:"admin",icon:"🔐",l:"Admin",d:"Full access"},{r:"operator",icon:"👤",l:"Operator",d:"Attendance only"}].map(x=>(
            <div key={x.r} onClick={()=>{setWhich(x.r);setUser(x.r);setPass("");setErr("");}}
              style={{background:which===x.r?"rgba(212,120,10,0.25)":"rgba(255,255,255,0.06)",border:`2px solid ${which===x.r?"rgba(240,160,48,0.8)":"rgba(255,255,255,0.15)"}`,borderRadius:10,padding:"14px 10px",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:4}}>{x.icon}</div>
              <div style={{fontWeight:700,color:which===x.r?T.saffronL:"white",fontSize:13,fontFamily:"sans-serif"}}>{x.l}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2,fontFamily:"sans-serif"}}>{x.d}</div>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:14,padding:24,border:"1px solid rgba(255,255,255,0.15)"}}>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,fontFamily:"sans-serif"}}>USERNAME</label>
            <input value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="admin or operator"
              style={{...inp(),background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"9px 12px",fontSize:14}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,fontFamily:"sans-serif"}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Password"
                style={{...inp(),background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"9px 38px 9px 12px",fontSize:14}}/>
              <button onClick={()=>setShowP(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"rgba(255,255,255,0.5)",padding:0}}>{showP?"🙈":"👁"}</button>
            </div>
          </div>
          {err&&<div style={{background:"rgba(139,26,26,0.35)",borderRadius:6,padding:"8px 12px",color:"#ffaaaa",fontSize:12,fontWeight:600,marginBottom:14,textAlign:"center"}}>{err}</div>}
          <button onClick={go} style={{width:"100%",padding:12,borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(90deg,${T.saffron},${T.saffronL})`,color:T.maroonD,fontWeight:800,fontSize:15,fontFamily:"Georgia,serif"}}>Sign In →</button>
          <div style={{marginTop:14,fontSize:10,color:"rgba(255,255,255,0.3)",textAlign:"center",lineHeight:1.8,fontFamily:"sans-serif"}}>admin / admin123 · operator / koviloor2024</div>
        </div>
      </div>
    </div>
  );
}

// ════════ PASSWORD MODAL ════════
function PwdModal({onClose,showToast}){
  const c=lAuth();
  const [aNew,setANew]=useState("");const [aC,setAC]=useState("");
  const [oNew,setONew]=useState("");const [oC,setOC]=useState("");const [err,setErr]=useState("");
  const save=()=>{
    if(aNew&&aNew!==aC){setErr("Admin passwords don't match.");return;}
    if(oNew&&oNew!==oC){setErr("Operator passwords don't match.");return;}
    if((aNew&&aNew.length<6)||(oNew&&oNew.length<6)){setErr("Minimum 6 characters.");return;}
    if(!aNew&&!oNew){setErr("Enter at least one new password.");return;}
    sAuth({admin:aNew||c.admin,operator:oNew||c.operator});
    showToast("✅ Passwords updated");onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(74,14,14,0.7)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(3px)"}}>
      <div style={{background:T.white,borderRadius:14,width:420,maxWidth:"95vw",boxShadow:"0 24px 64px rgba(0,0,0,0.4)"}}>
        <div style={{...sec,borderRadius:"14px 14px 0 0"}}><span>🔑 Change Passwords</span><button onClick={onClose} style={btn("rgba(255,255,255,0.15)")}>✕</button></div>
        <div style={{padding:20}}>
          {[["Admin 🔐",aNew,setANew,aC,setAC],["Operator 👤",oNew,setONew,oC,setOC]].map(([lbl,nv,setN,cv,setC])=>(
            <div key={lbl} style={{marginBottom:16,padding:14,background:T.saffronPale,borderRadius:8,border:`1px solid ${T.border}`}}>
              <div style={{fontWeight:700,color:T.maroon,marginBottom:10,fontSize:13}}>{lbl}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                <div><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>NEW PASSWORD</label><input type="password" value={nv} onChange={e=>{setN(e.target.value);setErr("");}} placeholder="min 6 chars" style={inp()}/></div>
                <div><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>CONFIRM</label><input type="password" value={cv} onChange={e=>{setC(e.target.value);setErr("");}} placeholder="repeat" style={{...inp(),borderColor:nv&&cv&&nv!==cv?T.danger:T.border}}/></div>
              </div>
            </div>
          ))}
          {err&&<div style={{background:"#fef0ef",borderRadius:6,padding:"8px 12px",color:T.danger,fontSize:12,marginBottom:12}}>{err}</div>}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={onClose} style={btn("#e8d5b0",T.text)}>Cancel</button>
            <button onClick={save} style={btn(T.maroon)}>💾 Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════ ATTENDANCE ════════
function AttTab({emps,depts,activeDept,days,year,month,ga,sa,got,sot,role}){
  const [mode,setMode]=useState("att");
  const de=emps.filter(e=>e.deptId===activeDept);
  const dept=depts.find(d=>d.id===activeDept);
  const markAll=eid=>days.forEach(d=>{if(dow(year,month,d)!==0)sa(eid,d,1);});
  const clrAll=eid=>days.forEach(d=>sa(eid,d,0));
  return(
    <div style={card}>
      <div style={sec}>
        <span>📅 {mode==="att"?"Attendance":"OT / Partial"} — {dept?.name} — {MONTHS[month]} {year}</span>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setMode("att")} style={btn(mode==="att"?T.saffron:T.maroonL,mode==="att"?T.maroonD:"white",true)}>Attendance</button>
          <button onClick={()=>setMode("ot")} style={btn(mode==="ot"?T.saffron:T.maroonL,mode==="ot"?T.maroonD:"white",true)}>OT / Partial</button>
        </div>
      </div>
      <div style={{padding:"8px 14px",background:T.saffronPale,borderBottom:`1px solid ${T.border}`,fontSize:11,color:T.muted,fontFamily:"sans-serif"}}>
        {mode==="att"?"💡 Click = ✓ Present · again = ½ Half Day · again = ✗ Absent · again = Clear. Sundays shaded.":"💡 Enter OT / partial hours. Paid at Daily Rate ÷ 8 per hour."}
      </div>
      {de.length===0?<div style={{padding:32,textAlign:"center",color:T.muted}}>No employees in this department.</div>:(
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",minWidth:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left",minWidth:160,position:"sticky",left:0,zIndex:2}}>Employee</th>
              <th style={{...thS,minWidth:50}}>{mode==="att"?"Days":"Hrs"}</th>
              {days.map(d=>{const dw=dow(year,month,d);return <th key={d} style={{...thS,background:dw===0?"#3d1a5a":T.maroon,minWidth:mode==="att"?28:46,padding:"3px 1px"}}><div style={{fontSize:8,opacity:0.7}}>{DOW[dw]}</div><div style={{fontSize:11}}>{d}</div></th>;})}
            </tr></thead>
            <tbody>{de.map((emp,ei)=>{
              const dW=days.reduce((s,d)=>{const v=ga(emp.id,d);return s+(v!==null&&v!==undefined?fv(v):0);},0);
              const tH=days.reduce((s,d)=>{const h=fv(got(emp.id,d));return s+(isNaN(h)?0:h);},0);
              const rb=ei%2===0?T.white:"#fdf5e8";
              return <tr key={emp.id}>
                <td style={{...tdL,background:rb,position:"sticky",left:0,zIndex:1,fontWeight:600}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                    <span>{emp.name}</span>
                    {mode==="att"&&role==="admin"&&<div style={{display:"flex",gap:3}}>
                      <button onClick={()=>markAll(emp.id)} style={{...btn(T.success,"white",true),padding:"2px 6px",fontSize:10}}>All</button>
                      <button onClick={()=>clrAll(emp.id)} style={{...btn("#e8d5b0",T.text,true),padding:"2px 6px",fontSize:10}}>Clr</button>
                    </div>}
                  </div>
                </td>
                <td style={{...tdS,background:rb,fontWeight:700,color:T.maroon}}>{mode==="att"?dW.toFixed(1):tH.toFixed(1)}</td>
                {days.map(d=>{
                  const dw=dow(year,month,d);
                  if(mode==="att"){
                    const v=ga(emp.id,d);const isSun=dw===0;
                    const cyc=()=>{if(v===null||v===undefined)sa(emp.id,d,1);else if(v===1)sa(emp.id,d,0.5);else if(v===0.5)sa(emp.id,d,0);else sa(emp.id,d,null);};
                    return <td key={d} onClick={!isSun&&role==="admin"?cyc:undefined}
                      style={{textAlign:"center",padding:"4px 1px",background:isSun?"#f0e8f8":v===1?"#d4f0e4":v===0.5?"#fef3cd":v===0?"#fde8e8":rb,cursor:!isSun&&role==="admin"?"pointer":"default",borderLeft:`1px solid ${T.border}`,fontWeight:700,fontSize:11,userSelect:"none",minWidth:28}}>
                      {isSun?"·":v===1?"✓":v===0.5?"½":v===0?"✗":""}
                    </td>;
                  }else{
                    const val=got(emp.id,d);const num=fv(val);
                    return <td key={d} style={{padding:"2px 1px",background:dw===0?"#f0e8f8":rb,borderLeft:`1px solid ${T.border}`}}>
                      {dw!==0&&<input type="number" step="0.5" value={val} onChange={e=>sot(emp.id,d,e.target.value)} placeholder="0"
                        style={{...inp(44),textAlign:"center",fontSize:11,padding:"3px 2px",background:num>0?"#edf7f2":num<0?"#fef0ef":T.white}}/>}
                    </td>;
                  }
                })}
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ════════ SALARY ════════
function SalaryTab({settle,depts,activeDept,month,year}){
  const dept=depts.find(d=>d.id===activeDept);
  const rows=settle.filter(s=>s.emp.deptId===activeDept);
  return(
    <div style={card}>
      <div style={sec}><span>💰 Salary Statement — {dept?.name} — {MONTHS[month]} {year}</span></div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left"}}>Employee</th>
            <th style={thS}>Rate/Month</th><th style={thS}>Days</th>
            <th style={thS}>Basic</th><th style={thS}>OT</th>
            <th style={{...thS,background:T.success}}>Gross</th>
            <th style={thS}>Advance</th><th style={thS}>Loan Ded.</th>
            <th style={{...thS,background:T.blue}}>PF</th>
            <th style={{...thS,background:T.green}}>ESI</th>
            <th style={{...thS,background:T.saffron,color:T.maroonD}}>Net Pay</th>
          </tr></thead>
          <tbody>{rows.map((s,i)=>(
            <tr key={s.emp.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
              <td style={tdL}><b>{s.emp.name}</b></td>
              <td style={tdS}>₹{fi(s.emp.rate)}</td>
              <td style={{...tdS,fontWeight:700,color:T.maroon}}>{s.daysWorked}</td>
              <td style={tdS}>₹{fi(s.baseSal)}</td>
              <td style={{...tdS,color:s.otPay>0?T.success:T.muted}}>₹{fi(s.otPay)}</td>
              <td style={{...tdS,fontWeight:700,color:T.success}}>₹{fi(s.gross)}</td>
              <td style={{...tdS,color:s.advAmt>0?T.danger:T.muted}}>₹{fi(s.advAmt)}</td>
              <td style={{...tdS,color:s.lnDed>0?T.danger:T.muted}}>₹{fi(s.lnDed)}</td>
              <td style={{...tdS,color:s.pfAmt>0?T.blue:T.muted}}>₹{fi(s.pfAmt)}</td>
              <td style={{...tdS,color:s.esiAmt>0?T.green:T.muted}}>₹{fi(s.esiAmt)}</td>
              <td style={{...tdS,fontWeight:800,fontSize:14,color:s.net<0?T.danger:T.maroon}}>₹{fi(s.net)}</td>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:T.maroon,color:"white"}}>
            <td colSpan={3} style={{...tdL,color:"white",fontWeight:700}}>TOTAL — {rows.length} staff</td>
            <td style={{...tdS,color:T.saffronL,fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.baseSal,0))}</td>
            <td style={{...tdS,color:T.saffronL,fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.otPay,0))}</td>
            <td style={{...tdS,color:"#90ee90",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.gross,0))}</td>
            <td style={{...tdS,color:"#ffaaaa",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.advAmt,0))}</td>
            <td style={{...tdS,color:"#ffaaaa",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.lnDed,0))}</td>
            <td style={{...tdS,color:"#aac4ff",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.pfAmt,0))}</td>
            <td style={{...tdS,color:"#90eecc",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.esiAmt,0))}</td>
            <td style={{...tdS,color:T.goldL,fontWeight:900,fontSize:15}}>₹{fi(rows.reduce((s,r)=>s+r.net,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ════════ DEDUCTIONS TAB ════════
function DedTab({emps,depts,activeDept,adv,setAdv,loan,setLoan,pf,setPf,esi,setEsi,month,year,showToast}){
  const [showCF,setShowCF]=useState(false);
  const de=emps.filter(e=>e.deptId===activeDept);
  const dept=depts.find(d=>d.id===activeDept);

  // balance = ob + given - ded
  const lnBal=e=>{const ln=loan[e.id]||{};return r2(fv(ln.ob)+fv(ln.given)-fv(ln.ded));};

  const carryForward=()=>{
    const nl={};
    emps.forEach(e=>{
      const bal=lnBal(e);
      nl[e.id]={ob:bal>0?bal:0,given:"",ded:""};
    });
    setLoan(nl);
    setAdv({}); // advances cleared – already deducted this month
    // pf and esi retained as recurring
    setShowCF(false);
    showToast("✅ Carried forward to next month");
  };

  const NI=(val,onChange,w=95)=>(
    <input type="number" value={val??""} onChange={onChange} placeholder="0"
      style={{...inp(w),textAlign:"right",padding:"5px 7px"}}/>
  );

  const secBg=(bg)=>({...sec,background:bg});

  return(
    <div>
      {/* Carry Forward Modal */}
      {showCF&&<div style={{position:"fixed",inset:0,background:"rgba(74,14,14,0.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
        <div style={{background:T.white,borderRadius:12,padding:28,width:440,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{textAlign:"center",fontSize:36,marginBottom:10}}>🔄</div>
          <div style={{fontWeight:800,fontSize:15,color:T.maroon,textAlign:"center",marginBottom:12}}>New Month — Carry Forward</div>
          <div style={{fontSize:13,color:T.muted,background:T.saffronPale,padding:14,borderRadius:8,lineHeight:2,marginBottom:20}}>
            ✅ Loan balance (OP Bal + Given − Ded) → new Opening Balance<br/>
            ✅ Loan Given & Deduction fields reset to zero<br/>
            ✅ Advance cleared (already deducted this month)<br/>
            ✅ PF & ESI kept as recurring deductions<br/>
            <span style={{color:T.danger,fontWeight:600}}>⚠ Export data first before proceeding</span>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setShowCF(false)} style={btn("#e8d5b0",T.text)}>Cancel</button>
            <button onClick={carryForward} style={btn(T.maroon)}>✅ Carry Forward</button>
          </div>
        </div>
      </div>}

      {/* Top bar */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,fontFamily:"sans-serif",color:T.muted}}>
          Deductions for <b style={{color:T.maroon}}>{dept?.name}</b> — {MONTHS[month]} {year}
        </div>
        <button onClick={()=>setShowCF(true)} style={{...btn(T.saffron,T.maroonD),fontSize:13}}>🔄 New Month Setup</button>
      </div>

      {/* ── Loan Ledger ── */}
      <div style={card}>
        <div style={{...sec,background:"#3d2200"}}>
          <span>🏦 Loan Ledger — {dept?.name}</span>
          <span style={{fontSize:11,opacity:0.7,fontFamily:"sans-serif",fontWeight:400}}>Balance = OP Bal + Given Now − Deduction (carried to next month)</span>
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left",background:"#3d2200",minWidth:140}}>Employee</th>
              <th style={{...thS,background:"#5a3400",minWidth:110}}>OP Balance (₹)</th>
              <th style={{...thS,background:"#1a5a00",minWidth:110}}>Loan Given Now (₹)</th>
              <th style={{...thS,background:"#6b1a1a",minWidth:110}}>Deduction (₹)</th>
              <th style={{...thS,background:"#1a3d6b",minWidth:130}}>Balance (₹)</th>
            </tr></thead>
            <tbody>{de.map((e,i)=>{
              const ln=loan[e.id]||{};
              const bal=lnBal(e);
              const rb=i%2===0?T.white:"#fdf8f0";
              return <tr key={e.id}>
                <td style={{...tdL,background:rb}}><b>{e.name}</b></td>
                <td style={{...tdS,padding:"5px 8px",background:rb}}>
                  {NI(ln.ob,ev=>setLoan(p=>({...p,[e.id]:{...(p[e.id]||{}),ob:ev.target.value}})))}
                </td>
                <td style={{...tdS,padding:"5px 8px",background:i%2===0?"#f0fae8":"#e8f5d8"}}>
                  {NI(ln.given,ev=>setLoan(p=>({...p,[e.id]:{...(p[e.id]||{}),given:ev.target.value}})))}
                </td>
                <td style={{...tdS,padding:"5px 8px",background:i%2===0?"#fef5f5":"#fdeae8"}}>
                  {NI(ln.ded,ev=>setLoan(p=>({...p,[e.id]:{...(p[e.id]||{}),ded:ev.target.value}})))}
                </td>
                <td style={{...tdS,fontWeight:800,fontSize:14,color:bal>0?T.danger:bal<0?"#1a5a00":T.muted}}>
                  {bal>0?`₹${fi(bal)}`:bal<0?<span style={{color:T.success,fontSize:12}}>Cleared+₹{fi(-bal)}</span>:"—"}
                </td>
              </tr>;
            })}</tbody>
            <tfoot><tr style={{background:"#3d2200",color:"white"}}>
              <td style={{...tdL,color:"white",fontWeight:700}}>TOTAL</td>
              <td style={{...tdS,color:T.saffronL,fontWeight:700}}>₹{fi(de.reduce((s,e)=>s+fv((loan[e.id]||{}).ob),0))}</td>
              <td style={{...tdS,color:"#b8ffb8",fontWeight:700}}>₹{fi(de.reduce((s,e)=>s+fv((loan[e.id]||{}).given),0))}</td>
              <td style={{...tdS,color:"#ffb8b8",fontWeight:700}}>₹{fi(de.reduce((s,e)=>s+fv((loan[e.id]||{}).ded),0))}</td>
              <td style={{...tdS,color:"#aac4ff",fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+lnBal(e),0))}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      {/* ── Advance | PF | ESI ── */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>

        {/* Advance */}
        <div style={card}>
          <div style={secBg("#6b4a00")}>
            <span>💳 Advance — {dept?.name}</span>
            <span style={{fontSize:10,fontWeight:400,opacity:0.8}}>Deducted this month, cleared next</span>
          </div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left",background:"#6b4a00"}}>Employee</th>
              <th style={{...thS,background:"#6b4a00"}}>Amount (₹)</th>
            </tr></thead>
            <tbody>{de.map((e,i)=>(
              <tr key={e.id} style={{background:i%2===0?T.white:"#fdf8f0"}}>
                <td style={tdL}><b>{e.name}</b></td>
                <td style={{...tdS,padding:"5px 8px"}}>
                  {NI(adv[e.id],ev=>setAdv(p=>({...p,[e.id]:ev.target.value})),120)}
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#6b4a00",color:"white"}}>
              <td style={{...tdL,color:"white",fontWeight:700}}>Total</td>
              <td style={{...tdS,color:T.saffronL,fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+fv(adv[e.id]),0))}</td>
            </tr></tfoot>
          </table>
        </div>

        {/* PF */}
        <div style={card}>
          <div style={secBg(T.blue)}>
            <span>🏛 PF Deduction — {dept?.name}</span>
            <span style={{fontSize:10,fontWeight:400,opacity:0.8}}>Provident Fund (recurring)</span>
          </div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left",background:T.blue}}>Employee</th>
              <th style={{...thS,background:T.blue}}>PF Amount (₹)</th>
            </tr></thead>
            <tbody>{de.map((e,i)=>(
              <tr key={e.id} style={{background:i%2===0?T.white:T.blueL}}>
                <td style={tdL}><b>{e.name}</b></td>
                <td style={{...tdS,padding:"5px 8px"}}>
                  {NI(pf[e.id],ev=>setPf(p=>({...p,[e.id]:ev.target.value})),120)}
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:T.blue,color:"white"}}>
              <td style={{...tdL,color:"white",fontWeight:700}}>Total PF</td>
              <td style={{...tdS,color:"#aac4ff",fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+fv(pf[e.id]),0))}</td>
            </tr></tfoot>
          </table>
        </div>

        {/* ESI */}
        <div style={card}>
          <div style={secBg(T.green)}>
            <span>🏥 ESI Deduction — {dept?.name}</span>
            <span style={{fontSize:10,fontWeight:400,opacity:0.8}}>Employee State Insurance (recurring)</span>
          </div>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left",background:T.green}}>Employee</th>
              <th style={{...thS,background:T.green}}>ESI Amount (₹)</th>
            </tr></thead>
            <tbody>{de.map((e,i)=>(
              <tr key={e.id} style={{background:i%2===0?T.white:T.greenL}}>
                <td style={tdL}><b>{e.name}</b></td>
                <td style={{...tdS,padding:"5px 8px"}}>
                  {NI(esi[e.id],ev=>setEsi(p=>({...p,[e.id]:ev.target.value})),120)}
                </td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:T.green,color:"white"}}>
              <td style={{...tdL,color:"white",fontWeight:700}}>Total ESI</td>
              <td style={{...tdS,color:"#90eeda",fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+fv(esi[e.id]),0))}</td>
            </tr></tfoot>
          </table>
        </div>

      </div>
    </div>
  );
}

// ════════ PAYSLIPS ════════
function PayslipTab({settle,depts,activeDept,month,year}){
  const [sel,setSel]=useState(null);
  const dept=depts.find(d=>d.id===activeDept);
  const rows=settle.filter(s=>s.emp.deptId===activeDept);
  const disp=sel===null?rows:rows.filter(s=>s.emp.id===sel);

  const printSlip=s=>{
    const w=window.open("","_blank","width=600,height=760");
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title>
    <style>body{font-family:Georgia,serif;margin:0;padding:20px;background:#fef9f0;color:#2d1a0e;font-size:13px;}
    .hdr{background:#6b1a1a;color:white;padding:14px 18px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;}
    .hdr h2{margin:0;font-size:15px;letter-spacing:.03em;}.sub{font-size:10px;opacity:.65;margin-top:3px;font-family:sans-serif;}
    .badge{background:#d4780a;color:#4a0e0e;padding:4px 12px;border-radius:5px;font-weight:800;font-size:12px;}
    .body{border:2px solid #e8d5b0;border-top:none;border-radius:0 0 8px 8px;padding:16px;background:white;}
    .sec{font-size:10px;font-weight:700;color:#8a7060;letter-spacing:.08em;text-transform:uppercase;margin:12px 0 6px;font-family:sans-serif;}
    .row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f5efe3;font-size:12px;}
    .lbl{color:#8a7060;font-family:sans-serif;}.val{font-weight:600;}
    .tot{display:flex;justify-content:space-between;font-weight:800;font-size:14px;padding:8px 0;border-top:2px solid #e8d5b0;margin-top:4px;}
    .net{background:#fdf3e3;border:2px solid #d4780a;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:14px;}
    .netlbl{font-weight:700;font-size:15px;}.netval{font-weight:900;font-size:26px;color:#6b1a1a;}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;}
    .footer{margin-top:12px;font-size:10px;color:#8a7060;text-align:center;border-top:1px dashed #e8d5b0;padding-top:8px;font-family:sans-serif;}
    @media print{button{display:none!important;}}</style></head><body>
    <div class="hdr"><div><h2>🛕 Koviloor Madalayam</h2><div class="sub">${dept?.name} &nbsp;·&nbsp; ${s.emp.name} &nbsp;·&nbsp; ${MONTHS[month]} ${year}</div></div><div class="badge">${s.daysWorked} Days</div></div>
    <div class="body">
      <div class="sec">Earnings</div>
      <div class="grid">
        <div><div class="row"><span class="lbl">Basic (${s.daysWorked}d × ₹${fi(s.emp.rate/26)}/day)</span><span class="val">₹${fi(s.baseSal)}</span></div></div>
        <div><div class="row"><span class="lbl">OT Pay (${s.otHours} hrs)</span><span class="val" style="color:${s.otPay>0?"#1a6b3a":"#8a7060"}">${s.otPay>0?"₹"+fi(s.otPay):"Nil"}</span></div></div>
      </div>
      <div class="tot"><span>Gross Earnings</span><span style="color:#1a6b3a">₹${fi(s.gross)}</span></div>
      <div class="sec">Deductions</div>
      <div class="grid">
        <div>
          <div class="row"><span class="lbl">Advance</span><span class="val" style="color:${s.advAmt>0?"#8b1a1a":"#8a7060"}">−₹${fi(s.advAmt)}</span></div>
          <div class="row"><span class="lbl">Loan Deduction</span><span class="val" style="color:${s.lnDed>0?"#8b1a1a":"#8a7060"}">−₹${fi(s.lnDed)}</span></div>
          ${s.lnBal>0?`<div class="row"><span class="lbl" style="font-size:11px">Loan Balance c/f</span><span class="val" style="color:#8a7060;font-size:11px">₹${fi(s.lnBal)}</span></div>`:""}
        </div>
        <div>
          <div class="row"><span class="lbl">PF Deduction</span><span class="val" style="color:${s.pfAmt>0?"#1a3d6b":"#8a7060"}">−₹${fi(s.pfAmt)}</span></div>
          <div class="row"><span class="lbl">ESI Deduction</span><span class="val" style="color:${s.esiAmt>0?"#1a5a3a":"#8a7060"}">−₹${fi(s.esiAmt)}</span></div>
        </div>
      </div>
      <div class="tot"><span>Total Deductions</span><span style="color:#8b1a1a">−₹${fi(s.totalDed)}</span></div>
      <div class="net"><span class="netlbl">NET SALARY</span><span class="netval">₹${fi(s.net)}</span></div>
      <div class="footer">Koviloor Madalayam · ${dept?.name} · ${MONTHS[month]} ${year} · Generated ${new Date().toLocaleDateString("en-IN")}</div>
    </div>
    <br/><button onclick="window.print()" style="padding:10px 24px;background:#6b1a1a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;">🖨️ Print / Save PDF</button>
    </body></html>`);w.document.close();
  };

  return(
    <div>
      <div style={{...card,marginBottom:12}}>
        <div style={sec}>
          <span>🧾 Payslips — {dept?.name} — {MONTHS[month]} {year}</span>
          <button onClick={()=>disp.forEach(s=>printSlip(s))} style={btn(T.saffron,T.maroonD,true)}>🖨️ Print {sel===null?"All":"Slip"}</button>
        </div>
        <div style={{padding:"8px 14px",display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSel(null)} style={btn(sel===null?T.maroon:"#e8d5b0",sel===null?"white":T.text,true)}>All</button>
          {rows.map(s=><button key={s.emp.id} onClick={()=>setSel(s.emp.id)} style={btn(sel===s.emp.id?T.maroonL:"#e8d5b0",sel===s.emp.id?"white":T.text,true)}>{s.emp.name}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>
        {disp.map(s=>(
          <div key={s.emp.id} style={{...card,marginBottom:0,border:`2px solid ${T.border}`}}>
            <div style={{background:T.maroon,color:"white",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:14}}>{s.emp.name}</div>
                <div style={{fontSize:10,opacity:0.6,marginTop:1,fontFamily:"sans-serif"}}>{dept?.name} · {MONTHS[month]} {year}</div>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{background:T.saffron,color:T.maroonD,borderRadius:5,padding:"3px 9px",fontWeight:800,fontSize:12}}>{s.daysWorked}d</div>
                <button onClick={()=>printSlip(s)} style={{...btn("rgba(255,255,255,0.15)","white",true),padding:"3px 8px"}}>🖨️</button>
              </div>
            </div>
            <div style={{padding:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginBottom:10}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:T.success,marginBottom:5,fontFamily:"sans-serif"}}>EARNINGS</div>
                  {[{l:`Basic (${s.daysWorked}d)`,v:s.baseSal},{l:"OT Pay",v:s.otPay}].map(x=>(
                    <div key={x.l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3,paddingBottom:3,borderBottom:`1px solid ${T.border}`}}>
                      <span style={{color:T.muted}}>{x.l}</span><span style={{fontWeight:600}}>₹{fi(x.v)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800,paddingTop:3}}>
                    <span>Gross</span><span style={{color:T.success}}>₹{fi(s.gross)}</span>
                  </div>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:T.danger,marginBottom:5,fontFamily:"sans-serif"}}>DEDUCTIONS</div>
                  {[{l:"Advance",v:s.advAmt,c:T.danger},{l:"Loan Ded.",v:s.lnDed,c:T.danger},{l:"PF",v:s.pfAmt,c:T.blue},{l:"ESI",v:s.esiAmt,c:T.green}].map(x=>(
                    <div key={x.l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3,paddingBottom:3,borderBottom:`1px solid ${T.border}`}}>
                      <span style={{color:T.muted}}>{x.l}</span><span style={{fontWeight:600,color:x.v>0?x.c:T.muted}}>−₹{fi(x.v)}</span>
                    </div>
                  ))}
                  {s.lnBal>0&&<div style={{fontSize:10,color:T.muted,marginTop:2}}>Loan c/f: ₹{fi(s.lnBal)}</div>}
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:T.saffronPale,border:`1px solid ${T.border}`,borderRadius:7,padding:"10px 14px"}}>
                <span style={{fontWeight:700,fontSize:13,color:T.maroon}}>NET SALARY</span>
                <span style={{fontWeight:900,fontSize:20,color:s.net<0?T.danger:T.maroon}}>₹{fi(s.net)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════ BANK UPLOAD ════════
function BankTab({settle,depts,activeDept,month,year,dbAcc,setDbAcc}){
  const dept=depts.find(d=>d.id===activeDept);
  const rows=settle.filter(s=>s.emp.deptId===activeDept&&s.net>0&&s.emp.acc);
  const total=rows.reduce((s,r)=>s+r.net,0);
  const narr=`Salary ${MONTHS[month].substr(0,3)}${String(year).substr(2)}`;
  const copyCSV=()=>{
    const hdr="PYMT_PROD_TYPE_CODE,PYMT_MODE,DEBIT_ACC_NO,BNF_NAME,BENE_ACC_NO,BENE_IFSC,AMOUNT,DEBIT_NARR,CREDIT_NARR\n";
    const body=rows.map(s=>`PAB_VENDOR,NEFT,${dbAcc},${s.emp.bankName||s.emp.name},${s.emp.acc},${s.emp.ifsc},${Math.round(s.net)},${narr},${narr}`).join("\n");
    navigator.clipboard.writeText(hdr+body).then(()=>alert("✅ CSV copied to clipboard!"));
  };
  return(
    <div>
      <div style={{...card,marginBottom:12}}>
        <div style={sec}><span>🏦 Bank Upload — {dept?.name} — {MONTHS[month]} {year}</span></div>
        <div style={{padding:14,display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>DEBIT ACCOUNT</label><input value={dbAcc} onChange={e=>setDbAcc(e.target.value)} style={{...inp(200),fontFamily:"monospace"}} placeholder="Institution account number"/></div>
          <button onClick={copyCSV} style={{...btn(T.saffron,T.maroonD),fontSize:13}}>📋 Copy CSV</button>
          <div style={{marginLeft:"auto",background:T.saffronPale,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:T.muted,fontWeight:700,fontFamily:"sans-serif"}}>TOTAL TO TRANSFER</div>
            <div style={{fontSize:22,fontWeight:900,color:T.maroon}}>₹{fi(total)}</div>
            <div style={{fontSize:11,color:T.muted,fontFamily:"sans-serif"}}>{rows.length} employees with bank details</div>
          </div>
        </div>
      </div>
      <div style={card}>
        <div style={sec}>Payment Details</div>
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",width:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left"}}>Employee</th>
              <th style={{...thS,textAlign:"left"}}>Bank Name</th>
              <th style={{...thS,textAlign:"left"}}>Account No.</th>
              <th style={{...thS,textAlign:"left"}}>IFSC</th>
              <th style={thS}>Net Pay (₹)</th>
            </tr></thead>
            <tbody>{settle.filter(s=>s.emp.deptId===activeDept).map((s,i)=>(
              <tr key={s.emp.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
                <td style={tdL}><b>{s.emp.name}</b></td>
                <td style={tdL}>{s.emp.bankName||"—"}</td>
                <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{s.emp.acc||<span style={{color:T.muted,fontStyle:"italic"}}>Not set</span>}</td>
                <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{s.emp.ifsc||"—"}</td>
                <td style={{...tdS,fontWeight:700,color:s.net>0?T.maroon:T.muted}}>₹{fi(s.net)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ════════ EMPLOYEES ════════
function EmpsTab({emps,setEmps,depts,activeDept,nid,setNid}){
  const dept=depts.find(d=>d.id===activeDept);
  const de=emps.filter(e=>e.deptId===activeDept);
  const [ed,setEd]=useState(null);
  const save=()=>{
    if(!ed.name.trim()||!ed.rate)return;
    if(ed.id===0){setEmps(p=>[...p,{...ed,id:nid,deptId:activeDept}]);setNid(n=>n+1);}
    else setEmps(p=>p.map(e=>e.id===ed.id?{...ed}:e));
    setEd(null);
  };
  return(
    <div style={card}>
      <div style={sec}><span>👥 Employees — {dept?.name}</span><button onClick={()=>setEd({id:0,deptId:activeDept,name:"",rate:"",bankName:"",acc:"",ifsc:""})} style={btn(T.saffron,T.maroonD,true)}>+ Add Employee</button></div>
      {ed&&<div style={{padding:16,background:T.saffronPale,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,color:T.maroon,marginBottom:12,fontSize:13}}>{ed.id===0?"New Employee":"Edit Employee"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          {[{l:"Full Name*",k:"name",t:"text",ph:"Employee name"},{l:"Monthly Rate (₹)*",k:"rate",t:"number",ph:"e.g. 15000"},
            {l:"Bank Name",k:"bankName",t:"text",ph:"Name on account"},{l:"Account No.",k:"acc",t:"text",ph:"Account number"},{l:"IFSC Code",k:"ifsc",t:"text",ph:"e.g. SBIN0001234"}
          ].map(f=><div key={f.k}><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3,fontFamily:"sans-serif"}}>{f.l}</label><input type={f.t} value={ed[f.k]} onChange={e=>setEd(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp()}/></div>)}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={save} style={btn(T.maroon)}>💾 Save</button>
          <button onClick={()=>setEd(null)} style={btn("#e8d5b0",T.text)}>Cancel</button>
        </div>
      </div>}
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr>
          <th style={{...thS,textAlign:"left"}}>Name</th><th style={thS}>Monthly Rate</th><th style={thS}>Daily Rate</th>
          <th style={{...thS,textAlign:"left"}}>Account No.</th><th style={{...thS,textAlign:"left"}}>IFSC</th><th style={thS}>Actions</th>
        </tr></thead>
        <tbody>
          {de.map((e,i)=>(
            <tr key={e.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
              <td style={tdL}><b>{e.name}</b></td><td style={tdS}>₹{fi(e.rate)}</td><td style={tdS}>₹{fi(e.rate/26)}</td>
              <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{e.acc||<span style={{color:T.muted,fontStyle:"italic"}}>—</span>}</td>
              <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{e.ifsc||"—"}</td>
              <td style={{...tdS,padding:"4px 8px"}}>
                <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                  <button onClick={()=>setEd({...e})} style={btn(T.maroonL,"white",true)}>✏️ Edit</button>
                  <button onClick={()=>{if(window.confirm("Remove employee?"))setEmps(p=>p.filter(x=>x.id!==e.id));}} style={btn(T.danger,"white",true)}>🗑️</button>
                </div>
              </td>
            </tr>
          ))}
          {de.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:T.muted}}>No employees yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ════════ DEPARTMENTS ════════
function DeptsTab({depts,setDepts,emps,ndid,setNdid,setDeptId}){
  const COLS=["#6b1a1a","#8b4513","#2d6b1a","#1a2d6b","#4a1a6b","#6b4a1a","#1a6b5a","#6b1a4a"];
  const [ed,setEd]=useState(null);
  const save=()=>{
    if(!ed.name.trim())return;
    if(!ed.id){const id=`d${ndid}`;setDepts(p=>[...p,{...ed,id}]);setNdid(n=>n+1);setDeptId(id);}
    else setDepts(p=>p.map(d=>d.id===ed.id?{...ed}:d));
    setEd(null);
  };
  return(
    <div style={card}>
      <div style={sec}><span>🏛️ Departments</span><button onClick={()=>setEd({id:"",name:"",color:COLS[0]})} style={btn(T.saffron,T.maroonD,true)}>+ Add Department</button></div>
      {ed&&<div style={{padding:16,background:T.saffronPale,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,color:T.maroon,marginBottom:12,fontSize:13}}>{ed.id?"Edit":"New"} Department</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:180}}>
            <label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3,fontFamily:"sans-serif"}}>DEPARTMENT NAME*</label>
            <input value={ed.name} onChange={e=>setEd(p=>({...p,name:e.target.value}))} placeholder="e.g. Administration" style={inp()}/>
          </div>
          <div>
            <label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:6,fontFamily:"sans-serif"}}>COLOUR</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {COLS.map(c=><div key={c} onClick={()=>setEd(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:6,background:c,cursor:"pointer",border:`3px solid ${ed.color===c?"white":"transparent"}`,boxShadow:ed.color===c?`0 0 0 2px ${c}`:""}}/>)}
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={save} style={btn(T.maroon)}>💾 Save</button>
          <button onClick={()=>setEd(null)} style={btn("#e8d5b0",T.text)}>Cancel</button>
        </div>
      </div>}
      <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {depts.map(d=>{
          const cnt=emps.filter(e=>e.deptId===d.id).length;
          return <div key={d.id} style={{background:T.saffronPale,border:`2px solid ${T.border}`,borderLeft:`5px solid ${d.color}`,borderRadius:8,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:15,color:T.maroon}}>{d.name}</div><div style={{fontSize:11,color:T.muted,marginTop:3,fontFamily:"sans-serif"}}>{cnt} employee{cnt!==1?"s":""}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setEd({...d})} style={btn(T.maroonL,"white",true)}>✏️</button>
              <button onClick={()=>{if(emps.some(e=>e.deptId===d.id)){alert("Remove employees first.");return;}if(window.confirm("Delete?"))setDepts(p=>p.filter(x=>x.id!==d.id));}} style={btn(T.danger,"white",true)}>🗑️</button>
            </div>
          </div>;
        })}
        {depts.length===0&&<div style={{padding:24,textAlign:"center",color:T.muted,gridColumn:"1/-1"}}>No departments yet.</div>}
      </div>
    </div>
  );
}
