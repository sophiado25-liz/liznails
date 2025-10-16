const SERVICES = [
  {id:'gel_polish', label:'Gel Polish', duration:60},
  {id:'builder_gel', label:'Builder Gel', duration:90},
  {id:'acrylic_fullset', label:'Acrylic Full Set', duration:120},
  {id:'fill', label:'Fill', duration:60},
  {id:'gelx', label:'Gel X Extensions', duration:120},
  {id:'nail_art', label:'Nail Art (per nail)', duration:10}
];

const FORMS_ENDPOINT = 'YOUR_CLOUD_FUNCTION_URL';

const serviceList = document.getElementById('service-list');
SERVICES.forEach(s => {
  const wrapper = document.createElement('label');
  wrapper.innerHTML = `<input type="checkbox" data-id="${s.id}" data-label="${s.label}" data-duration="${s.duration}"> ${s.label}`;
  serviceList.appendChild(wrapper);
});

function getSelectedServices(){
  return Array.from(document.querySelectorAll('#service-list input:checked'))
              .map(ch => ({id: ch.dataset.id, label: ch.dataset.label, duration: Number(ch.dataset.duration)}));
}

function getTotalDuration(services){ return services.reduce((sum,s)=>sum+s.duration,0); }

document.getElementById('liz-submit').addEventListener('click', async () => {
  const status = document.getElementById('liz-status');
  const summary = document.getElementById('liz-summary');
  status.textContent=''; summary.style.display='none'; summary.innerHTML='';

  const name = document.getElementById('client-name').value.trim();
  const phone = document.getElementById('client-phone').value.trim();
  const email = document.getElementById('client-email').value.trim();
  const count = Number(document.getElementById('client-count').value) || 1;
  const dt = document.getElementById('appointment-datetime').value;
  const note = document.getElementById('client-note').value.trim();
  const services = getSelectedServices();

  if(!name || !phone || !email || !dt || services.length===0){
    status.textContent = 'Please fill all fields and select at least one service.';
    return;
  }

  const startTime = new Date(dt);
  const totalDuration = getTotalDuration(services);
  const endTime = new Date(startTime.getTime() + totalDuration*60*1000);

  const payload = {timestamp:new Date().toISOString(), name, phone, email, count, datetime_iso:startTime.toISOString(), services, note};

  summary.style.display='block';
  summary.innerHTML = `<div><strong>Services:</strong> ${services.map(s=>s.label).join(', ')}</div>
  <div><strong>Date & Time:</strong> ${startTime.toLocaleString()} - ${endTime.toLocaleString()}</div>
  <div><strong>Name:</strong> ${name}, <strong>Phone:</strong> ${phone}, <strong>Email:</strong> ${email}</div>`;

  const btn = document.getElementById('liz-submit'); btn.disabled=true; btn.textContent='Submitting...';
  try {
    const resp = await fetch(FORMS_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const data = await resp.json();
    if(data.status==='success') status.textContent='Booking successful! Confirmation email sent.';
    else status.textContent=`Error: ${data.message}`;
  } catch(err){ status.textContent='Submission failed: '+err.message; }
  finally{ btn.disabled=false; btn.textContent='Book Appointment'; }
});

