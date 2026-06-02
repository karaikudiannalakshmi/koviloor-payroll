import { useState, useMemo, useEffect, useRef, Component } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getDatabase, ref, get, set } from "firebase/database";

// ── Firebase config ───────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        "koviloor-madalayam-payroll.firebaseapp.com",
  databaseURL:       "https://koviloor-madalayam-payroll-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "koviloor-madalayam-payroll",
  storageBucket:     "koviloor-madalayam-payroll.firebasestorage.app",
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};
const firebaseApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(firebaseApp);
const fbDb   = getDatabase(firebaseApp);

// ── Firebase SDK read/write (replaces REST API) ───────────────────
const fbGet = async () => {
  try {
    const snap = await get(ref(fbDb, "/"));
    return snap.exists() ? snap.val() : null;
  } catch(e) { console.error("FB read:", e); return null; }
};
const fbSet = async (val) => {
  try {
    await set(ref(fbDb, "/"), val);
  } catch(e) { console.error("FB write:", e); }
};

// ── Auth ──────────────────────────────────────────────────────────
// Role assigned by email — add emails here to grant access
const ROLE_MAP = {
  "koviloormadalayam@gmail.com": "operator",
  "slnaiyar@gmail.com":          "admin",
};
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
  depts:[], emps:[], att:{},ot:{},adv:{},loan:{},pf:{},esi:{},dbAcc:"",nid:1,ndid:1,
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
  const [role,setRole]=useState(null);
  const [authReady,setAuthReady]=useState(false);
  const [tab,setTab]=useState("att");
  const [deptId,setDeptId]=useState(null);
  const [d,setD]=useState(D0);
  const [loading,setLoading]=useState(true);
  const [toast,setToast]=useState("");
  const importRef=useRef();

  const showToast=m=>{setToast(m);setTimeout(()=>setToast(""),3000);};

  // Month-end export reminder
  const isMonthEnd = ()=>{ const today=new Date(); return today.getFullYear()===year && today.getMonth()+1===month && today.getDate()>=28; };

  const lastWrite=useRef(0);

  // ── Firebase Email Auth ───────────────────────────────────────
  useEffect(()=>{
    return onAuthStateChanged(fbAuth, (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email?.toLowerCase() || "";
        const assignedRole = ROLE_MAP[email] || "operator";
        setSess(assignedRole);
        setRole(assignedRole);
      } else {
        setSess(null);
        setRole(null);
      }
      setAuthReady(true);
    });
  },[]);

  const handleLogin = async (email, password) => {
    await signInWithEmailAndPassword(fbAuth, email.trim().toLowerCase(), password);
  };
  const handleLogout = async () => {
    try { await signOut(fbAuth); } catch(e) { console.error("SignOut:",e); }
    setSess(null); setRole(null);
  };

  // ── LOAD on start — only after auth is ready ──────────────────
  useEffect(()=>{
    if(!authReady || !role) return; // wait for Firebase auth
    fbGet().then(val=>{
      if(val && typeof val==="object"){
        const migrated = {...val};
        // Use the year/month stored IN Firebase (not current date)
        const y = val.year || 2026;
        const m = val.month || 3;
        const mk = `${y}_${m}`;
        let needsSave = false;
        // Snapshot current emps into month key if not yet saved
        if(val.emps && !val[`emps_${mk}`]) { migrated[`emps_${mk}`]=val.emps; needsSave=true; }
        if(val.att  && Object.keys(val.att).length>0  && !val[`att_${mk}`]) { migrated[`att_${mk}`]=val.att;   delete migrated.att;  needsSave=true; }
        if(val.ot   && Object.keys(val.ot).length>0   && !val[`ot_${mk}`])  { migrated[`ot_${mk}`]=val.ot;    delete migrated.ot;   needsSave=true; }
        if(val.adv  && Object.keys(val.adv).length>0  && !val[`adv_${mk}`]) { migrated[`adv_${mk}`]=val.adv;  delete migrated.adv;  needsSave=true; }
        if(val.loan && Object.keys(val.loan).length>0 && !val[`loan_${mk}`]){ migrated[`loan_${mk}`]=val.loan; delete migrated.loan; needsSave=true; }
        if(val.pf   && Object.keys(val.pf).length>0   && !val[`pf_${mk}`])  { migrated[`pf_${mk}`]=val.pf;   delete migrated.pf;   needsSave=true; }
        if(val.esi  && Object.keys(val.esi).length>0  && !val[`esi_${mk}`]) { migrated[`esi_${mk}`]=val.esi;  delete migrated.esi;  needsSave=true; }
        setD({...D0,...migrated});
        if(needsSave) fbSet(migrated);
      }
      setLoading(false);
    });
  },[authReady, role]);

  // ── POLL every 2 seconds — only when authenticated ────────────
  useEffect(()=>{
    if(!authReady || !role) return;
    const t=setInterval(()=>{
      if(Date.now()-lastWrite.current < 3000) return; // skip if we just wrote
      fbGet().then(val=>{
        if(val && typeof val==="object") setD({...D0,...val});
      });
    },2000);
    return ()=>clearInterval(t);
  },[authReady, role]);

  // ── WRITE to Firebase ─────────────────────────────────────────
  const write=(patch)=>{
    setD(prev=>{
      const next={...prev,...patch};
      lastWrite.current=Date.now();
      fbSet(next);
      return next;
    });
  };

  const {year,month,depts,emps,dbAcc,nid,ndid}=d;
  const activeDept=deptId||(depts[0]?.id||null);
  const nd=dim(year,month);
  const days=Array.from({length:nd},(_,i)=>i+1);
  const mkey=`${year}_${month}`;

  // ── Snapshot current emps into month key so historical data is preserved ──
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{
    if(emps && emps.length>0 && !d[`emps_${mkey}`]){
      write({[`emps_${mkey}`]:emps});
    }
  },[mkey]); // intentionally only on mkey change

  // Historical employees for this month (survives later deletions/resignations)
  const monthEmps = d[`emps_${mkey}`] || emps;

  const mattObj=d[`att_${mkey}`]||{};
  const motObj=d[`ot_${mkey}`]||{};
  const adv=d[`adv_${mkey}`]||{};
  const loan=d[`loan_${mkey}`]||{};
  const pf=d[`pf_${mkey}`]||{};
  const esi=d[`esi_${mkey}`]||{};
  const ga=(eid,day)=>{const v=mattObj[`${eid}_${day}`];return v===undefined?null:v;};
  const sa=(eid,day,v)=>write({[`att_${mkey}`]:{...mattObj,[`${eid}_${day}`]:v}});
  const got=(eid,day)=>motObj[`${eid}_${day}`]??"";
  const sot=(eid,day,v)=>write({[`ot_${mkey}`]:{...motObj,[`${eid}_${day}`]:v}});

  const settle=useMemo(()=>monthEmps.map(emp=>{
    const isFixed=!!emp.fixed;
    const isDaily=!!emp.daily;                          // daily wage: rate = per-day amount
    const dr=isDaily?emp.rate:emp.rate/24;              // daily rate
    let dw2=0;
    days.forEach(day=>{const v=ga(emp.id,day);if(v!==null&&v!==undefined)dw2+=fv(v);});
    const otH=days.reduce((s,day)=>{const h=fv(got(emp.id,day));return s+(isNaN(h)?0:h);},0);
    const baseSal=isFixed?r2(emp.rate):r2(dr*dw2);
    const otPay=isFixed?0:r2(otH*(dr/8));
    const gross=r2(baseSal+otPay);
    const advEntries=Array.isArray(adv[emp.id])?adv[emp.id]:[];
    const advAmt=r2(advEntries.reduce((s,x)=>s+Math.max(0,fv(x.amount)-fv(x.recovered)),0));
    const ln=loan[emp.id]||{};
    const lnOB=r2(fv(ln.ob)),lnGiven=r2(fv(ln.given));
    const lnEmi=r2(fv(ln.emi));
    const lnTotal=r2(lnOB+lnGiven);
    const lnDed=r2(Math.min(lnEmi,lnTotal));   // auto: EMI capped at outstanding balance
    const lnBal=r2(lnTotal-lnDed);
    const pfAmt  = emp.pfEsi ? r2(r2(baseSal * 0.70) * 0.12)   : r2(fv(pf[emp.id]));
    const esiAmt = emp.pfEsi ? r2(r2(baseSal * 0.70) * 0.0075) : r2(fv(esi[emp.id]));
    const rentAmt=r2(fv(emp.rent));
    const totalDed=r2(advAmt+lnDed+pfAmt+esiAmt+rentAmt);
    return {emp,daysWorked:r2(dw2),otHours:r2(otH),baseSal,otPay,gross,advAmt,lnOB,lnGiven,lnEmi,lnDed,lnBal,pfAmt,esiAmt,rentAmt,totalDed,net:r2(gross-totalDed)};
  }),[monthEmps,d,adv,loan,pf,esi,nd,year,month]);

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
      {isMonthEnd()&&<div style={{background:"#7b3f00",color:"white",padding:"8px 20px",textAlign:"center",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
        ⚠️ Month ending soon! Please export your data before changing to next month.
        <button onClick={exportData} style={{background:"#fbd38d",color:"#7b3f00",border:"none",borderRadius:5,padding:"3px 12px",fontWeight:800,cursor:"pointer",fontSize:12}}>⬇ Export Now</button>
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
            <button onClick={handleLogout} style={btn(T.danger,"white",true)}>⏏ Logout</button>
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
        {safeTab==="att"    &&<AttTab {...{emps:monthEmps,depts,activeDept,days,year,month,ga,sa,got,sot,role,att:mattObj,write,isOperator:role==="operator"}}/>}
        {safeTab==="salary" &&role==="admin"&&<SalaryTab {...{settle,depts,activeDept,month,year}}/>}
        {safeTab==="ded"    &&role==="admin"&&<DedTab {...{emps:monthEmps,depts,activeDept,adv,loan,pf,esi,month,year,showToast,write,d}}/>}
        {safeTab==="payslip"&&role==="admin"&&<PayslipTab {...{settle,depts,activeDept,month,year}}/>}
        {safeTab==="bank"   &&role==="admin"&&<BankTab {...{settle,depts,activeDept,month,year,dbAcc,write}}/>}
        {safeTab==="emps"   &&role==="admin"&&<EmpsTab {...{emps,depts,activeDept,nid,write,d}}/>}
        {safeTab==="depts"  &&role==="admin"&&<DeptsTab {...{depts,emps,ndid,write,d,setDeptId}}/>}
      </div>
      {!authReady && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:T.maroonD,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
          <div style={{width:36,height:36,border:"3px solid rgba(255,255,255,0.2)",borderTop:`3px solid ${T.saffron}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {authReady && !role && <LoginModal onLogin={handleLogin}/>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────────────
function LoginModal({onLogin}){
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [err,setErr]=useState("");
  const [showP,setShowP]=useState(false);
  const [loading,setLoading]=useState(false);

  const go=async()=>{
    if(!email.trim()||!pass.trim()){setErr("Enter email and password.");return;}
    setLoading(true); setErr("");
    try {
      await onLogin(email, pass);
    } catch(e) {
      if(e.code==="auth/invalid-credential"||e.code==="auth/wrong-password"||e.code==="auth/user-not-found"){
        setErr("Invalid email or password.");
      } else if(e.code==="auth/too-many-requests"){
        setErr("Too many attempts. Please wait.");
      } else {
        setErr("Sign-in failed. Check your connection.");
      }
      setLoading(false);
    }
  };

  return(
    <div style={{position:"fixed",inset:0,zIndex:9999,background:`linear-gradient(160deg,${T.maroonD},${T.maroon},${T.saffron})`,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:400}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:56,marginBottom:8}}>🛕</div>
          <div style={{fontSize:22,fontWeight:700,color:"white"}}>Koviloor Madalayam</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,0.55)",letterSpacing:"0.12em",marginTop:4,fontFamily:"sans-serif"}}>STAFF SALARY MANAGEMENT</div>
        </div>
        <div style={{background:"rgba(255,255,255,0.08)",borderRadius:14,padding:24,border:"1px solid rgba(255,255,255,0.15)"}}>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,fontFamily:"sans-serif"}}>EMAIL</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="you@example.com" disabled={loading} autoComplete="email"
              style={{...inp(),background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"9px 12px",fontSize:14}}/>
          </div>
          <div style={{marginBottom:20}}>
            <label style={{display:"block",fontSize:10,color:"rgba(255,255,255,0.55)",fontWeight:700,letterSpacing:"0.08em",marginBottom:5,fontFamily:"sans-serif"}}>PASSWORD</label>
            <div style={{position:"relative"}}>
              <input type={showP?"text":"password"} value={pass} onChange={e=>{setPass(e.target.value);setErr("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="Password" disabled={loading}
                style={{...inp(),background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",color:"white",padding:"9px 38px 9px 12px",fontSize:14}}/>
              <button type="button" onClick={()=>setShowP(p=>!p)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:15,color:"rgba(255,255,255,0.5)",padding:0}}>{showP?"🙈":"👁"}</button>
            </div>
          </div>
          {err&&<div style={{background:"rgba(139,26,26,0.35)",borderRadius:6,padding:"8px 12px",color:"#ffaaaa",fontSize:12,fontWeight:600,marginBottom:14,textAlign:"center"}}>{err}</div>}
          <button type="button" onClick={go} disabled={loading}
            style={{width:"100%",padding:12,borderRadius:8,border:"none",cursor:"pointer",background:`linear-gradient(90deg,${T.saffron},${T.saffronL})`,color:T.maroonD,fontWeight:800,fontSize:15,fontFamily:"Georgia,serif",opacity:loading?0.7:1}}>
            {loading?"Signing in…":"Sign In →"}
          </button>
          <p style={{textAlign:"center",fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:14,marginBottom:0,fontFamily:"sans-serif"}}>Contact administrator to reset password</p>
        </div>
      </div>
    </div>
  );
}

// ── ATTENDANCE ────────────────────────────────────────────────────
function AttTab({emps,depts,activeDept,days,year,month,ga,sa,got,sot,role,att,write,isOperator}){
  const [mode,setMode]=useState("att");
  // Operators only see attendance-based and daily wage employees (not fixed salary)
  const de=emps.filter(e=>e.deptId===activeDept && (isOperator ? !e.fixed : true));
  const dept=depts.find(d=>d.id===activeDept);
  const markAll=eid=>{const u={...mattObj};days.forEach(d=>{u[`${eid}_${d}`]=1;});write({[`att_${mkey}`]:u});};
  const clrAll=eid=>{const u={...mattObj};days.forEach(d=>{u[`${eid}_${d}`]=0;});write({[`att_${mkey}`]:u});};
  return(
    <div style={card}>
      <div style={sec}>
        <span>📅 {mode==="att"?"Attendance":"OT / Partial"} — {dept?.name} — {MONTHS[month]} {year}</span>
        <div style={{display:"flex",gap:6}}>
          <button type="button" onClick={()=>setMode("att")} style={btn(mode==="att"?T.saffron:T.maroonL,mode==="att"?T.maroonD:"white",true)}>📅 Attendance</button>
          {!isOperator&&<button type="button" onClick={()=>setMode("ot")} style={btn(mode==="ot"?T.saffron:T.maroonL,mode==="ot"?T.maroonD:"white",true)}>⏱ OT / Partial</button>}
        </div>
      </div>
      <div style={{padding:"8px 14px",background:T.saffronPale,borderBottom:`1px solid ${T.border}`,fontSize:11,color:T.muted,fontFamily:"sans-serif"}}>
        {mode==="att"?"💡 Click = ✓ Present · again = ½ Half Day · again = ✗ Absent · again = Clear.":"💡 Enter OT hours. Paid at Daily Rate ÷ 8 per hour."}
      </div>
      {de.length===0?<div style={{padding:32,textAlign:"center",color:T.muted}}>No employees in this department.</div>:(
        <div style={{overflowX:"auto"}}>
          <table style={{borderCollapse:"collapse",minWidth:"100%"}}>
            <thead><tr>
              <th style={{...thS,textAlign:"left",minWidth:160,position:"sticky",left:0,zIndex:2}}>Employee</th>
              <th style={{...thS,minWidth:50}}>{mode==="att"?"Days":"Hrs"}</th>
              {days.map(d=>{const dw=dow(year,month,d);return <th key={d} style={{...thS,background:T.maroon,minWidth:mode==="att"?28:46,padding:"3px 1px"}}><div style={{fontSize:8,opacity:0.7}}>{DOW[dw]}</div><div style={{fontSize:11}}>{d}</div></th>;})}
            </tr></thead>
            <tbody>{de.map((emp,ei)=>{
              const dW=days.reduce((s,d)=>{const v=ga(emp.id,d);return s+(v!==null&&v!==undefined?fv(v):0);},0);
              const tH=days.reduce((s,d)=>{const h=fv(got(emp.id,d));return s+(isNaN(h)?0:h);},0);
              const rb=ei%2===0?T.white:"#fdf5e8";
              return <tr key={emp.id}>
                <td style={{...tdL,background:rb,position:"sticky",left:0,zIndex:1,fontWeight:600}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                    <span>{emp.name}{emp.fixed&&<span style={{marginLeft:5,background:"#fef3c7",color:"#92400e",padding:"1px 6px",borderRadius:8,fontSize:9,fontWeight:700}}>FIXED</span>}{emp.daily&&<span style={{marginLeft:5,background:"#dcfce7",color:"#14532d",padding:"1px 6px",borderRadius:8,fontSize:9,fontWeight:700}}>DAILY</span>}</span>
                    {mode==="att"&&role==="admin"&&<div style={{display:"flex",gap:3}}>
                      <button type="button" onClick={()=>markAll(emp.id)} style={{...btn(T.success,"white",true),padding:"2px 6px",fontSize:10}}>All</button>
                      <button type="button" onClick={()=>clrAll(emp.id)} style={{...btn("#e8d5b0",T.text,true),padding:"2px 6px",fontSize:10}}>Clr</button>
                    </div>}
                  </div>
                </td>
                <td style={{...tdS,background:rb,fontWeight:700,color:T.maroon}}>{emp.fixed?"Fixed":mode==="att"?dW.toFixed(1):tH.toFixed(1)}</td>
                {days.map(d=>{
                  const dw=dow(year,month,d);
                  if(mode==="att"){
                    const v=ga(emp.id,d);
                    const cyc=()=>{if(v===null||v===undefined)sa(emp.id,d,1);else if(v===1)sa(emp.id,d,0.5);else if(v===0.5)sa(emp.id,d,0);else sa(emp.id,d,null);};
                    return <td key={d} onClick={cyc} style={{textAlign:"center",padding:"4px 1px",background:v===1?"#d4f0e4":v===0.5?"#fef3cd":v===0?"#fde8e8":rb,cursor:"pointer",borderLeft:`1px solid ${T.border}`,fontWeight:700,fontSize:11,userSelect:"none",minWidth:28}}>
                      {v===1?"✓":v===0.5?"½":v===0?"✗":""}
                    </td>;
                  }else{
                    const val=got(emp.id,d);const num=fv(val);
                    return <td key={d} style={{padding:"2px 1px",background:rb,borderLeft:`1px solid ${T.border}`}}>
                      {<input type="number" step="0.5" value={val} onChange={e=>sot(emp.id,d,e.target.value)} placeholder="0" style={{...inp(44),textAlign:"center",fontSize:11,padding:"3px 2px",background:num>0?"#edf7f2":"white"}}/>}
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
            <th style={{...thS,background:"#5a2d00"}}>Rent</th>
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
              <td style={{...tdS,color:s.rentAmt>0?"#7a3d00":T.muted}}>₹{fi(s.rentAmt)}</td>
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
            <td style={{...tdS,color:"#ffcc88",fontWeight:800}}>₹{fi(rows.reduce((s,r)=>s+r.rentAmt,0))}</td>
            <td style={{...tdS,color:T.goldL,fontWeight:900,fontSize:15}}>₹{fi(rows.reduce((s,r)=>s+r.net,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── DEDUCTIONS ────────────────────────────────────────────────────
function DedTab({emps,depts,activeDept,adv,loan,pf,esi,month,year,showToast,write,d}){
  const mkey=`${year}_${month}`;
  const [showCF,setShowCF]=useState(false);
  const [advEmpId,setAdvEmpId]=useState(null); // which employee's advance ledger is open
  const [advForm,setAdvForm]=useState({date:"",amount:""});
  const de=emps.filter(e=>e.deptId===activeDept);
  const dept=depts.find(x=>x.id===activeDept);
  const lnBal=e=>{
    const ln=loan[e.id]||{};
    const total=r2(fv(ln.ob)+fv(ln.given));
    return r2(total-Math.min(fv(ln.emi),total));
  };
  const carryForward=()=>{
    // Calculate next month/year
    const nm=month===12?1:month+1;
    const ny=month===12?year+1:year;
    const nmkey=`${ny}_${nm}`;

    // Loan: next month OB = current balance, EMI carries forward, given & ded reset
    const nlNext={};
    emps.forEach(e=>{
      const bal=lnBal(e);
      const ln=loan[e.id]||{};
      const emi=r2(fv(ln.emi));
      nlNext[e.id]={ob:bal>0?bal:0,given:"",emi:emi||""};
    });

    // Advance: carry forward unrecovered balance to next month
    const advNext={};
    emps.forEach(e=>{
      const entries=Array.isArray(adv[e.id])?adv[e.id]:[];
      const total=entries.reduce((s,x)=>s+fv(x.amount),0);
      const recovered=entries.reduce((s,x)=>s+fv(x.recovered),0);
      const bal=r2(total-recovered);
      if(bal>0) advNext[e.id]=[{date:`${ny}-${String(nm).padStart(2,"0")}-01`,amount:bal,recovered:0,note:"B/F"}];
    });

    // PF/ESI carry forward to next month
    const pfNext={};const esiNext={};
    emps.forEach(e=>{
      if(pf[e.id]) pfNext[e.id]=pf[e.id];
      if(esi[e.id]) esiNext[e.id]=esi[e.id];
    });

    write({
      [`loan_${nmkey}`]:nlNext,
      [`adv_${nmkey}`]:advNext,
      [`pf_${nmkey}`]:pfNext,
      [`esi_${nmkey}`]:esiNext,
    });
    setShowCF(false);
    showToast(`✅ Carried forward to ${MONTHS[nm]} ${ny}`);
  };

  // Advance helpers
  const getAdvEntries=eid=>Array.isArray(adv[eid])?adv[eid]:[];
  const advTotal=eid=>getAdvEntries(eid).reduce((s,x)=>s+fv(x.amount),0);
  const advRecovered=eid=>getAdvEntries(eid).reduce((s,x)=>s+fv(x.recovered),0);
  const advBalance=eid=>r2(advTotal(eid)-advRecovered(eid));
  const addAdvEntry=eid=>{
    if(!advForm.amount||!advForm.date){showToast("⚠️ Enter date and amount");return;}
    const entries=[...getAdvEntries(eid),{date:advForm.date,amount:+advForm.amount,recovered:0,note:advForm.note||""}];
    write({[`adv_${mkey}`]:{...adv,[eid]:entries}});
    setAdvForm({date:"",amount:"",note:""});showToast("✅ Advance added");
  };
  const updateRecovered=(eid,idx,val)=>{
    const entries=getAdvEntries(eid).map((x,i)=>i===idx?{...x,recovered:+val}:x);
    write({[`adv_${mkey}`]:{...adv,[eid]:entries}});
  };
  const deleteAdvEntry=(eid,idx)=>{
    const entries=getAdvEntries(eid).filter((_,i)=>i!==idx);
    write({[`adv_${mkey}`]:{...adv,[eid]:entries}});
  };

  const NI=(val,onChange,w=95)=>(
    <input type="number" value={val??""} onChange={onChange} placeholder="0" style={{...inp(w),textAlign:"right",padding:"5px 7px"}}/>
  );
  return(
    <div>
      {showCF&&(()=>{const nm=month===12?1:month+1;const ny=month===12?year+1:year;return(
      <div style={{position:"fixed",inset:0,background:"rgba(74,14,14,0.65)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{background:T.white,borderRadius:12,padding:28,width:440,maxWidth:"95vw",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
          <div style={{textAlign:"center",fontSize:36,marginBottom:10}}>🔄</div>
          <div style={{fontWeight:800,fontSize:15,color:T.maroon,textAlign:"center",marginBottom:12}}>
            Carry Forward → {MONTHS[nm]} {ny}
          </div>
          <div style={{fontSize:13,color:T.muted,background:T.saffronPale,padding:14,borderRadius:8,lineHeight:2,marginBottom:20}}>
            ✅ Loan Balance → Opening Balance for {MONTHS[nm]}<br/>
            ✅ Monthly EMI → carried forward (auto-fills deduction)<br/>
            ✅ Loan Given reset to zero<br/>
            ✅ Advance balance carried forward as B/F<br/>
            ✅ PF &amp; ESI carried forward<br/>
            <span style={{color:T.danger,fontWeight:600}}>⚠ Export / download data first before proceeding</span>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setShowCF(false)} style={btn("#e8d5b0",T.text)}>Cancel</button>
            <button onClick={carryForward} style={btn(T.maroon)}>✅ Carry Forward to {MONTHS[nm]}</button>
          </div>
        </div>
      </div>
      );})()}

      {/* Advance Ledger modal */}
      {advEmpId&&(()=>{
        const emp=de.find(e=>e.id===advEmpId);
        const entries=getAdvEntries(advEmpId);
        return(
          <div style={{position:"fixed",inset:0,background:"rgba(74,14,14,0.7)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
            <div style={{background:T.white,borderRadius:14,width:"100%",maxWidth:560,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
              <div style={{background:"#6b4a00",color:"white",padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderRadius:"14px 14px 0 0"}}>
                <div><div style={{fontWeight:700,fontSize:15}}>💳 Advance Ledger</div><div style={{fontSize:11,opacity:0.7,marginTop:2}}>{emp?.name} · {dept?.name} · {MONTHS[month]} {year}</div></div>
                <button onClick={()=>setAdvEmpId(null)} style={{background:"none",border:"none",color:"white",fontSize:20,cursor:"pointer"}}>✕</button>
              </div>
              {/* Summary */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,borderBottom:`1px solid ${T.border}`}}>
                {[{l:"Total Advance",v:advTotal(advEmpId),c:T.danger},{l:"Recovered",v:advRecovered(advEmpId),c:T.success},{l:"Balance",v:advBalance(advEmpId),c:advBalance(advEmpId)>0?T.danger:T.success}].map(x=>(
                  <div key={x.l} style={{padding:"12px 16px",textAlign:"center",borderRight:`1px solid ${T.border}`}}>
                    <div style={{fontSize:10,color:T.muted,fontWeight:700,marginBottom:4}}>{x.l}</div>
                    <div style={{fontSize:18,fontWeight:800,color:x.c}}>₹{fi(x.v)}</div>
                  </div>
                ))}
              </div>
              {/* Add entry */}
              <div style={{padding:14,background:T.saffronPale,borderBottom:`1px solid ${T.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:T.maroon,marginBottom:8}}>+ Add Advance Entry</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  <div><label style={{fontSize:10,color:T.muted,fontWeight:700,display:"block",marginBottom:3}}>DATE*</label>
                    <input type="date" value={advForm.date||""} onChange={e=>setAdvForm(p=>({...p,date:e.target.value}))} style={inp()}/>
                  </div>
                  <div><label style={{fontSize:10,color:T.muted,fontWeight:700,display:"block",marginBottom:3}}>AMOUNT (₹)*</label>
                    <input type="number" value={advForm.amount||""} onChange={e=>setAdvForm(p=>({...p,amount:e.target.value}))} placeholder="0" style={inp()}/>
                  </div>
                  <div><label style={{fontSize:10,color:T.muted,fontWeight:700,display:"block",marginBottom:3}}>NOTE</label>
                    <input type="text" value={advForm.note||""} onChange={e=>setAdvForm(p=>({...p,note:e.target.value}))} placeholder="Optional" style={inp()}/>
                  </div>
                </div>
                <button onClick={()=>addAdvEntry(advEmpId)} style={{...btn(T.maroon),marginTop:10}}>+ Add Entry</button>
              </div>
              {/* Entries list */}
              {entries.length===0?<div style={{padding:24,textAlign:"center",color:T.muted}}>No advance entries this month.</div>:(
                <table style={{borderCollapse:"collapse",width:"100%"}}>
                  <thead><tr>
                    <th style={{...thS,textAlign:"left",background:"#6b4a00"}}>Date</th>
                    <th style={{...thS,background:"#6b4a00"}}>Advance</th>
                    <th style={{...thS,background:"#6b4a00"}}>Recovered</th>
                    <th style={{...thS,background:"#6b4a00"}}>Balance</th>
                    <th style={{...thS,background:"#6b4a00"}}>Note</th>
                    <th style={{...thS,background:"#6b4a00"}}></th>
                  </tr></thead>
                  <tbody>{entries.map((x,i)=>(
                    <tr key={i} style={{background:i%2===0?T.white:"#fdf8f0"}}>
                      <td style={tdL}>{x.date}</td>
                      <td style={{...tdS,fontWeight:600,color:T.danger}}>₹{fi(x.amount)}</td>
                      <td style={{...tdS,padding:"4px 8px"}}>
                        <input type="number" value={x.recovered||""} onChange={e=>updateRecovered(advEmpId,i,e.target.value)} placeholder="0" style={{...inp(90),textAlign:"right",padding:"4px 6px"}}/>
                      </td>
                      <td style={{...tdS,fontWeight:700,color:fv(x.amount)-fv(x.recovered)>0?T.danger:T.success}}>
                        ₹{fi(Math.max(0,fv(x.amount)-fv(x.recovered)))}
                      </td>
                      <td style={{...tdL,fontSize:11,color:T.muted}}>{x.note||"—"}</td>
                      <td style={{...tdS,padding:"4px 6px"}}>
                        <button onClick={()=>deleteAdvEntry(advEmpId,i)} style={btn(T.danger,"white",true)}>🗑️</button>
                      </td>
                    </tr>
                  ))}</tbody>
                  <tfoot><tr style={{background:"#6b4a00",color:"white"}}>
                    <td style={{...tdL,color:"white",fontWeight:700}}>Total</td>
                    <td style={{...tdS,color:T.saffronL,fontWeight:800}}>₹{fi(advTotal(advEmpId))}</td>
                    <td style={{...tdS,color:"#b8ffb8",fontWeight:800}}>₹{fi(advRecovered(advEmpId))}</td>
                    <td style={{...tdS,color:advBalance(advEmpId)>0?"#ffb8b8":"#b8ffb8",fontWeight:800}}>₹{fi(advBalance(advEmpId))}</td>
                    <td colSpan={2}></td>
                  </tr></tfoot>
                </table>
              )}
            </div>
          </div>
        );
      })()}

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
        <div style={{fontSize:13,color:T.muted}}>Deductions — <b style={{color:T.maroon}}>{dept?.name}</b> — {MONTHS[month]} {year}</div>
        <button onClick={()=>setShowCF(true)} style={{...btn(T.saffron,T.maroonD),fontSize:13}}>🔄 New Month Setup</button>
      </div>

      {/* Advance Ledger Summary */}
      <div style={card}>
        <div style={{...sec,background:"#6b4a00"}}>
          <span>💳 Advance Ledger</span>
          <span style={{fontSize:11,opacity:0.7,fontWeight:400}}>Click employee to manage entries</span>
        </div>
        <table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left",background:"#6b4a00"}}>Employee</th>
            <th style={{...thS,background:"#6b4a00"}}>Total Advance</th>
            <th style={{...thS,background:"#6b4a00"}}>Recovered</th>
            <th style={{...thS,background:"#6b4a00"}}>Balance (deducted)</th>
            <th style={{...thS,background:"#6b4a00"}}>Entries</th>
          </tr></thead>
          <tbody>{de.map((e,i)=>{
            const bal=advBalance(e.id);
            const rb=i%2===0?T.white:"#fdf8f0";
            return(
              <tr key={e.id} style={{background:rb,cursor:"pointer"}} onClick={()=>setAdvEmpId(e.id)}>
                <td style={{...tdL,fontWeight:600,color:T.maroon,textDecoration:"underline"}}>{e.name}</td>
                <td style={{...tdS,color:advTotal(e.id)>0?T.danger:T.muted,fontWeight:600}}>{advTotal(e.id)>0?`₹${fi(advTotal(e.id))}`:"—"}</td>
                <td style={{...tdS,color:T.success,fontWeight:600}}>{advRecovered(e.id)>0?`₹${fi(advRecovered(e.id))}`:"—"}</td>
                <td style={{...tdS,fontWeight:800,color:bal>0?T.danger:bal<0?T.success:T.muted}}>{bal>0?`₹${fi(bal)}`:bal<0?`Overpaid ₹${fi(-bal)}`:"—"}</td>
                <td style={{...tdS,color:T.muted}}>{getAdvEntries(e.id).length||"—"}</td>
              </tr>
            );
          })}</tbody>
          <tfoot><tr style={{background:"#6b4a00",color:"white"}}>
            <td style={{...tdL,color:"white",fontWeight:700}}>TOTAL</td>
            <td style={{...tdS,color:T.saffronL,fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+advTotal(e.id),0))}</td>
            <td style={{...tdS,color:"#b8ffb8",fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+advRecovered(e.id),0))}</td>
            <td style={{...tdS,color:"#ffb8b8",fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+advBalance(e.id),0))}</td>
            <td></td>
          </tr></tfoot>
        </table>
      </div>

      {/* Loan Ledger */}
      <div style={card}>
        <div style={{...sec,background:"#3d2200"}}>
          <span>🏦 Loan Ledger</span>
          <span style={{fontSize:11,opacity:0.7,fontWeight:400}}>Balance = OP Bal + Given − EMI · Auto-deducts monthly till zero</span>
        </div>
        <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left",background:"#3d2200",minWidth:130}}>Employee</th>
            <th style={{...thS,background:"#5a3400",minWidth:110}}>OP Balance</th>
            <th style={{...thS,background:"#1a5a00",minWidth:110}}>Given Now</th>
            <th style={{...thS,background:"#5a1a6b",minWidth:110}}>Monthly EMI</th>
            <th style={{...thS,background:"#1a3d6b",minWidth:120}}>Balance</th>
          </tr></thead>
          <tbody>{de.map((e,i)=>{
            const ln=loan[e.id]||{};const bal=lnBal(e);const rb=i%2===0?T.white:"#fdf8f0";
            const tot=r2(fv(ln.ob)+fv(ln.given));
            const actualDed=r2(Math.min(fv(ln.emi),tot));
            const isCapped=actualDed<fv(ln.emi)&&fv(ln.emi)>0&&tot>0;
            return <tr key={e.id}>
              <td style={{...tdL,background:rb}}><b>{e.name}</b></td>
              <td style={{...tdS,padding:"5px 8px",background:rb}}>{NI(ln.ob,ev=>write({[`loan_${mkey}`]:{...loan,[e.id]:{...(loan[e.id]||{}),ob:ev.target.value}}}))} </td>
              <td style={{...tdS,padding:"5px 8px",background:i%2===0?"#f0fae8":"#e8f5d8"}}>{NI(ln.given,ev=>write({[`loan_${mkey}`]:{...loan,[e.id]:{...(loan[e.id]||{}),given:ev.target.value}}}))} </td>
              <td style={{...tdS,padding:"5px 8px",background:i%2===0?"#f5eefa":"#ede0f5"}}>
                {NI(ln.emi,ev=>write({[`loan_${mkey}`]:{...loan,[e.id]:{...(loan[e.id]||{}),emi:ev.target.value}}}))}
                {isCapped&&<span style={{fontSize:9,color:"#d4780a",display:"block",marginTop:2}}>↑ last EMI: ₹{fi(actualDed)}</span>}
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
            <td style={{...tdS,color:"#ddaaff",fontWeight:700}}>₹{fi(de.reduce((s,e)=>s+fv((loan[e.id]||{}).emi),0))}</td>
            <td style={{...tdS,color:"#aac4ff",fontWeight:800}}>₹{fi(de.reduce((s,e)=>s+lnBal(e),0))}</td>
          </tr></tfoot>
        </table></div>
      </div>

      {/* PF, ESI */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {[
          {title:"🏛 PF Deduction",sub:"Provident Fund — 12% of 70% of actual salary earned (auto for eligible)",bg:T.blue,key:"pf",state:pf,rowBg:["white",T.blueL],tc:"#aac4ff",auto:e=>e.pfEsi?r2(r2(e.rate*0.70)*0.12):null},
          {title:"🏥 ESI Deduction",sub:"Employee State Insurance — 0.75% of 70% of actual salary earned (auto for eligible)",bg:T.green,key:"esi",state:esi,rowBg:["white",T.greenL],tc:"#90eeda",auto:e=>e.pfEsi?r2(r2(e.rate*0.70)*0.0075):null},
        ].map(({title,sub,bg,key,state,rowBg,tc,auto})=>(
          <div key={key} style={card}>
            <div style={{...sec,background:bg}}><span>{title}</span><span style={{fontSize:10,fontWeight:400,opacity:0.8}}>{sub}</span></div>
            <table style={{borderCollapse:"collapse",width:"100%"}}>
              <thead><tr><th style={{...thS,textAlign:"left",background:bg}}>Employee</th><th style={{...thS,background:bg}}>Amount (₹)</th></tr></thead>
              <tbody>{de.map((e,i)=>{
                const autoVal=auto?auto(e):null;
                return(
                  <tr key={e.id} style={{background:rowBg[i%2]}}>
                    <td style={tdL}>
                      <b>{e.name}</b>
                      {autoVal!==null&&<span style={{marginLeft:6,fontSize:10,background:"#dbeafe",color:"#1e3a8a",padding:"1px 6px",borderRadius:8,fontWeight:700}}>Auto ₹{fi(autoVal)}</span>}
                    </td>
                    <td style={{...tdS,padding:"5px 8px"}}>
                      {autoVal!==null
                        ?<div style={{textAlign:"right",fontWeight:700,color:"#1e3a8a",fontSize:14}}>₹{fi(autoVal)}</div>
                        :<input type="number" value={state[e.id]??""} onChange={ev=>write({[`${key}_${mkey}`]:{...state,[e.id]:ev.target.value}})} placeholder="0" style={{...inp(120),textAlign:"right",padding:"5px 7px"}}/>
                      }
                    </td>
                  </tr>
                );
              })}</tbody>
              <tfoot><tr style={{background:bg,color:"white"}}>
                <td style={{...tdL,color:"white",fontWeight:700}}>Total</td>
                <td style={{...tdS,color:tc,fontWeight:800}}>₹{fi(de.reduce((s,e)=>{const av=auto?auto(e):null;return s+(av!==null?av:fv(state[e.id]));},0))}</td>
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
      <div class="grid"><div><div class="row"><span class="lbl">Advance</span><span class="val">−₹${fi(s.advAmt)}</span></div><div class="row"><span class="lbl">Loan Deduction</span><span class="val">−₹${fi(s.lnDed)}</span></div>${s.lnBal>0?`<div class="row"><span class="lbl" style="font-size:11px">Loan Balance c/f</span><span class="val" style="font-size:11px">₹${fi(s.lnBal)}</span></div>`:""}</div><div><div class="row"><span class="lbl">PF</span><span class="val">−₹${fi(s.pfAmt)}</span></div><div class="row"><span class="lbl">ESI</span><span class="val">−₹${fi(s.esiAmt)}</span></div>${s.rentAmt>0?`<div class="row"><span class="lbl">Accommodation Rent</span><span class="val">−₹${fi(s.rentAmt)}</span></div>`:""}</div></div>
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
                  {[{l:"Advance",v:s.advAmt,c:T.danger},{l:"Loan",v:s.lnDed,c:T.danger},{l:"PF",v:s.pfAmt,c:T.blue},{l:"ESI",v:s.esiAmt,c:T.green},{l:"Rent",v:s.rentAmt,c:"#7a3d00"}].map(x=>(
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
  const downloadXLS=()=>{
    const script=document.createElement("script");
    script.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload=()=>{
      const XLSX=window.XLSX;
      const header=[
        "Transaction type \n(Within Bank (WIB)/\nNEFT (NFT)/\nRTGS (RTG)/\nIMPS (IFC))",
        "Amount (₹)\n(Should not be more than 15 digit including decimals and paise)",
        "Debit Account no\nShould be exactly 12 digit",
        "IFSC (Always 11 character alphanumeric and 5th character always 0 (zero)) (For ICICI bank accounts keep it blank)",
        "Beneficiary Account No (Max length for other bank 34 character alphanumeric and for ICICI Bank 12 digit number )",
        "Beneficiary Name (Max length 32 Character) (No Special Character is allowed but Space is allowed)",
        "Remarks for Client\n(should not be more than 21 characters)",
        "Remarks for Beneficiary\n(should not be more than 30 characters)"
      ];
      const dataRows=rows.map(s=>{
        const txnType=(!s.emp.ifsc||s.emp.ifsc.toUpperCase().startsWith("ICIC"))?"WIB":"NFT";
        const ifsc=txnType==="WIB"?"":s.emp.ifsc;
        const bName=(s.emp.bankName||s.emp.name).substring(0,32).replace(/[^a-zA-Z0-9 ]/g,"");
        return [txnType,Math.round(s.net),dbAcc,ifsc,s.emp.acc,bName,narr,narr];
      });
      const ws=XLSX.utils.aoa_to_sheet([header,...dataRows]);
      ws["!cols"]=[{wch:18},{wch:20},{wch:20},{wch:30},{wch:34},{wch:32},{wch:22},{wch:30}];
      const wb2=XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb2,ws,"Sheet1");
      XLSX.writeFile(wb2,`PAB_Salary_${MONTHS[month]}_${year}.xls`,{bookType:"xls"});
    };
    document.head.appendChild(script);
  };
  return(
    <div>
      <div style={{...card,marginBottom:12}}>
        <div style={sec}><span>🏦 Bank Upload — {dept?.name} — {MONTHS[month]} {year}</span></div>
        <div style={{padding:14,display:"flex",gap:14,alignItems:"flex-end",flexWrap:"wrap"}}>
          <div><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>DEBIT ACCOUNT</label><input value={dbAcc} onChange={e=>write({dbAcc:e.target.value})} style={{...inp(200),fontFamily:"monospace"}} placeholder="Institution account number"/></div>
          <button onClick={downloadXLS} style={{...btn(T.saffron,T.maroonD),fontSize:13}}>⬇️ Download PAB XLS</button>
          <div style={{marginLeft:"auto",background:T.saffronPale,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 18px",textAlign:"center"}}>
            <div style={{fontSize:10,color:T.muted,fontWeight:700}}>TOTAL TO TRANSFER</div>
            <div style={{fontSize:22,fontWeight:900,color:T.maroon}}>₹{fi(total)}</div>
            <div style={{fontSize:11,color:T.muted}}>{rows.length} employees · {MONTHS[month]} {year}</div>
          </div>
        </div>
        <div style={{padding:"0 14px 12px",fontSize:11,color:T.muted}}>
          ℹ️ ICICI bank accounts → WIB (IFSC blank) · Other banks → NFT (NEFT) · Salary basis: 24 working days/month
        </div>
      </div>
      <div style={card}>
        <div style={sec}>Payment Details</div>
        <div style={{overflowX:"auto"}}><table style={{borderCollapse:"collapse",width:"100%"}}>
          <thead><tr>
            <th style={{...thS,textAlign:"left"}}>Employee</th>
            <th style={{...thS,textAlign:"left"}}>Txn Type</th>
            <th style={{...thS,textAlign:"left"}}>Account No.</th>
            <th style={{...thS,textAlign:"left"}}>IFSC</th>
            <th style={thS}>Net Pay</th>
          </tr></thead>
          <tbody>{settle.filter(s=>s.emp.deptId===activeDept).map((s,i)=>{
            const txnType=(!s.emp.ifsc||s.emp.ifsc.toUpperCase().startsWith("ICIC"))?"WIB":"NFT";
            return(<tr key={s.emp.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
              <td style={tdL}><b>{s.emp.name}</b></td>
              <td style={{...tdS,fontWeight:700,color:txnType==="WIB"?T.blue:T.green}}>{txnType}</td>
              <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{s.emp.acc||<span style={{color:T.muted,fontStyle:"italic"}}>Not set</span>}</td>
              <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{s.emp.ifsc||"—"}</td>
              <td style={{...tdS,fontWeight:700,color:s.net>0?T.maroon:T.muted}}>₹{fi(s.net)}</td>
            </tr>);
          })}</tbody>
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
  const {year,month}=d;
  const mkey=`${year}_${month}`;
  const saveEmp=()=>{
    if(!ed.name.trim()||!ed.rate)return;
    let newEmps,newNid=nid;
    if(ed.id===0){newEmps=[...emps,{...ed,id:nid,deptId:activeDept}];newNid=nid+1;}
    else newEmps=emps.map(e=>e.id===ed.id?{...ed}:e);
    // Also update current-month snapshot so rent/rate changes take effect immediately
    write({emps:newEmps,nid:newNid,[`emps_${mkey}`]:newEmps});setEd(null);
  };
  return(
    <div style={card}>
      <div style={sec}><span>👥 Employees — {dept?.name}</span><button onClick={()=>setEd({id:0,deptId:activeDept,name:"",rate:"",rent:"",fixed:false,daily:false,pfEsi:false,bankName:"",acc:"",ifsc:""})} style={btn(T.saffron,T.maroonD,true)}>+ Add</button></div>
      {ed&&<div style={{padding:16,background:T.saffronPale,borderBottom:`1px solid ${T.border}`}}>
        <div style={{fontWeight:700,color:T.maroon,marginBottom:12,fontSize:13}}>{ed.id===0?"New Employee":"Edit Employee"}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          {[{l:"Full Name*",k:"name",t:"text",ph:"Employee name"},{l:ed.daily?"Daily Wage Rate (₹)*":"Monthly Rate (₹)*",k:"rate",t:"number",ph:ed.daily?"e.g. 400 per day":"e.g. 15000"},{l:"Accommodation Rent (₹)",k:"rent",t:"number",ph:"e.g. 500 or 0"},{l:"Bank Name",k:"bankName",t:"text",ph:"Name on account"},{l:"Account No.",k:"acc",t:"text",ph:"Account number"},{l:"IFSC Code",k:"ifsc",t:"text",ph:"e.g. SBIN0001234"}].map(f=>(
            <div key={f.k}><label style={{display:"block",fontSize:10,color:T.muted,fontWeight:700,marginBottom:3}}>{f.l}</label><input type={f.t} value={ed[f.k]} onChange={e=>setEd(p=>({...p,[f.k]:e.target.value}))} placeholder={f.ph} style={inp()}/></div>
          ))}
          <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:16}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="checkbox" id="fixedChk" checked={!!ed.fixed} onChange={e=>setEd(p=>({...p,fixed:e.target.checked,daily:false}))} style={{width:16,height:16,cursor:"pointer"}}/>
              <label htmlFor="fixedChk" style={{fontSize:12,fontWeight:700,color:T.maroon,cursor:"pointer"}}>Fixed Salary (full pay regardless of attendance)</label>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="checkbox" id="dailyChk" checked={!!ed.daily} onChange={e=>setEd(p=>({...p,daily:e.target.checked,fixed:false}))} style={{width:16,height:16,cursor:"pointer"}}/>
              <label htmlFor="dailyChk" style={{fontSize:12,fontWeight:700,color:"#1a4d00",cursor:"pointer"}}>Daily Wage (rate = per day · paid only for days present)</label>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <input type="checkbox" id="pfEsiChk" checked={!!ed.pfEsi} onChange={e=>setEd(p=>({...p,pfEsi:e.target.checked}))} style={{width:16,height:16,cursor:"pointer"}}/>
              <label htmlFor="pfEsiChk" style={{fontSize:12,fontWeight:700,color:"#1a3d6b",cursor:"pointer"}}>
                PF &amp; ESI Eligible
                {ed.pfEsi && ed.rate && <span style={{marginLeft:6,fontSize:11,color:T.muted,fontWeight:400}}>
                  PF: ₹{Math.round(ed.rate*0.70*0.12)} · ESI: ₹{Math.round(ed.rate*0.70*0.0075)}
                </span>}
              </label>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <button onClick={saveEmp} style={btn(T.maroon)}>💾 Save</button>
          <button onClick={()=>setEd(null)} style={btn("#e8d5b0",T.text)}>Cancel</button>
        </div>
      </div>}
      <table style={{borderCollapse:"collapse",width:"100%"}}>
        <thead><tr><th style={{...thS,textAlign:"left"}}>Name</th><th style={thS}>Type</th><th style={thS}>Rate/Month</th><th style={thS}>Daily Rate</th><th style={thS}>Rent Ded.</th><th style={{...thS,textAlign:"left"}}>Account</th><th style={{...thS,textAlign:"left"}}>IFSC</th><th style={thS}>Actions</th></tr></thead>
        <tbody>{de.map((e,i)=>(
          <tr key={e.id} style={{background:i%2===0?T.white:"#fdf5e8"}}>
            <td style={tdL}><b>{e.name}</b></td>
            <td style={{...tdS}}>
              <div style={{display:"flex",flexDirection:"column",gap:2,alignItems:"center"}}>
                {e.fixed
                  ? <span style={{background:"#fef3c7",color:"#92400e",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700}}>Fixed</span>
                  : e.daily
                  ? <span style={{background:"#dcfce7",color:"#14532d",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700}}>Daily Wage</span>
                  : <span style={{background:"#e8f0eb",color:"#1a3d2b",padding:"2px 8px",borderRadius:10,fontSize:11,fontWeight:700}}>Attendance</span>}
                {e.pfEsi && <span style={{background:"#dbeafe",color:"#1e3a8a",padding:"2px 8px",borderRadius:10,fontSize:10,fontWeight:700}}>PF+ESI</span>}
              </div>
            </td>
            <td style={tdS}>₹{fi(e.rate)}</td>
            <td style={tdS}>{e.fixed?"—":e.daily?<span style={{color:"#14532d",fontWeight:700}}>₹{fi(e.rate)}/day</span>:"₹"+fi(e.rate/24)}</td>
            <td style={{...tdS,color:fv(e.rent)>0?T.danger:T.muted}}>{fv(e.rent)>0?`₹${fi(e.rent)}`:"—"}</td>
            <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{e.acc||"—"}</td>
            <td style={{...tdL,fontFamily:"monospace",fontSize:12}}>{e.ifsc||"—"}</td>
            <td style={{...tdS,padding:"4px 8px"}}>
              <div style={{display:"flex",gap:5,justifyContent:"center"}}>
                <button onClick={()=>setEd({...e})} style={btn(T.maroonL,"white",true)}>✏️</button>
                <button onClick={()=>{if(window.confirm("Remove?"))write({emps:emps.filter(x=>x.id!==e.id)});}} style={btn(T.danger,"white",true)}>🗑️</button>
              </div>
            </td>
          </tr>
        ))}{de.length===0&&<tr><td colSpan={8} style={{padding:24,textAlign:"center",color:T.muted}}>No employees yet.</td></tr>}</tbody>
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
