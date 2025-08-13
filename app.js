
const SERVICE_UUID   = '12345678-1234-5678-1234-56789abcdef0';
const CHAR_VOLT_UUID = '12345678-1234-5678-1234-56789abcdef1'; // uint16 mV
const CHAR_MEAS_UUID = '12345678-1234-5678-1234-56789abcdef2'; // int32  um

const $ = id => document.getElementById(id);
const dbKey = 'entries.v1';
function readDB(){ try { return JSON.parse(localStorage.getItem(dbKey)) || []; } catch { return []; } }
function writeDB(items){ localStorage.setItem(dbKey, JSON.stringify(items)); render(); }
function setStatus(txt){ $('bleStatus').textContent = 'Statut : ' + txt; }

let ble = {device:null, chVolt:null, chMeas:null};

async function bleConnect(){
  try {
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'ESP32S3-Mesures' }],
      optionalServices: [SERVICE_UUID]
    });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(SERVICE_UUID);
    const chVolt = await service.getCharacteristic(CHAR_VOLT_UUID);
    const chMeas = await service.getCharacteristic(CHAR_MEAS_UUID);
    ble = {device, chVolt, chMeas};
    setStatus((device.name || 'Appareil') + ' connecté');
  } catch(e){ setStatus('Erreur connexion: ' + e); }
}

function decodeVolt(dv){ return dv.getUint16(0, true) / 1000; }
function decodeMm(dv){ return dv.getInt32(0, true) / 1000; }

async function bleRead(){
  try {
    if(ble.chVolt){
      const v = await ble.chVolt.readValue();
      $('voltage').value = decodeVolt(v).toFixed(3);
      if(!$('title').value) $('title').value = `Batterie ${$('voltage').value} V`;
    }
    if(ble.chMeas){
      const m = await ble.chMeas.readValue();
      $('mm').value = decodeMm(m).toFixed(3);
    }
    setStatus('Lecture OK');
  } catch(e){ setStatus('Erreur lecture: ' + e); }
}

async function save(){
  const title = $('title').value || '(Sans titre)';
  const volts = $('voltage').value || null;
  const mm = $('mm').value || null;
  const now = new Date().toISOString();
  const items = readDB();
  items.unshift({title, volts, mm, date: now});
  writeDB(items);
  $('title').value=''; $('voltage').value=''; $('mm').value='';
}

function clearAll(){ if(confirm('Vider ?')) writeDB([]); }
function exportJSON(){
  const blob = new Blob([JSON.stringify(readDB(), null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='entries.json'; a.click();
  URL.revokeObjectURL(url);
}

function render(){
  const list = $('list'); list.innerHTML = '';
  const items = readDB();
  if(!items.length){ list.innerHTML = '<div class="hint">Aucune entrée.</div>'; return; }
  for(const it of items){
    const div = document.createElement('div');
    div.className = 'item';
    const mmTxt = it.mm ? `${Number(it.mm).toFixed(3)} mm` : '—';
    const vTxt = it.volts ? `${Number(it.volts).toFixed(3)} V` : '—';
    div.textContent = `${new Date(it.date).toLocaleString()} • ${it.title} • U=${vTxt} • L=${mmTxt}`;
    list.appendChild(div);
  }
}

$('bleConnectBtn').onclick = bleConnect;
$('bleReadBtn').onclick = bleRead;
$('saveBtn').onclick = save;
$('clearBtn').onclick = clearAll;
$('exportBtn').onclick = exportJSON;
render();
