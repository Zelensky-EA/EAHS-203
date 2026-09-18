const CONFIG = window.LAB_CONFIG;
const PRIORITY = new Set(["AP Chemistry", "AP Biology", "Anatomy & Physiology"]);
const REGULAR = [
  {id:"P1",label:"Period 1",start:"08:45",end:"09:44"},{id:"P2",label:"Period 2",start:"09:51",end:"10:48"},
  {id:"P3",label:"Period 3",start:"10:55",end:"11:52"},{id:"P4",label:"Period 4",start:"11:59",end:"12:56"},
  {id:"P5",label:"Period 5",start:"13:43",end:"14:40"},{id:"P6",label:"Period 6",start:"14:47",end:"15:44"}
];
const WEDNESDAY = [{id:"B1",label:"Block 1",start:"09:00",end:"10:46"},{id:"B3",label:"Block 3",start:"10:53",end:"12:35"},{id:"B5",label:"Block 5",start:"13:22",end:"15:04"}];
const THURSDAY = [{id:"B2",label:"Block 2",start:"08:45",end:"10:31"},{id:"B4",label:"Block 4",start:"10:38",end:"12:20"},{id:"B6",label:"Block 6",start:"14:02",end:"15:44"}];
const MINIMUM = [
  {id:"P1",label:"Period 1",start:"08:45",end:"09:22"},{id:"P2",label:"Period 2",start:"09:29",end:"10:06"},
  {id:"P3",label:"Period 3",start:"10:13",end:"10:50"},{id:"P4",label:"Period 4",start:"10:57",end:"11:34"},
  {id:"P5",label:"Period 5",start:"11:41",end:"12:18"},{id:"P6",label:"Period 6",start:"13:05",end:"13:41"}
];
let weekStart = mondayOf(new Date());
let reservations = [];
const grid = document.querySelector("#calendarGrid");
const status = document.querySelector("#status");
const dialog = document.querySelector("#bookingDialog");
const form = document.querySelector("#bookingForm");

function mondayOf(date){const d=new Date(date);d.setHours(0,0,0,0);const day=d.getDay();d.setDate(d.getDate()-(day===0?6:day-1));return d}
function addDays(date,n){const d=new Date(date);d.setDate(d.getDate()+n);return d}
function ymd(date){return date.toLocaleDateString("en-CA",{timeZone:CONFIG.timeZone})}
function slotsFor(date){if(CONFIG.minimumDays.includes(ymd(date)))return MINIMUM;const d=date.getDay();if(d===3)return WEDNESDAY;if(d===4)return THURSDAY;return REGULAR}
function displayTime(t){return new Date(`2000-01-01T${t}:00`).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
function reservationFor(date,slot){return reservations.find(r=>r.date===ymd(date)&&r.slotId===slot.id)}
function isPast(date,slot){return new Date(`${ymd(date)}T${slot.end}:00`)<new Date()}

function render(){
  const end=addDays(weekStart,4);
  document.querySelector("#weekTitle").textContent=`${weekStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} – ${end.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}`;
  grid.innerHTML="";
  for(let i=0;i<5;i++){
    const date=addDays(weekStart,i), day=document.createElement("article");
    day.className=`day ${ymd(date)===ymd(new Date())?"today":""}`;
    day.innerHTML=`<div class="day-header"><span class="day-name">${date.toLocaleDateString("en-US",{weekday:"long"})}</span><span class="day-date">${date.toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span></div><div class="slot-list"></div>`;
    const list=day.querySelector(".slot-list");
    slotsFor(date).forEach(slot=>{
      const existing=reservationFor(date,slot), past=isPast(date,slot), button=document.createElement("button");
      button.className=`slot ${existing?"booked":""} ${past?"past":""}`;button.disabled=Boolean(existing||past);
      button.innerHTML=existing?`<strong>${slot.label} · Booked</strong><span>${escapeHtml(existing.course||"Reserved")} · ${escapeHtml(existing.teacherName||"Teacher")}</span>`:`<strong>${slot.label}</strong><span>${displayTime(slot.start)}–${displayTime(slot.end)} · Available</span>`;
      if(!existing&&!past)button.addEventListener("click",()=>openBooking(date,slot));list.append(button);
    });grid.append(day);
  }
}
function escapeHtml(v){const d=document.createElement("div");d.textContent=v;return d.innerHTML}
function openBooking(date,slot){form.reset();document.querySelector("#bookingDate").value=ymd(date);document.querySelector("#bookingSlot").value=slot.id;document.querySelector("#slotHeading").textContent=`${slot.label} · ${date.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}`;document.querySelector("#formMessage").textContent="";dialog.showModal()}

function jsonp(params){return new Promise((resolve,reject)=>{const cb=`labCb_${Date.now()}_${Math.random().toString(36).slice(2)}`;const script=document.createElement("script");const timer=setTimeout(()=>done(new Error("The calendar service did not respond.")),15000);function done(err,data){clearTimeout(timer);delete window[cb];script.remove();err?reject(err):resolve(data)}window[cb]=data=>done(null,data);script.onerror=()=>done(new Error("Unable to reach the calendar service."));const url=new URL(CONFIG.apiUrl);Object.entries({...params,callback:cb}).forEach(([k,v])=>url.searchParams.set(k,v));script.src=url;document.body.append(script)})}
async function loadWeek(){
  if(!CONFIG.apiUrl){document.querySelector("#setupWarning").hidden=false;reservations=[];render();return}
  status.textContent="Checking availability…";
  try{const result=await jsonp({action:"availability",start:ymd(weekStart),end:ymd(addDays(weekStart,5))});if(!result.ok)throw new Error(result.error);reservations=result.reservations||[];render();status.textContent=""}catch(e){status.textContent=e.message;render()}
}
form.addEventListener("submit",async e=>{
  e.preventDefault();if(!CONFIG.apiUrl){document.querySelector("#formMessage").textContent="Connect the Apps Script deployment before booking.";return}
  const data=Object.fromEntries(new FormData(form));const selectedDate=new Date(`${data.date}T12:00:00`);const cutoff=addDays(new Date(),CONFIG.nonPriorityAdvanceDays);cutoff.setHours(23,59,59,999);
  if(!PRIORITY.has(data.course)&&selectedDate>cutoff){document.querySelector("#formMessage").textContent=`Non-priority courses may reserve up to ${CONFIG.nonPriorityAdvanceDays} days ahead.`;return}
  const submit=document.querySelector("#submitBooking");submit.disabled=true;submit.textContent="Reserving…";document.querySelector("#formMessage").textContent="";
  try{const result=await jsonp({action:"book",...data,needsPrep:data.needsPrep?"yes":"no"});if(!result.ok)throw new Error(result.error);dialog.close();await loadWeek();status.textContent="Reservation confirmed and added to Google Calendar."}catch(err){document.querySelector("#formMessage").textContent=err.message}finally{submit.disabled=false;submit.textContent="Reserve lab"}
});
document.querySelector("#prevWeek").onclick=()=>{weekStart=addDays(weekStart,-7);loadWeek()};document.querySelector("#nextWeek").onclick=()=>{weekStart=addDays(weekStart,7);loadWeek()};document.querySelector("#today").onclick=()=>{weekStart=mondayOf(new Date());loadWeek()};document.querySelector("#closeDialog").onclick=()=>dialog.close();document.querySelector("#cancelBooking").onclick=()=>dialog.close();loadWeek();
