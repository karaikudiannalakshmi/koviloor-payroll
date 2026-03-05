import { useState, useMemo, useEffect, useRef, Component } from "react";

// ── Firebase REST API — no npm needed ────────────────────────────
const FB_URL = "https://koviloor-payroll-default-rtdb.asia-southeast1.firebasedatabase.app";
const fbSet = (val) => fetch(`${FB_URL}/koviloor.json`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(val)}).catch(e=>console.error("FB write:",e));
const fbGet = () => fetch(`${FB_URL}/koviloor.json`).then(r=>r.json()).catch(()=>null);

// ── Auth ──────────────────────────────────────────────────────────
const PWD = { admin:"Andavar@07", operator:"Soma83" };
const getSess = ()=>{ try{return localStorage.getItem("kv_sess")||null;}catch{return null;} };
const setSess = r=>{ try{r?localStorage.setItem("kv_sess",r):localStorage.removeItem("kv_sess");}catch{} };

// ── Helpers ───────────────────────────────────────────────────────
const MONTHS=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dim=(y,m)=>new Date(y,m,0).getDate();
const dow=(y,m,d)=>new Date(y,m-1,d).getDay();
const DOW=["Su","Mo","Tu","We","Th","Fr","Sa"];
const r2=n=>Math.round(n*100)/100;
const fi=n=>Math.abs(Math.round(n*100)/100).toLocaleString("en-IN",{minimumFractionDigits:0,maximumFractionDigits:2});
const fv=v=>parseFloat(v||0)||0;

// ── Styles ────────────────────────────────────────────────────────
const T={maroon:"#6b1a1a",maroonD:"#4a0e0e",maroonL:"#8b2a2a",saffron:"#d4780a",saffronL:"#f0a030",saffronPale:"#fdf3e3",goldL:"#e8c06a",cream:"#fef9f0",border:"#e8d5b0",muted:"#8a7060",text:"#2d1a0e",bg:"#f5efe3",success:"#1a6b3a",danger:"#8b1a1a",white:"#ffffff",blue:"#1a3d6b",blueL:"#dde8ff",green:"#1a5a3a",greenL:"#ddf5e8"};
const thS={background:T.maroon,color:"white",padding:"7px 10px",fontSize:11,fontWeight:700,textAlign:"center",whiteSpace:"nowrap"};
const tdS={padding:"6px 10px",fontSize:13,borderBottom:`1px solid ${T.border}`,textAlign:"right",color:T.text};
const tdL={padding:"6px 10px",fontSize:13,borderBottom:`1px solid ${T.border}`,textAlign:"left",color:T.text};
const inp=(w)=>({padding:"6px 10px",border:`1px solid ${T.border}`,borderRadius:6,fontSize:13,outline:"none",color:T.text,background:T.white,width:w||"100%",boxSizing:"border-box",fontFamily:"inherit"});
const card={background:T.white,borderRadius:12,boxShadow:"0 2px 12px rgba(107,26,26,0.08)",marginBottom:16,overflow:"hidden"};
const sec={padding:"12px 18px",background:T.maroon,color:"white",fontSize:14,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"space-between"};
const btn=(bg,fg="#fff",sm)=>({padding:sm?"5px 10px":"7px 15px",borderRadius:6,border:"none",cursor:"pointer",fontSize:sm?11:12,fontWeight:700,background:bg,color:fg,fontFamily:"inherit"});

// ── Default Data ──────────────────────────────────────────────────
const D0={
  year:new Date().getFullYear(), month:new Date().getMonth()+1,
  depts:[{id:"d1",name:"Office",color:"#6b1a1a"},{id:"d2",name:"Kitchen",color:"#8b4513"},{id:"d3",name:"Garden",color:"#2d6b1a"}],
  emps:[
    {id:1,deptId:"d1",name:"Rajendran",rate:18000,bankName:"Rajendran",acc:"",ifsc:""},
    {id:2,deptId:"d1",name:"Meenakshi",rate:15000,bankName:"Meenakshi",acc:"",ifsc:""},
    {id:3,deptId:"d2",name:"Murugan",rate:16000,bankName:"Murugan",acc:"",ifsc:""},
    {id:4,deptId:"d2",name:"Selvi",rate:14000,bankName:"Selvi",acc:"",ifsc:""},
    {id:5,deptId:"d3",name:"Krishnan",rate:13000,bankName:"Krishnan",acc:"",ifsc:""},
  ],
  att:{},ot:{},adv:{},loan:{},pf:{},esi:{},dbAcc:"",nid:6,ndid:4,
};

// ── Error Boundary ────────────────────────────────────────────────
class EB extends Component {
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e?.message||"Error"};}
  render(){
    if(this.state.err)return(
      <div style={{padding:32,fontFamily:"Georgia,serif",background:"#fdf3e3",minHeight:"100vh",color:"#6b1a1a"}}>
        <div style={{fontSize:40}}>🛕</div>
        <div style={{fontWeight:700,fontSize:18,margin:"8px 0"}}>Koviloor Madalayam</div>
        <div style={{background:"#fde8e8",border:"2px solid #8b1a1a",borderRadius:8,padding:16,fontSize:13,marginBottom:16}}><b>Error:</b> {this.state.err}</div>
        <button onClick={()=>{localStorage.clear();window.location.reload();}} style={{padding:"10px 20px",background:"#6b1a1a",color:"white",border:"none",borderRadius:6,fontSize:14,cursor:"pointer",fontWeight:700}}>🔄 Reload</button>
      </div>
    );
    return this.props.children;
  }
}

// ══════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════
export default function App(){return <EB><Main/></EB>;}

function Main(){
  const [role,setRole]=useState(getSess);
  const [tab,setTab]=useState("att");
  const [deptId,setDeptId]=useState(null);
  const [d,setD]=useState(D0);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState("");
  const importRef=useRef();

  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  const lastWrite=useRef(0);

  // ── LOAD on start ─────────────────────────────────────────────
  useEffect(()=>{
    fbGet().then(val=>{
      if(val && typeof val==="object") setD({...D0,...val});
      setLoading(false);
    });
  },[]);

  // ── POLL every 2 seconds — sync from other devices ────────────
  useEffect(()=>{
    const t=setInterval(()=>{
      if(Date.now()-lastWrite.current < 3000) return; // skip if we just wrote
      fbGet().then(val=>{
        if(val && typeof val==="object") setD({...D0,...val});
      });
    },2000);
    return ()=>clearInterval(t);
  },[]);

  // ── WRITE to Firebase ─────────────────────────────────────────
  const write=(patch)=>{
    setD(prev=>{
      const next={...prev,...patch};
      lastWrite.current=Date.now();
      fbSet(next);
      return next;
    });
  };

  const {year,month,depts,emps,att,ot,adv,loan,pf,esi,dbAcc,nid,ndid}=d;
  const activeDept=deptId||(depts[0]?.id||null);
  const nd=dim(year,month);
  const days=Array.from({length:nd},(_,i)=>i+1);
  const ga=(eid,day)=>{const v=att[`${eid}_${day}`];return v===undefined?null:v;};
  const sa=(eid,day,v)=>write({att:{...att,[`${eid}_${day}`]:v}});
  const got=(eid,day)=>ot[`${eid}_${day}`]??"";
  const sot=(eid,day,v)=>write({ot:{...ot,[`${eid}_${day}`]:v}});

  const settle=useMemo(()=>emps.map(emp=>{
    const dr=emp.rate/26;let dw2=0;
    days.forEach(day=>{const v=ga(emp.id,day);if(v!==null&&v!==undefined)dw2+=fv(v);});
    const otH=days.reduce((s,day)=>{const h=fv(got(emp.id,day));return s+(isNaN(h)?0:h);},0);
    const baseSal=r2(dr*dw2),otPay=r2(otH*(dr/8)),gross=r2(baseSal+otPay);
    const advAmt=r2(fv(adv[emp.id]));
    const ln=loan[emp.id]||{};
    const lnOB=r2(fv(ln.ob)),lnGiven=r2(fv(ln.given)),lnDed=r2(fv(ln.ded));
    const lnBal=r2(lnOB+lnGiven-lnDed);
    const pfAmt=r2(fv(pf[emp.id])),esiAmt=r2(fv(esi[emp.id]));
    const totalDed=r2(advAmt+lnDed+pfAmt+esiAmt);
    return {emp,daysWorked:r2(dw2),otHours:r2(otH),baseSal,otPay,gross,advAmt,lnOB,lnGiven,lnDed,lnBal,pfAmt,esiAmt,totalDed,net:r2(gross-totalDed)};
  }),[emps,att,ot,adv,loan,pf,esi,nd,year,month]);

  const exportData=()=>{
    const b=new Blob([JSON.stringify(d,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(b);
    a.download=`Koviloor_${MONTHS[month]}_${year}.json`;a.click();
    showToast("✅ Exported");
  };
  const importData=e=>{
    const f=e.target.files[0];if(!f)return;
    const r=new FileReader();
    r.onload=ev=>{try{const imp=JSON.parse(ev.target.result);write(imp);showToast("✅ Imported");}catch{showToast("❌ Invalid file");}};
    r.readAsText(f);e.target.value="";
  };

  const ALL_TABS=[{id:"att",icon:"📅",label:"Attendance"},{id:"salary",icon:"💰",label:"Salary"},{id:"ded",icon:"📋",label:"Deductions"},{id:"payslip",icon:"🧾",label:"Payslips"},{id:"bank",icon:"🏦",label:"Bank Upload"},{id:"emps",icon:"👥",label:"Employees"},{id:"depts",icon:"🏛️",label:"Departments"}];
  const TABS=role==="admin"?ALL_TABS:ALL_TABS.filter(t=>t.id==="att");
  const safeTab=TABS.find(t=>t.id===tab)?tab:"att";

  return(
    <div style={{fontFamily:"Georgia,serif",background:T.bg,minHeight:"100vh",fontSize:14}}>
      {loading&&<div style={{position:"fixed",inset:0,background:"rgba(74,14,14,0.75)",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
        <div style={{fontSize:48}}>🛕</div>
        <div style={{color:"white",fontSize:16,fontWeight:700}}>Koviloor Madalayam</div>
        <div style={{color:"rgba(255,255,255,0.7)",fontSize:12,fontFamily:"sans-serif"}}>Loading from cloud…</div>
      </div>}
      {toast&&<div style={{position:"fixed",top:16,left:"50%",transform:"translateX(-50%)",background:toast.startsWith("✅")?T.success:T.danger,color:"white",padding:"10px 24px",borderRadius:8,fontWeight:700,fontSize:13,zIndex:9998,pointerEvents:"none"}}>{toast}</div>}
      <input ref={importRef} type="file" accept=".json" onChange={importData} style={{display:"none"}}/>

      {/* Header */}
      <div style={{background:`linear-gradient(135deg,${T.maroonD},${T.maroon},${T.maroonL})`,color:"white",padding:"12px 20px",boxShadow:"0 4px 16px rgba(107,26,26,0.4)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{fontSize:32}}>🛕</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:700}}>Koviloor Madalayam</div>
            <div style={{fontSize:10,opacity:0.65,letterSpacing:"0.1em",marginTop:2,fontFamily:"sans-serif"}}>STAFF SALARY MANAGEMENT</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            {role==="admin"&&<>
              <select value={month} onChange={e=>write({month:+e.target.value})} style={{padding:"5px 10px",borderRadius:5,border:"none",background:"rgba(255,255,255,0.12)",color:"white",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {MONTHS.slice(1).map((m,i)=><option key={i} value={i+1} style={{background:T.maroon}}>{m}</option>)}
              </select>
              <input type="number" value={year} onChange={e=>write({year:+e.target.value})} style={{width:68,padding:"5px 8px",borderRadius:5,border:"none",background:"rgba(255,255,255,0.12)",color:"white",fontSize:13,textAlign:"center"}}/>
              <div style={{width:1,height:22,background:"rgba(255,255,255,0.2)"}}/>
              <button onClick={exportData} style={{...btn("rgba(212,120,10,0.4)",T.saffronL,true),border:"1px solid rgba(212,120,10,0.5)"}}>⬇ Export</button>
              <button onClick={()=>importRef.current.click()} style={{...btn("rgba(255,255,255,0.1)","rgba(255,255,255,0.8)",true),border:"1px solid rgba(255,255,255,0.2)"}}>⬆ Import</button>
              <div style={{width:1,height:22,background:"rgba(255,255,255,0.2)"}}/>
            </>}
            <div style={{padding:"4px 10px",borderRadius:6,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",fontSize:11,fontWeight:700,color:role==="admin"?T.saffronL:"#a5d8ff",fontFamily:"sans-serif"}}>
              {role==="admin"?"🔐 ADMIN":"👤 OPERATOR"}
            </div>
            <button onClick={()=>{setSess(null);setRole(null);}} style={btn(T.danger,"white",true)}>⏏ Logout</button>
          </div>
        </div>
        <div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontFamily:"sans-serif"}}>DEPT:</span>
          {depts.map(dept=>(
            <button key={dept.id} onClick={()=>setDeptId(dept.id)} style={{padding:"4px 14px",borderRadius:20,border:`2px solid ${activeDept===dept.id?"rgba(255,255,255,0.8)":"rgba(255,255,255,0.2)"}`,background:activeDept===dept.id?"rgba(255,255,255,0.2)":"transparent",color:"white",cursor:"pointer",fontSize:12,fontWeight:activeDept===dept.id?700:400,fontFamily:"sans-serif"}}>
              {dept.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{background:T.maroonL,display:"flex",overflowX:"auto",borderBottom:`3px solid ${T.saffron}`}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 16px",border:"none",cursor:"pointer",whiteSpace:"nowrap",fontSize:13,background:safeTab===t.id?T.cream:"transparent",color:safeTab===t.id?T.maroon:"rgba(255,255,255,0.8)",fontWeight:safeTab===t.id?700:400,borderBottom:safeTab===t.id?`3px solid ${T.saffron}`:"3px solid transparent",display:"flex",alignItems:"center",gap:5,fontFamily:"sans-serif",marginBottom:-3}}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:16,maxWidth:1600,margin:"0 auto"}}>
        {safeTab==="att"    &&<AttTab {...{emps,depts,activeDept,days,year,month,ga,sa,got,sot,role,att,write}}/>}
        {safeTab==="salary" &&role==="admin"&&<SalaryTab {...{settle,depts,activeDept,month,year}}/>}
        {safeTab==="ded"    &&role==="admin"&&<DedTab {...{emps,depts,activeDept,adv,loan,pf,esi,month,year,showToast,write,d}}/>}
        {safeTab==="payslip"&&role==="admin"&&<PayslipTab {...{settle,depts,activeDept,month,year}}/>}
        {safeTab==="bank"   &&role==="admin"&&<BankTab {...{settle,depts,activeDept,month,year,dbAcc,write}}/>}
        {safeTab==="emps"   &&role==="admin"&&<EmpsTab {...{emps,depts,activeDept,nid,write,d}}/>}
        {safeTab==="depts"  &&role==="admin"&&<DeptsTab {...{depts,emps,ndid,write,d,setDeptId}}/>}
      </div>
      {!role&&<LoginModal onLogin={r=>{setSess(r);setRole(r);}}/>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────
function LoginModal({onLogin}){
  const [user,setUser]=useState("");const [pass,setPass]=useState("");
  const [err,setErr]=useState("");const [showP,setShowP]=useState(false);const [which,setWhich]=useState(null);
  const go=()=>{
    if(!user.trim()||!pass.trim()){setErr("Enter username and password.");return;}
    if(user==="admin"&&pass===PWD.admin){onLogin("admin");return;}
    if(user==="operator"&&pass===PWD.operator){onLogin("operator");return;}
    setErr("Incorrect username or password.");
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:`linear-gradient(160deg,${T.maroonD},${T.maroon},${T.saffron})`,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:56,marginBottom:8}}>🛕</div>
          <div style={{fontSize:22,fontWeight:700,color:"white"}}>Koviloor Madalayam</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginTop:4,fontFamily:"sans-serif"}}>STAFF SALARY MANAGEMENT</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[{r:"admin",icon:"🔐",l:"Admin",d:"Full access"},{r:"operator",icon:"👤",l:"Operator",d:"Attendance only"}].map(x=>(
            <div key={x.r} onClick={()=>{setWhich(x.r);setUser(x.r);setPass("");setErr("");}} style={{background:which===x.r?"rgba(212,120,10,0.25)":"rgba(255,255,255,0.06)",border:`2px solid ${which===x.r?"rgba(240,160,48,0.8)":"rgba(255,255,255,0.15)"}`,borderRadius:10,padding:"14px 10px",cursor:"pointer",textAlign:"center"}}>
              <div style={{fontSize:24,marginBottom:4}}>{x.icon}</div>
              <div style={{fontWeight:700,color:which===x.r?T.saffronL:"white",fontSize:13,fontFamily:"sans-serif"}}>{x.l}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.45)",marginTop:2,fontFamily:"sans-serif"}}>{x.d}</div>
            </div>
          ))}
        </div>
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:14,padding:24,border:"1px solid rgba(255,255,255,0.15)"}}>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,fontFamily:"sans-serif"}}>USERNAME</label>
            <input value={user} onChange={e=>{setUser(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="admin or operator" style={{...inp(),background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"9px 12px",fontSize:14}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,fontFamily:"sans-serif"}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Password" style={{...inp(),background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"9px 38px 9px 12px",fontSize:14}}/>
              <button type="button" onClick={()=>setShowP(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"rgba(255,255,255,0.5)",padding:0}}>{showP?"🙈":"👁"}</button>
            </div>
          </div>
          {err&&<div style={{background:"rgba(139,26,26,0.35)",borderRadius:6,padding:"8px 12px",color:"#ffaaaa",fontSize:12,fontWeight:600,marginBottom:14,textAlign:"center"}}>{err}</div>}
          <button type="button" onClick={go} style={{width:"100%",padding:12,borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(90deg,${T.saffron},${T.saffronL})`,color:T.maroonD,fontWeight:800,fontSize:15,fontFamily:"Georgia,serif"}}>Sign In →</button>
        </div>
      </div>
    </div>
  );
}

// ── ATTENDANCE ────────────────────────────────────────────────────
function AttTab({emps,depts,activeDept,days,year,month,ga,sa,got,sot,role,att,write}){
  const [mode,setMode]=useState("att");
  const de=emps.filter(e=>e.deptId===activeDept);
  const dept=depts.find(d=>d.id===activeDept);
  const markAll=eid=>{const u={...att};days.forEach(d=>{if(dow(year,month,d)!==0)u[`${eid}_${d}`]=1;});write({att:u});};
  const clrAll=eid=>{const u={...att};days.forEach(d=>{u[`${eid}_${d}`]=0;});write({att:u});};
  return(
    <div style={card}>
      <div style={sec}>
        <span>📅 {mode==="att"?"Attendance":"OT / Partial"} — {dept?.name} — {MONTHS[month]} {year}</span>
        <div style={{display:"flex",gap:6}}>
          <button type="button" onClick={()=>setMode("att")} style={btn(mode==="att"?T.saffron:T.maroonL,mode==="att"?T.maroonD:"white",true)}>📅 Attendance</button>
          <button type="button" onClick={()=>setMode("ot")} style={btn(mode==="ot"?T.saffron:T.maroonL,mode==="ot"?T.maroonD:"white",true)}>⏱ OT / Partial</button>
        </div>
      </div>
      <div style={{padding:"8px 14px",background:T.saffronPale,borderBottom:`1px solid ${T.border}`,fontSize:11,color:T.muted,fontFamily:"sans-serif"}}>
        {mode==="att"?"💡 Click = ✓ Present · again = ½ Half Day · again = ✗ Absent · again = Clear. Sundays shaded.":"💡 Enter OT hours. Paid at Daily Rate ÷ 8 per hour."}
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
                      <button type="button" onClick={()=>markAll(emp.id)} style={{...btn(T.success,"white",true),padding:"2px 6px",fontSize:10}}>All</button>
                      <button type="button" onClick={()=>clrAll(emp.id)} style={{...btn("#e8d5b0",T.text,true),padding:"2px 6px",fontSize:10}}>Clr</button>
                    </div>}
                  </div>
                </td>
                <td style={{...tdS,background:rb,fontWeight:700,color:T.maroon}}>{mode==="att"?dW.toFixed(1):tH.toFixed(1)}</td>
                {days.map(d=>{
                  const dw=dow(year,month,d);
                  if(mode==="att"){
                    const v=ga(emp.id,d);const isSun=dw===0;
                    const cyc=()=>{if(v===null||v===undefined)sa(emp.id,d,1);else if(v===1)sa(emp.id,d,0.5);else if(v===0.5)sa(emp.id,d,0);else sa(emp.id,d,null);};
                    return <td key={d} onClick={!isSun?cyc:undefined} style={{textAlign:"center",padding:"4px 1px",background:isSun?"#f0e8f8":v===1?"#d4f0e4":v===0.5?"#fef3cd":v===0?"#fde8e8":rb,cursor:!isSun?"pointer":"default",borderLeft:`1px solid ${T.border}`,fontWeight:700,fontSize:11,userSelect:"none",minWidth:28}}>
                      {isSun?"·":v===1?"✓":v===0.5?"½":v===0?"✗":""}
                    </td>;
                  }else{
                    const val=got(emp.id,d);const num=fv(val);
                    return <td key={d} style={{padding:"2px 1px",background:dw===0?"#f0e8f8":rb,borderLeft:`1px solid ${T.border}`}}>
                      {dw!==0&&<input type="number" step="0.5" value={val} onChange={e=>sot(emp.id,d,e.target.value)} placeholder="0" style={{...inp(44),textAlign:"center",fontSize:11,padding:"3px 2px",background:num>0?"#edf7f2":"white"}}/>}
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

// ── SALARY ────────────────────────────────────────────────────────
function SalaryTab({settle,depts,activeDept,month,year}){
  const dept=depts.find(d=>d.id===activeDept);
  const rows=settle.filter(s=>s.emp.deptId===activeDept);
  return(
    <div style={card}>
      <div style={sec}><span>💰 Salary Statement — {dept?.name} — {MONTHS[month]} {year}</span></div>
      <div style={{overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left"}}>Employee</th><th style={thS}>Rate</th><th style={thS}>Days</th>
            <th style={thS}>Basic</th><th style={thS}>OT</th><th style={{...thS,background:T.success}}>Gross</th>
            <th style={thS}>Advance</th><th style={thS}>Loan</th>
            <th style={{...thS,background:T.blue}}>PF</th><th style={{...thS,background:T.green}}>ESI</th>
            <th style={{...thS,background:T.saffron,color:T.maroonD}}>Net Pay</th>
          </tr></thead>
          <tbody>{rows.map((s,i)=>(
            <tr key={s.emp.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
              <td style={tdL}><b>{s.emp.name}</b></td><td style={tdS}>₹{fi(s.emp.rate)}</td>
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
            <td style={{...tdS,color:"#90eeda",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.esiAmt,0))}</td>
            <td style={{...tdS,color:T.goldL,fontWeight:900,fontSize:15}}>₹{fi(rows.reduce((s,r)=>s+r.net,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── DEDUCTIONS ────────────────────────────────────────────────────
function DedTab({emps,depts,activeDept,adv,loan,pf,esi,month,year,showToast,write,d}){
  const [showCF,setShowCF]=useState(false);
  const de=emps.filter(e=>e.deptId===activeDept);
  const dept=depts.find(x=>x.id===activeDept);
  const lnBal=e=>{const ln=loan[e.id]||{};return r2(fv(ln.ob)+fv(ln.given)-fv(ln.ded));};
  const carryForward=()=>{
    const nl={};emps.forEach(e=>{const b=lnBal(e);nl[e.id]={ob:b>0?b:0,given:"",ded:""};});
    write({loan:nl,adv:{}});setShowCF(false);showToast("✅ Carried forward");
  };
  const NI=(val,onChange,w=95)=>(
    <input type="number" value={val??""} onChange={onChange} placeholder="0" style={{...inp(w),textAlign:"right",padding:"5px 7px"}}/>
  );
  return(
    <div>
      {showCF&&<div style={{position:"fixed",inset:0,background:"rgba(74,14,14,0.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:T.white,borderRadius:12,padding:28,width:440,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{textAlign:"center",fontSize:36,marginBottom:10}}>🔄</div>
          <div style={{fontWeight:800,fontSize:15,color:T.maroon,textAlign:"center",marginBottom:12}}>New Month Carry Forward</div>
          <div style={{fontSize:13,color:T.muted,background:T.saffronPale,padding:14,borderRadius:8,lineHeight:2,marginBottom:20}}>
            ✅ Loan Balance → new Opening Balance<br/>
            ✅ Loan Given & Deduction reset to zero<br/>
            ✅ Advance cleared<br/>
            ✅ PF & ESI kept<br/>
            <span style={{color:T.danger,fontWeight:600}}>⚠ Export data first</span>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setShowCF(false)} style={btn("#e8d5b0",T.text)}>Cancel</button>
            <button onClick={carryForward} style={btn(T.maroon)}>✅ Carry Forward</button>
          </div>
        </div>
      </div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,color:T.muted}}>Deductions — <b style={{color:T.maroon}}>{dept?.name}</b> — {MONTHS[month]} {year}</div>
        <button onClick={()=>setShowCF(true)} style={{...btn(T.saffron,T.maroonD),fontSize:13}}>🔄 New Month Setup</button>
      </div>

      {/* Loan Ledger */}
      <div style={card}>
        <div style={{...sec,background:"#3d2200"}}>
          <span>🏦 Loan Ledger</span>
          <span style={{fontSize:11,opacity:0.7,fontWeight:400}}>Balance = OP Bal + Given − Deduction</span>
        </div>
        <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left",background:"#3d2200",minWidth:130}}>Employee</th>
            <th style={{...thS,background:"#5a3400",minWidth:110}}>OP Balance</th>
            <th style={{...thS,background:"#1a5a00",minWidth:110}}>Given Now</th>
            <th style={{...thS,background:"#6b1a1a",minWidth:110}}>Deduction</th>
            <th style={{...thS,background:"#1a3d6b",minWidth:120}}>Balance</th>
          </tr></thead>
          <tbody>{de.map((e,i)=>{
            const ln=loan[e.id]||{};const bal=lnBal(e);const rb=i%2===0?T.white:"#fdf8f0";
            return <tr key={e.id}>
              <td style={{...tdL,background:rb}}><b>{e.name}</b></td>
              <td style={{...tdS,padding:"5px 8px",background:rb}}>{NI(ln.ob,ev=>write({loan:{...loan,[e.id]:{...(loan[e.id]||{}),ob:ev.target.value}}}))}</td>
              <td style={{...tdS,padding:"5px 8px",background:i%2===0?"#f0fae8":"#e8f5d8"}}>{NI(ln.given,ev=>write({loan:{...loan,[e.id]:{...(loan[e.id]||{}),given:ev.target.value}}}))}</td>
              <td style={{...tdS,padding:"5px 8px",background:i%2===0?"#fef5f5":"#fdeae8"}}>{NI(ln.ded,ev=>write({loan:{...loan,[e.id]:{...(loan[e.id]||{}),ded:ev.target.value}}}))}</td>
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
        </table></div>
      </div>

      {/* Advance, PF, ESI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {[
          {title:"💳 Advance",sub:"Deducted this month, cleared next",bg:"#6b4a00",key:"adv",state:adv,rowBg:["white","#fdf8f0"],tc:T.saffronL},
          {title:"🏛 PF Deduction",sub:"Provident Fund (recurring)",bg:T.blue,key:"pf",state:pf,rowBg:["white",T.blueL],tc:"#aac4ff"},
          {title:"🏥 ESI Deduction",sub:"Employee State Insurance (recurring)",bg:T.green,key:"esi",state:esi,rowBg:["white",T.greenL],tc:"#90eeda"},
        ].map(({title,sub,bg,key,state,rowBg,tc})=>(
          <div key={key} style={card}>
            <div style={{...sec,background:bg}}><span>{title}</span><span style={{fontSize:10,fontWeight:400,opacity:0.8}}>{sub}</span></div>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr><th style={{...thS,textAlign:"left",background:bg}}>Employee</th><th style={{...thS,background:bg}}>Amount (₹)</th></tr></thead>
              <tbody>{de.map((e,i)=>(
                <tr key={e.id} style={{background:rowBg[i%2]}}>
                  <td style={tdL}><b>{e.name}</b></td>
                  <td style={{...tdS,padding:"5px 8px"}}>
                    <input type="number" value={state[e.id]??""} onChange={ev=>write({[key]:{...state,[e.id]:ev.target.value}})} placeholder="0" style={{...inp(120),textAlign:"right",padding:"5px 7px"}}/>
                  </td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{background:bg,color:"white"}}>
                <td style={{...tdL,color:"white",fontWeight:700}}>Total</td>
                <td style={{...tdS,color:tc,fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+fv(state[e.id]),0))}</td>
              </tr></tfoot>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── PAYSLIPS ──────────────────────────────────────────────────────
function PayslipTab({settle,depts,activeDept,month,year}){
  const [sel,setSel]=useState(null);
  const dept=depts.find(d=>d.id===activeDept);
  const rows=settle.filter(s=>s.emp.deptId===activeDept);
  const disp=sel===null?rows:rows.filter(s=>s.emp.id===sel);
  const printSlip=s=>{
    const w=window.open("","_blank","width=600,height=760");
    w.document.write(`<!DOCTYPE html><html><head><title>Payslip</title><style>body{font-family:Georgia,serif;margin:0;padding:20px;background:#fef9f0;color:#2d1a0e;font-size:13px;}.hdr{background:#6b1a1a;color:white;padding:14px 18px;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;}.hdr h2{margin:0;font-size:15px;}.sub{font-size:10px;opacity:.65;margin-top:3px;}.badge{background:#d4780a;color:#4a0e0e;padding:4px 12px;border-radius:5px;font-weight:800;font-size:12px;}.body{border:2px solid #e8d5b0;border-top:none;border-radius:0 0 8px 8px;padding:16px;background:white;}.sec{font-size:10px;font-weight:700;color:#8a7060;letter-spacing:.08em;text-transform:uppercase;margin:12px 0 6px;}.row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f5efe3;font-size:12px;}.lbl{color:#8a7060;}.val{font-weight:600;}.tot{display:flex;justify-content:space-between;font-weight:800;font-size:14px;padding:8px 0;border-top:2px solid #e8d5b0;margin-top:4px;}.net{background:#fdf3e3;border:2px solid #d4780a;border-radius:8px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;margin-top:14px;}.netlbl{font-weight:700;font-size:15px;}.netval{font-weight:900;font-size:26px;color:#6b1a1a;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:0 20px;}.footer{margin-top:12px;font-size:10px;color:#8a7060;text-align:center;border-top:1px dashed #e8d5b0;padding-top:8px;}@media print{button{display:none!important;}}</style></head><body>
    <div class="hdr"><div><h2>🛕 Koviloor Madalayam</h2><div class="sub">${dept?.name} · ${s.emp.name} · ${MONTHS[month]} ${year}</div></div><div class="badge">${s.daysWorked} Days</div></div>
    <div class="body">
      <div class="sec">Earnings</div>
      <div class="grid"><div><div class="row"><span class="lbl">Basic (${s.daysWorked}d)</span><span class="val">₹${fi(s.baseSal)}</span></div></div><div><div class="row"><span class="lbl">OT Pay</span><span class="val">${s.otPay>0?"₹"+fi(s.otPay):"Nil"}</span></div></div></div>
      <div class="tot"><span>Gross</span><span style="color:#1a6b3a">₹${fi(s.gross)}</span></div>
      <div class="sec">Deductions</div>
      <div class="grid"><div><div class="row"><span class="lbl">Advance</span><span class="val">−₹${fi(s.advAmt)}</span></div><div class="row"><span class="lbl">Loan Deduction</span><span class="val">−₹${fi(s.lnDed)}</span></div>${s.lnBal>0?`<div class="row"><span class="lbl" style="font-size:11px">Loan Balance c/f</span><span class="val" style="font-size:11px">₹${fi(s.lnBal)}</span></div>`:""}</div><div><div class="row"><span class="lbl">PF</span><span class="val">−₹${fi(s.pfAmt)}</span></div><div class="row"><span class="lbl">ESI</span><span class="val">−₹${fi(s.esiAmt)}</span></div></div></div>
      <div class="tot"><span>Total Deductions</span><span style="color:#8b1a1a">−₹${fi(s.totalDed)}</span></div>
      <div class="net"><span class="netlbl">NET SALARY</span><span class="netval">₹${fi(s.net)}</span></div>
      <div class="footer">Koviloor Madalayam · ${dept?.name} · ${MONTHS[month]} ${year}</div>
    </div><br/><button onclick="window.print()" style="padding:10px 24px;background:#6b1a1a;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:700;">🖨️ Print / Save PDF</button>
    </body></html>`);w.document.close();
  };
  return(
    <div>
      <div style={{...card,marginBottom:12}}>
        <div style={sec}><span>🧾 Payslips — {dept?.name} — {MONTHS[month]} {year}</span><button onClick={()=>disp.forEach(s=>printSlip(s))} style={btn(T.saffron,T.maroonD,true)}>🖨️ Print All</button></div>
        <div style={{padding:"8px 14px",display:"flex",gap:6,flexWrap:"wrap"}}>
          <button onClick={()=>setSel(null)} style={btn(sel===null?T.maroon:"#e8d5b0",sel===null?"white":T.text,true)}>All</button>
          {rows.map(s=><button key={s.emp.id} onClick={()=>setSel(s.emp.id)} style={btn(sel===s.emp.id?T.maroonL:"#e8d5b0",sel===s.emp.id?"white":T.text,true)}>{s.emp.name}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(310px,1fr))",gap:14}}>
        {disp.map(s=>(
          <div key={s.emp.id} style={{...card,marginBottom:0,border:`2px solid ${T.border}`}}>
            <div style={{background:T.maroon,color:"white",padding:"10px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontWeight:700,fontSize:14}}>{s.emp.name}</div><div style={{fontSize:10,opacity:0.6,marginTop:1}}>{dept?.name} · {MONTHS[month]} {year}</div></div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <div style={{background:T.saffron,color:T.maroonD,borderRadius:5,padding:"3px 9px",fontWeight:800,fontSize:12}}>{s.daysWorked}d</div>
                <button onClick={()=>printSlip(s)} style={{...btn("rgba(255,255,255,0.15)","white",true),padding:"3px 8px"}}>🖨️</button>
              </div>
            </div>
            <div style={{padding:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 12px",marginBottom:10}}>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:T.success,marginBottom:5}}>EARNINGS</div>
                  {[{l:`Basic (${s.daysWorked}d)`,v:s.baseSal},{l:"OT Pay",v:s.otPay}].map(x=>(
                    <div key={x.l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3,paddingBottom:3,borderBottom:`1px solid ${T.border}`}}>
                      <span style={{color:T.muted}}>{x.l}</span><span style={{fontWeight:600}}>₹{fi(x.v)}</span>
                    </div>
                  ))}
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:800,paddingTop:3}}><span>Gross</span><span style={{color:T.success}}>₹{fi(s.gross)}</span></div>
                </div>
                <div>
                  <div style={{fontSize:10,fontWeight:700,color:T.danger,marginBottom:5}}>DEDUCTIONS</div>
                  {[{l:"Advance",v:s.advAmt,c:T.danger},{l:"Loan",v:s.lnDed,c:T.danger},{l:"PF",v:s.pfAmt,c:T.blue},{l:"ESI",v:s.esiAmt,c:T.green}].map(x=>(
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

// ── BANK UPLOAD ───────────────────────────────────────────────────
function BankTab({settle,depts,activeDept,month,year,dbAcc,write}){
  const dept=depts.find(d=>d.id===activeDept);
  const rows=settle.filter(s=>s.emp.deptId===activeDept&&s.net>0&&s.emp.acc);
  const total=rows.reduce((s,r)=>s+r.net,0);
  const narr=`Salary ${MONTHS[month].substr(0,3)}${String(year).substr(2)}`;
  const copyCSV=()=>{
    const hdr="PYMT_PROD_TYPE_CODE,PYMT_MODE,DEBIT_ACC_NO,BNF_NAME,BENE_ACC_NO,BENE_IFSC,AMOUNT,DEBIT_NARR,CREDIT_NARR\n";
    const body=rows.map(s=>`PAB_VENDOR,NEFT,${dbAcc},${s.emp.bankName||s.emp.name},${s.emp.acc},${s.emp.ifsc},${Math.round(s.net)},${narr},${narr}`).join("\n");
    navigator.clipboard.writeText(hdr+body).then(()=>alert("✅ CSV copied!"));
  };
  return(
    <div>
      <div style={{...card,marginBottom:12}}>
        <div style={sec}><span>🏦 Bank Upload — {dept?.name} — {MONTHS[month]} {year}</span></div>
        <div style={{padding:14,display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>DEBIT ACCOUNT</label><input value={dbAcc} onChange={e=>write({dbAcc:e.target.value})} style={{...inp(200),fontFamily:"monospace"}} placeholder="Institution account number"/></div>
          <button onClick={copyCSV} style={{...btn(T.saffron,T.maroonD),fontSize:13}}>📋 Copy CSV</button>
          <div style={{marginLeft:"auto",background:T.saffronPale,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:T.muted,fontWeight:700}}>TOTAL TO TRANSFER</div>
            <div style={{fontSize:22,fontWeight:900,color:T.maroon}}>₹{fi(total)}</div>
            <div style={{fontSize:11,color:T.muted}}>{rows.length} employees</div>
          </div>
        </div>
      </div>
      <div style={card}>
        <div style={sec}>Payment Details</div>
        <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left"}}>Employee</th><th style={{...thS,textAlign:"left"}}>Bank</th>
            <th style={{...thS,textAlign:"left"}}>Account No.</th><th style={{...thS,textAlign:"left"}}>IFSC</th><th style={thS}>Net Pay</th>
          </tr></thead>
          <tbody>{settle.filter(s=>s.emp.deptId===activeDept).map((s,i)=>(
            <tr key={s.emp.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
              <td style={tdL}><b>{s.emp.name}</b></td><td style={tdL}>{s.emp.bankName||"—"}</td>
              <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{s.emp.acc||<span style={{color:T.muted,fontStyle:"italic"}}>Not set</span>}</td>
              <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{s.emp.ifsc||"—"}</td>
              <td style={{...tdS,fontWeight:700,color:s.net>0?T.maroon:T.muted}}>₹{fi(s.net)}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </div>
    </div>
  );
}

// ── EMPLOYEES ─────────────────────────────────────────────────────
function EmpsTab({emps,depts,activeDept,nid,write,d}){
  const dept=depts.find(x=>x.id===activeDept);
  const de=emps.filter(e=>e.deptId===activeDept);
  const [ed,setEd]=useState(null);
  const saveEmp=()=>{
    if(!ed.name.trim()||!ed.rate)return;
    let newEmps,newNid=nid;
    if(ed.id===0){newEmps=[...emps,{...ed,id:nid,deptId:activeDept}];newNid=nid+1;}
    else newEmps=emps.map(e=>e.id===ed.id?{...ed}:e);
    write({emps:newEmps,nid:newNid});setEd(null);
  };
  return(
    <div style={card}>
      <div style={sec}><span>👥 Employees — {dept?.name}</span><button onClick={()=>setEd({id:0,deptId:activeDept,name:"",rate:"",bankName:"",acc:"",ifsc:""})} style={btn(T.saffron,T.maroonD,true)}>+ Add</button></div>
      {ed&&<div style={{padding:16,background:T.saffronPale,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,color:T.maroon,marginBottom:12,fontSize:13}}>{ed.id===0?"New Employee":"Edit Employee"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          {[{l:"Full Name*",k:"name",t:"text",ph:"Employee name"},{l:"Monthly Rate (₹)*",k:"rate",t:"number",ph:"e.g. 15000"},{l:"Bank Name",k:"bankName",t:"text",ph:"Name on account"},{l:"Account No.",k:"acc",t:"text",ph:"Account number"},{l:"IFSC Code",k:"ifsc",t:"text",ph:"e.g. SBIN0001234"}].map(f=>(
            <div key={f.k}><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>{f.l}</label><input type={f.t} value={ed[f.k]} onChange={e=>setEd(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp()}/></div>
          ))}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={saveEmp} style={btn(T.maroon)}>💾 Save</button>
          <button onClick={()=>setEd(null)} style={btn("#e8d5b0",T.text)}>Cancel</button>
        </div>
      </div>}
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr><th style={{...thS,textAlign:"left"}}>Name</th><th style={thS}>Rate/Month</th><th style={thS}>Daily Rate</th><th style={{...thS,textAlign:"left"}}>Account</th><th style={{...thS,textAlign:"left"}}>IFSC</th><th style={thS}>Actions</th></tr></thead>
        <tbody>{de.map((e,i)=>(
          <tr key={e.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
            <td style={tdL}><b>{e.name}</b></td><td style={tdS}>₹{fi(e.rate)}</td><td style={tdS}>₹{fi(e.rate/26)}</td>
            <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{e.acc||"—"}</td>
            <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{e.ifsc||"—"}</td>
            <td style={{...tdS,padding:"4px 8px"}}>
              <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                <button onClick={()=>setEd({...e})} style={btn(T.maroonL,"white",true)}>✏️</button>
                <button onClick={()=>{if(window.confirm("Remove?"))write({emps:emps.filter(x=>x.id!==e.id)});}} style={btn(T.danger,"white",true)}>🗑️</button>
              </div>
            </td>
          </tr>
        ))}{de.length===0&&<tr><td colSpan={6} style={{padding:24,textAlign:"center",color:T.muted}}>No employees yet.</td></tr>}</tbody>
      </table>
    </div>
  );
}

// ── DEPARTMENTS ───────────────────────────────────────────────────
function DeptsTab({depts,emps,ndid,write,d,setDeptId}){
  const COLS=["#6b1a1a","#8b4513","#2d6b1a","#1a2d6b","#4a1a6b","#6b4a1a","#1a6b5a","#6b1a4a"];
  const [ed,setEd]=useState(null);
  const saveDept=()=>{
    if(!ed.name.trim())return;
    let newDepts,newNdid=ndid;
    if(!ed.id){const id=`d${ndid}`;newDepts=[...depts,{...ed,id}];newNdid=ndid+1;setDeptId(id);}
    else newDepts=depts.map(x=>x.id===ed.id?{...ed}:x);
    write({depts:newDepts,ndid:newNdid});setEd(null);
  };
  return(
    <div style={card}>
      <div style={sec}><span>🏛️ Departments</span><button onClick={()=>setEd({id:"",name:"",color:COLS[0]})} style={btn(T.saffron,T.maroonD,true)}>+ Add</button></div>
      {ed&&<div style={{padding:16,background:T.saffronPale,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,color:T.maroon,marginBottom:12,fontSize:13}}>{ed.id?"Edit":"New"} Department</div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"flex-end"}}>
          <div style={{flex:1,minWidth:180}}><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>NAME*</label><input value={ed.name} onChange={e=>setEd(p=>({...p,name:e.target.value}))} placeholder="Department name" style={inp()}/></div>
          <div><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:6}}>COLOUR</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{COLS.map(c=><div key={c} onClick={()=>setEd(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:6,background:c,cursor:"pointer",border:`3px solid ${ed.color===c?"white":"transparent"}`}}/>)}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={saveDept} style={btn(T.maroon)}>💾 Save</button>
          <button onClick={()=>setEd(null)} style={btn("#e8d5b0",T.text)}>Cancel</button>
        </div>
      </div>}
      <div style={{padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
        {depts.map(dept=>{
          const cnt=emps.filter(e=>e.deptId===dept.id).length;
          return <div key={dept.id} style={{background:T.saffronPale,border:`2px solid ${T.border}`,borderLeft:`5px solid ${dept.color}`,borderRadius:8,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontWeight:700,fontSize:15,color:T.maroon}}>{dept.name}</div><div style={{fontSize:11,color:T.muted,marginTop:3}}>{cnt} employee{cnt!==1?"s":""}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setEd({...dept})} style={btn(T.maroonL,"white",true)}>✏️</button>
              <button onClick={()=>{if(emps.some(e=>e.deptId===dept.id)){alert("Remove employees first.");return;}if(window.confirm("Delete?"))write({depts:depts.filter(x=>x.id!==dept.id)});}} style={btn(T.danger,"white",true)}>🗑️</button>
            </div>
          </div>;
        })}
      </div>
    </div>
  );
}
