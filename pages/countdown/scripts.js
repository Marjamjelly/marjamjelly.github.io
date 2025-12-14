// Simple multi-countdown script
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('countdowns');

  // Optionally load events from events.json if present
  fetch('events.json').then(r => {
    if (!r.ok) throw new Error('no events.json');
    return r.json();
  }).then(events => {
    for (const ev of events) addEventElement(ev);
  }).catch(()=>{/* no events.json — ignore */});

  // Initialize existing elements
  const inDom = Array.from(container.querySelectorAll('.countdown'));
  inDom.forEach(initCountdown);

  // Start timer
  setInterval(tickAll, 1000);
  tickAll(); // initial
});

function addEventElement(ev){
  // ev: { id, datetime, title, recurring? }
  const container = document.getElementById('countdowns');
  const article = document.createElement('article');
  article.className = 'countdown';
  if (ev.id) article.dataset.id = ev.id;
  if (ev.datetime) article.dataset.datetime = ev.datetime;
  if (ev.recurring) article.dataset.recurring = ev.recurring;
  article.dataset.title = ev.title || ev.datetime || 'Event';
  article.innerHTML = `<h2>${escapeHtml(ev.title || '')}</h2><div class="time" aria-live="polite">--:--:--:--</div>`;
  container.appendChild(article);
  initCountdown(article);
}

function initCountdown(el){
  // Ensure it has a .time
  const display = el.querySelector('.time');
  if (!display) {
    const d = document.createElement('div');
    d.className = 'time';
    el.appendChild(d);
  }
  // parse data
  // nothing else needed; tickAll will handle
}

function tickAll(){
  const items = document.querySelectorAll('.countdown');
  const now = new Date();
  items.forEach(el => {
    try {
      updateCountdown(el, now);
    } catch(e) {
      console.error('countdown error', e);
    }
  });
}

function updateCountdown(el, now){
  const display = el.querySelector('.time');
  const datetime = el.dataset.datetime;
  const recurring = el.dataset.recurring; // 'daily', 'weekly', 'yearly'
  const title = el.dataset.title || el.dataset.datetime || '';

  let target = null;

  if (!datetime) {
    display.textContent = 'No date set';
    return;
  }

  // If datetime looks like HH:MM:SS and recurring exists, treat as time-of-day local
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(datetime) && recurring) {
    target = nextRecurringTimeOfDay(datetime, recurring, now);
  } else {
    // Try to parse ISO or any Date-parsable string
    const parsed = Date.parse(datetime);
    if (!isNaN(parsed)) {
      target = new Date(parsed);
      // If recurring and parsed is in the past, find next occurrence
      if (recurring) target = nextRecurringFromDate(target, recurring, now);
    } else {
      display.textContent = 'Invalid date';
      return;
    }
  }

  let diff = target - now;
  if (diff <= 0) {
    // Past: mark and show elapsed or show 00:00:00
    el.classList.add('past');
    display.textContent = '00:00:00';
    // optional: you could show "Occurred" or count up with negative diff
    return;
  } else {
    el.classList.remove('past');
  }

  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;

  // Format: Dd HH:MM:SS (if days=0, hide days)
  const hh = String(hours).padStart(2,'0');
  const mm = String(minutes).padStart(2,'0');
  const ss = String(seconds).padStart(2,'0');

  display.textContent = (days > 0) ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

function nextRecurringTimeOfDay(timestr, recurring, now){
  // timestr: HH:MM or HH:MM:SS (assume local timezone)
  const parts = timestr.split(':').map(p=>parseInt(p,10));
  const hh = parts[0]||0, mm = parts[1]||0, ss = parts[2]||0;
  let target = new Date(now);
  target.setHours(hh,mm,ss,0);
  if (target - now > 0) {
    // today later
    return target;
  }
  // otherwise compute next according to recurring
  if (recurring === 'daily') {
    target.setDate(target.getDate()+1);
    return target;
  } else if (recurring === 'weekly') {
    // assume next week same weekday
    target.setDate(target.getDate()+7);
    return target;
  } else if (recurring === 'yearly') {
    target.setFullYear(target.getFullYear()+1);
    return target;
  } else {
    // fallback: tomorrow
    target.setDate(target.getDate()+1);
    return target;
  }
}

function nextRecurringFromDate(base, recurring, now){
  // base: Date of the original event, used to get time-of-day and month/day for recurring adjustments
  let target = new Date(base);
  if (target > now) return target;
  if (recurring === 'daily') {
    while (target <= now) target.setDate(target.getDate()+1);
  } else if (recurring === 'weekly') {
    while (target <= now) target.setDate(target.getDate()+7);
  } else if (recurring === 'yearly') {
    while (target <= now) target.setFullYear(target.getFullYear()+1);
  } else {
    // one-time only
  }
  return target;
}

function escapeHtml(s){
  return (s||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}