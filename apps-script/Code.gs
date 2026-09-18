const CALENDAR_ID = 'c_7aef4cc773d414d0b447c1a7ad7e6c9910c8b127ef7d22cc240b472d693f7d35@group.calendar.google.com';
const TIME_ZONE = 'America/Los_Angeles';
const ALLOWED_DOMAIN = 'salinasuhsd.org';
const NON_PRIORITY_DAYS = 14;
const PRIORITY_COURSES = ['AP Chemistry','AP Biology','Anatomy & Physiology'];
const MINIMUM_DAYS = []; // Add YYYY-MM-DD dates here and in config.js.

const REGULAR = [{id:'P1',label:'Period 1',start:'08:45',end:'09:44'},{id:'P2',label:'Period 2',start:'09:51',end:'10:48'},{id:'P3',label:'Period 3',start:'10:55',end:'11:52'},{id:'P4',label:'Period 4',start:'11:59',end:'12:56'},{id:'P5',label:'Period 5',start:'13:43',end:'14:40'},{id:'P6',label:'Period 6',start:'14:47',end:'15:44'}];
const WEDNESDAY = [{id:'B1',label:'Block 1',start:'09:00',end:'10:46'},{id:'B3',label:'Block 3',start:'10:53',end:'12:35'},{id:'B5',label:'Block 5',start:'13:22',end:'15:04'}];
const THURSDAY = [{id:'B2',label:'Block 2',start:'08:45',end:'10:31'},{id:'B4',label:'Block 4',start:'10:38',end:'12:20'},{id:'B6',label:'Block 6',start:'14:02',end:'15:44'}];
const MINIMUM = [{id:'P1',label:'Period 1',start:'08:45',end:'09:22'},{id:'P2',label:'Period 2',start:'09:29',end:'10:06'},{id:'P3',label:'Period 3',start:'10:13',end:'10:50'},{id:'P4',label:'Period 4',start:'10:57',end:'11:34'},{id:'P5',label:'Period 5',start:'11:41',end:'12:18'},{id:'P6',label:'Period 6',start:'13:05',end:'13:41'}];

function doGet(e){
  const callback=(e.parameter.callback||'callback').replace(/[^a-zA-Z0-9_.$]/g,'');
  try{
    const action=e.parameter.action;
    const data=action==='availability'?getAvailability_(e.parameter):action==='book'?book_(e.parameter):{ok:false,error:'Unknown action.'};
    return ContentService.createTextOutput(`${callback}(${JSON.stringify(data)})`).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }catch(err){return ContentService.createTextOutput(`${callback}(${JSON.stringify({ok:false,error:err.message})})`).setMimeType(ContentService.MimeType.JAVASCRIPT)}
}
function getAvailability_(p){
  const start=parseDate_(p.start,'00:00'),end=parseDate_(p.end,'00:00');
  if((end-start)/86400000>8)throw new Error('Only one week may be requested.');
  const events=CalendarApp.getCalendarById(CALENDAR_ID).getEvents(start,end);
  return {ok:true,reservations:events.map(eventToReservation_).filter(Boolean)};
}
function eventToReservation_(event){
  const tag=event.getTag('labSlot');
  if(tag){const parts=tag.split('|');return {date:parts[0],slotId:parts[1],teacherName:event.getTag('teacherName')||'Teacher',course:event.getTag('course')||'Reserved'};}
  // Also display calendar events created outside this website when they overlap a bell slot.
  const date=Utilities.formatDate(event.getStartTime(),TIME_ZONE,'yyyy-MM-dd');
  const slot=slotsFor_(date).find(s=>event.getStartTime()<parseDate_(date,s.end)&&event.getEndTime()>parseDate_(date,s.start));
  return slot?{date:date,slotId:slot.id,teacherName:'Calendar event',course:event.getTitle()||'Reserved'}:null;
}
function book_(p){
  ['date','slotId','teacherName','teacherEmail','course','activity'].forEach(k=>{if(!p[k])throw new Error('Please complete every required field.')});
  const email=String(p.teacherEmail).trim().toLowerCase();
  if(!email.endsWith('@'+ALLOWED_DOMAIN))throw new Error('Use your '+ALLOWED_DOMAIN+' email address.');
  const slots=slotsFor_(p.date),slot=slots.find(s=>s.id===p.slotId);if(!slot)throw new Error('That period is not available on this day.');
  const start=parseDate_(p.date,slot.start),end=parseDate_(p.date,slot.end);if(end<new Date())throw new Error('Past periods cannot be reserved.');
  if(PRIORITY_COURSES.indexOf(p.course)===-1){const cutoff=new Date();cutoff.setDate(cutoff.getDate()+NON_PRIORITY_DAYS);cutoff.setHours(23,59,59,999);if(start>cutoff)throw new Error('Non-priority classes may reserve only '+NON_PRIORITY_DAYS+' days ahead.');}
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const calendar=CalendarApp.getCalendarById(CALENDAR_ID);if(!calendar)throw new Error('Calendar not found. Check sharing and the calendar ID.');
    if(calendar.getEvents(start,end).length)throw new Error('That period was just booked. Please select another slot.');
    const desc=['Teacher: '+p.teacherName,'Email: '+email,'Course: '+p.course,'Activity: '+p.activity,'Prep support: '+(p.needsPrep==='yes'?'Yes':'No'),p.notes?'Notes: '+p.notes:''].filter(Boolean).join('\n');
    const event=calendar.createEvent('LAB — '+p.course+' — '+p.teacherName,start,end,{description:desc,guests:email,sendInvites:true});
    event.setTag('labSlot',p.date+'|'+p.slotId);event.setTag('teacherName',p.teacherName);event.setTag('course',p.course);
    return {ok:true,eventId:event.getId()};
  }finally{lock.releaseLock()}
}
function slotsFor_(dateText){if(MINIMUM_DAYS.indexOf(dateText)>-1)return MINIMUM;const d=parseDate_(dateText,'12:00').getDay();if(d===3)return WEDNESDAY;if(d===4)return THURSDAY;if(d===1||d===2||d===5)return REGULAR;return []}
function parseDate_(date,time){const parts=(date+' '+time).match(/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/);if(!parts)throw new Error('Invalid date.');return new Date(Number(parts[1]),Number(parts[2])-1,Number(parts[3]),Number(parts[4]),Number(parts[5]))}
