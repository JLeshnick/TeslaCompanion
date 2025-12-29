import { MULTI_LAYOUTS, DEFAULT_MULTI_LAYOUT } from './lib/src/multiLayouts.js';
import { CLIPS_MODE_KEY, MULTI_LAYOUT_KEY, MULTI_ENABLED_KEY, DASHBOARD_ENABLED_KEY, MAP_ENABLED_KEY } from './lib/src/storageKeys.js';
import { createClipsPanelMode } from './lib/src/panelMode.js';
import { escapeHtml, cssEscape } from './lib/src/utils.js';
import { state } from './lib/src/state.js';

// State
const player = state.player;
const library = state.library;
const selection = state.selection;
const multi = state.multi;
const previews = state.previews;
let seiType = null;
let enumFields = null;

// Sentry event metadata (event.json)
const eventMetaByKey = new Map(); // key -> parsed JSON object

// DOM Elements
const $ = id => document.getElementById(id);
const dropOverlay = $('dropOverlay');
const fileInput = $('fileInput');
const folderInput = $('folderInput');
const overlayChooseFolderBtn = $('overlayChooseFolderBtn');
const overlayChooseFileBtn = $('overlayChooseFileBtn');
const overlayConnectPiBtn = $('overlayConnectPiBtn'); // New button
const piConnectModal = $('piConnectModal'); // New modal
const piConnectConfirmBtn = $('piConnectConfirmBtn'); // New button
const piCancelBtn = $('piCancelBtn'); // New button
const piIpInput = $('piIpInput');
const piUserInput = $('piUserInput');
const piPassInput = $('piPassInput');
const piUseProxy = $('piUseProxy');

// Recording DOM
const saveClipBtn = $('saveClipBtn');
const recordingSettingsOverlay = $('recording-settings-overlay');
const closeRecModalBtn = $('closeRecModalBtn');
const cancelRecBtn = $('cancelRecBtn');
const startRecBtn = $('startRecBtn');
const modalClipDuration = $('modalClipDuration');
const modalClipTitle = $('modalClipTitle');

const canvas = $('videoCanvas');
const ctx = canvas.getContext('2d');
const progressBar = $('progressBar');
const playBtn = $('playBtn');
const timeDisplay = $('timeDisplay');
const dashboardVis = $('dashboardVis');
const videoContainer = $('videoContainer');
const clipList = $('clipList');
const clipBrowserSubtitle = $('clipBrowserSubtitle');
const chooseFolderBtn = $('chooseFolderBtn');
const chooseFileBtn = $('chooseFileBtn');
const clipsDockToggleBtn = $('clipsDockToggleBtn');
const clipsCollapseBtn = $('clipsCollapseBtn');
const cameraSelect = $('cameraSelect');
const autoplayToggle = $('autoplayToggle');
const multiCamToggle = $('multiCamToggle');
const dashboardToggle = $('dashboardToggle');
const mapToggle = $('mapToggle');
const multiLayoutSelect = $('multiLayoutSelect');
const layoutBtnImmersive = $('layoutBtnImmersive');
const layoutBtnDefault = $('layoutBtnDefault');
const layoutBtnRepeatersTop = $('layoutBtnRepeatersTop');
const multiCamGrid = $('multiCamGrid');
// Canvas elements for 6-camera grid (slots: tl, tc, tr, bl, bc, br)
const canvasTL = $('canvasTL');
const canvasTC = $('canvasTC');
const canvasTR = $('canvasTR');
const canvasBL = $('canvasBL');
const canvasBC = $('canvasBC');
const canvasBR = $('canvasBR');
// Canvas elements for immersive layout
const canvasMain = $('canvasMain');
const canvasOverlayTL = $('canvasOverlayTL');
const canvasOverlayTR = $('canvasOverlayTR');
const canvasOverlayBL = $('canvasOverlayBL');
const canvasOverlayBC = $('canvasOverlayBC');
const canvasOverlayBR = $('canvasOverlayBR');

// Visualization Elements
const speedValue = $('speedValue');
const gearP = $('gearP');
const gearR = $('gearR');
const gearN = $('gearN');
const gearD = $('gearD');
const blinkLeft = $('blinkLeft');
const blinkRight = $('blinkRight');
let blinkerFlashInterval = null;
let blinkerState = { left: false, right: false, leftFlash: false, rightFlash: false };
const steeringIcon = $('steeringIcon');
const autopilotStatus = $('autopilotStatus');
const apText = $('apText');
const brakeInd = $('brakeInd');
const brakeBar = $('brakeBar');
const accelBar = $('accelBar');
const toggleExtra = $('toggleExtra');
const extraDataContainer = document.querySelector('.extra-data-container');
const mapVis = $('mapVis');

// Map State
let map = null;
let mapMarker = null;
let mapPolyline = null;
let mapPath = [];

// Extra Data Elements
const valLat = $('valLat');
const valLon = $('valLon');
const valHeading = $('valHeading');
const valAccX = $('valAccX');
const valAccY = $('valAccY');
const valAccZ = $('valAccZ');
const valSeq = $('valSeq');

// G-Force Meter Elements
const gforceDot = $('gforceDot');
const gforceTrail1 = $('gforceTrail1');
const gforceTrail2 = $('gforceTrail2');
const gforceTrail3 = $('gforceTrail3');
const gforceX = $('gforceX');
const gforceY = $('gforceY');

// Compass Elements
const compassNeedle = $('compassNeedle');
const compassValue = $('compassValue');

// G-Force trail history
const gforceHistory = [];
const GFORCE_HISTORY_MAX = 3;

// Constants
const MPS_TO_MPH = 2.23694;
const NAL_START_CODE = new Uint8Array([0, 0, 0, 1]);

function notify(message, opts = {}) {
    const type = opts.type || 'info'; 
    const timeoutMs = Number.isFinite(opts.timeoutMs) ? opts.timeoutMs : (type === 'error' ? 5500 : 3200);

    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        container.setAttribute('aria-live', 'polite');
        container.setAttribute('aria-atomic', 'true');
        document.body.appendChild(container);
    }

    const el = document.createElement('div');
    el.className = `toast toast--${type}`;
    el.innerHTML = `<span class="dot" aria-hidden="true"></span><div class="msg"></div>`;
    el.querySelector('.msg').textContent = String(message || '');
    container.appendChild(el);

    // Animate in
    requestAnimationFrame(() => el.classList.add('show'));

    // Auto remove
    const remove = () => {
        el.classList.remove('show');
        setTimeout(() => { try { el.remove(); } catch { } }, 180);
    };
    setTimeout(remove, timeoutMs);
}

function hasValidGps(sei) {
    const lat = Number(sei?.latitude_deg);
    const lon = Number(sei?.longitude_deg);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return false;
    if (lat === 0 && lon === 0) return false;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return false;
    return true;
}

// Remote File Class for Pi
class RemoteFile {
    constructor(name, url, authHeaders) {
        this.name = name;
        this.url = url;
        this.authHeaders = authHeaders;
        this.lastModified = Date.now();
        this.webkitRelativePath = ""; // Can set if needed
        this._teslaPath = ""; // Can set if needed
    }

    async arrayBuffer() {
        const headers = new Headers(this.authHeaders);
        const res = await fetch(this.url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch ${this.name}: ${res.status}`);
        return await res.arrayBuffer();
    }
    
    async text() {
        const headers = new Headers(this.authHeaders);
        const res = await fetch(this.url, { headers });
        if (!res.ok) throw new Error(`Failed to fetch ${this.name}: ${res.status}`);
        return await res.text();
    }
}

// Initialize
(async function init() {
    // Init Map
    try {
        if (window.L) {
            map = L.map('map', { zoomControl: false, attributionControl: false }).setView([0, 0], 2);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd'
            }).addTo(map);
        }
    } catch(e) { console.error('Leaflet init failed', e); }

    try {
        const { SeiMetadata, enumFields: ef } = await DashcamHelpers.initProtobuf('lib/dashcam.proto');
        seiType = SeiMetadata;
        enumFields = ef;
    } catch (e) {
        console.error('Failed to init protobuf:', e);
        notify('Failed to initialize metadata parser. Make sure protobuf loads.', { type: 'error' });
    }

    // Clip Browser buttons
    chooseFolderBtn.onclick = (e) => { e.preventDefault(); folderInput.click(); };
    chooseFileBtn.onclick = (e) => { e.preventDefault(); fileInput.click(); };
    
    // Pi Connection
    if (overlayConnectPiBtn) {
        overlayConnectPiBtn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            if (piConnectModal) piConnectModal.style.display = 'flex';
        };
    }
    if (piCancelBtn) piCancelBtn.onclick = () => { if (piConnectModal) piConnectModal.style.display = 'none'; };
    if (piConnectConfirmBtn) piConnectConfirmBtn.onclick = connectToPi;
    
    // Load saved Pi config
    if (localStorage.getItem("piConfig")) {
        const saved = JSON.parse(localStorage.getItem("piConfig"));
        if(piIpInput) piIpInput.value = saved.ip || "";
        if(piUserInput) piUserInput.value = saved.user || "";
        if(piPassInput) piPassInput.value = saved.pass || "";
        if(piUseProxy) piUseProxy.checked = saved.useProxy || false;
    }

    // Panel layout mode
    const panelMode = createClipsPanelMode({ map, clipsDockToggleBtn, clipsCollapseBtn });
    panelMode.initClipsPanelMode();
    clipsDockToggleBtn.onclick = (e) => { e.preventDefault(); panelMode.toggleDockMode(); };
    clipsCollapseBtn.onclick = (e) => { e.preventDefault(); panelMode.toggleCollapsedMode(); };

    cameraSelect.onchange = () => {
        const g = selection.selectedGroupId ? library.clipGroupById.get(selection.selectedGroupId) : null;
        if (!g) return;
        if (multi.enabled) {
            multi.masterCamera = cameraSelect.value;
            reloadSelectedGroup();
        } else {
            selection.selectedCamera = cameraSelect.value;
            loadClipGroupCamera(g, selection.selectedCamera);
        }
    };

    multiCamToggle.onchange = () => {
        multi.enabled = !!multiCamToggle.checked;
        localStorage.setItem(MULTI_ENABLED_KEY, multi.enabled ? '1' : '0');
        if (multiLayoutSelect) multiLayoutSelect.disabled = !multi.enabled;
        reloadSelectedGroup();
    };

    dashboardToggle.onchange = () => {
        state.ui.dashboardEnabled = !!dashboardToggle.checked;
        localStorage.setItem(DASHBOARD_ENABLED_KEY, state.ui.dashboardEnabled ? '1' : '0');
        updateDashboardVisibility();
    };

    mapToggle.onchange = () => {
        state.ui.mapEnabled = !!mapToggle.checked;
        localStorage.setItem(MAP_ENABLED_KEY, state.ui.mapEnabled ? '1' : '0');
        updateMapVisibility();
    };

    const savedDashboard = localStorage.getItem(DASHBOARD_ENABLED_KEY);
    state.ui.dashboardEnabled = savedDashboard == null ? true : savedDashboard === '1';
    if (dashboardToggle) dashboardToggle.checked = state.ui.dashboardEnabled;

    const savedMap = localStorage.getItem(MAP_ENABLED_KEY);
    state.ui.mapEnabled = savedMap == null ? true : savedMap === '1';
    if (mapToggle) mapToggle.checked = state.ui.mapEnabled;

    updateDashboardVisibility();
    updateMapVisibility();

    multi.layoutId = localStorage.getItem(MULTI_LAYOUT_KEY) || DEFAULT_MULTI_LAYOUT;
    if (multiLayoutSelect) {
        multiLayoutSelect.value = multi.layoutId;
        multiLayoutSelect.onchange = () => {
            setMultiLayout(multiLayoutSelect.value || DEFAULT_MULTI_LAYOUT);
        };
    }

    if (layoutBtnImmersive) layoutBtnImmersive.onclick = (e) => { 
        e.preventDefault(); 
        if (multi.layoutId === 'immersive') { setMultiLayout('immersive_swap'); } else { setMultiLayout('immersive'); }
    };
    if (layoutBtnDefault) layoutBtnDefault.onclick = (e) => { e.preventDefault(); setMultiLayout('six_default'); };
    if (layoutBtnRepeatersTop) layoutBtnRepeatersTop.onclick = (e) => { e.preventDefault(); setMultiLayout('six_repeaters_top'); };
    updateMultiLayoutButtons();

    if (multiCamGrid) {
        multiCamGrid.addEventListener('click', (e) => {
            const tile = e.target.closest?.('.multi-tile') || e.target.closest?.('.immersive-overlay') || e.target.closest?.('.immersive-main');
            if (!tile) return;
            const slot = tile.getAttribute('data-slot');
            if (!slot) return;
            toggleMultiFocus(slot);
        });
    }

    // Recording Bindings
    if (saveClipBtn) {
        saveClipBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); recordingSettingsOverlay.style.display = 'flex'; };
    }
    if (closeRecModalBtn) closeRecModalBtn.onclick = () => recordingSettingsOverlay.style.display = 'none';
    if (cancelRecBtn) cancelRecBtn.onclick = () => recordingSettingsOverlay.style.display = 'none';
    if (startRecBtn) startRecBtn.onclick = startRecording;

    const savedMulti = localStorage.getItem(MULTI_ENABLED_KEY);
    multi.enabled = savedMulti == null ? !!multiCamToggle?.checked : savedMulti === '1';
    if (multiCamToggle) multiCamToggle.checked = multi.enabled;
    if (multiLayoutSelect) multiLayoutSelect.disabled = !multi.enabled;
})();

async function startRecording() {
    if (!player.frames || !player.frames.length) { notify("No video loaded to record.", {type: 'warn'}); return; }
    
    const durationVal = modalClipDuration.value;
    const title = modalClipTitle.value.trim() || "TeslaCam Clip";
    recordingSettingsOverlay.style.display = 'none';
    
    notify("Recording started... Please wait.", {type: 'info'});
    
    // Calculate duration in ms
    let durationMs = 0;
    if (durationVal === 'full') {
        const last = player.frames[player.frames.length - 1];
        durationMs = last.timestamp + last.duration; // total duration
        // Seek to start for full clip
        pause();
        progressBar.value = 0;
        showFrame(0);
    } else {
        durationMs = parseInt(durationVal) * 1000;
    }

    // Determine mime type
    let mimeType = "video/webm";
    if (MediaRecorder.isTypeSupported("video/mp4")) mimeType = "video/mp4";
    else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) mimeType = "video/webm;codecs=vp9";

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 15000000 }); // 15 Mbps
    const chunks = [];
    
    recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        a.download = `${title.replace(/[^a-z0-9]/gi, '_')}.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        notify("Recording saved!", {type: 'success'});
    };

    recorder.start();
    play(); // Start playback to feed the recorder

    // Stop recording after duration (or slightly after to ensure last frame)
    setTimeout(() => {
        if (recorder.state === 'recording') {
            recorder.stop();
            pause();
        }
    }, durationMs + 500); // 500ms buffer
}

async function connectToPi() {
    const ip = piIpInput.value.trim();
    const user = piUserInput.value.trim();
    const pass = piPassInput.value.trim();
    const useProxy = piUseProxy.checked;

    if (!ip) { notify("Please enter an IP address.", {type: 'error'}); return; }

    const config = { ip, user, pass, useProxy };
    localStorage.setItem("piConfig", JSON.stringify(config));
    
    if (piConnectModal) piConnectModal.style.display = 'none';
    notify("Connecting to Pi...", {type: 'info'});

    const authHeaders = {};
    if (user && pass) {
        authHeaders["Authorization"] = "Basic " + btoa(user + ":" + pass);
    }

    try {
        const baseUrl = ip.startsWith("http") ? ip : `http://${ip}`;
        let url = `${baseUrl}/cgi-bin/videolist.sh`;
        if (useProxy) {
            url = `http://localhost:8000/proxy?url=${encodeURIComponent(url)}`;
        }

        const response = await fetch(url, { headers: authHeaders });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const text = await response.text();
        processRemoteFileList(text, baseUrl, authHeaders, useProxy);

    } catch (error) {
        console.error("Connection failed:", error);
        notify(`Failed to connect: ${error.message}`, {type: 'error'});
    }
}

function processRemoteFileList(fileListText, baseUrl, authHeaders, useProxy) {
    const lines = fileListText.split("\n");
    const files = [];

    for (const lineRaw of lines) {
         const line = lineRaw.trim();
         if (!line) continue;
         // Expected format: Group/Sequence/Filename e.g. "SentryClips/2025-12-29_14-00-00/2025-12-29_14-00-00-front.mp4"
         const parts = line.split("/");
         if (parts.length < 3) continue;

         let fileUrl = `${baseUrl}/TeslaCam/${line}`;
         if (useProxy) fileUrl = `http://localhost:8000/proxy?url=${encodeURIComponent(fileUrl)}`;
         
         const filename = parts[parts.length - 1];
         // Create Virtual File
         const rf = new RemoteFile(filename, fileUrl, authHeaders);
         // Hint for folder structure
         rf._teslaPath = line; 
         // rf.webkitRelativePath = line; // Not strictly standard but we use _teslaPath
         
         files.push(rf);
    }
    
    if (files.length === 0) {
        notify("No files found on Pi.", {type: 'warn'});
        return;
    }
    
    handleFolderFiles(files, "Raspberry Pi");
}

// ... Rest of the script.js logic ...

function setMode(nextMode) {
    const normalized = (nextMode === 'collection') ? 'collection' : 'clip';
    if (state.mode === normalized) return;
    pause();
    closeEventPopout();
    clearMultiFocus();
    if (normalized === 'clip') {
        state.collection.active = null;
    } else {
        selection.selectedGroupId = null;
    }
    state.mode = normalized;
}

function setMultiLayout(layoutId) {
    const next = MULTI_LAYOUTS[layoutId] ? layoutId : DEFAULT_MULTI_LAYOUT;
    multi.layoutId = next;
    localStorage.setItem(MULTI_LAYOUT_KEY, next);
    if (multiLayoutSelect) multiLayoutSelect.value = next;
    updateMultiLayoutButtons();

    const layout = MULTI_LAYOUTS[next];
    if (multiCamGrid && layout) {
        multiCamGrid.setAttribute('data-columns', layout.columns || 3);
        if (layout.type === 'immersive') {
            multiCamGrid.setAttribute('data-layout-type', 'immersive');
            multiCamGrid.style.setProperty('--immersive-opacity', layout.overlayOpacity || 0.9);
        } else {
            multiCamGrid.removeAttribute('data-layout-type');
            multiCamGrid.style.removeProperty('--immersive-opacity');
        }
    }
    if (multi.enabled) reloadSelectedGroup();
}

function updateMultiLayoutButtons() {
    if (layoutBtnImmersive) {
        layoutBtnImmersive.classList.toggle('active', multi.layoutId === 'immersive' || multi.layoutId === 'immersive_swap');
        layoutBtnImmersive.classList.toggle('swapped', multi.layoutId === 'immersive_swap');
    }
    if (layoutBtnDefault) layoutBtnDefault.classList.toggle('active', multi.layoutId === 'six_default');
    if (layoutBtnRepeatersTop) layoutBtnRepeatersTop.classList.toggle('active', multi.layoutId === 'six_repeaters_top');
}

function clearMultiFocus() {
    state.ui.multiFocusSlot = null;
    if (!multiCamGrid) return;
    multiCamGrid.classList.remove('focused');
    multiCamGrid.removeAttribute('data-focus-slot');
}

function toggleMultiFocus(slot) {
    if (!multiCamGrid) return;
    if (state.ui.multiFocusSlot === slot) {
        clearMultiFocus();
        return;
    }
    state.ui.multiFocusSlot = slot;
    multiCamGrid.classList.add('focused');
    multiCamGrid.setAttribute('data-focus-slot', slot);
}

function updateDashboardVisibility() {
    if (!dashboardVis) return;
    dashboardVis.classList.toggle('user-hidden', !state.ui.dashboardEnabled);
}

function updateMapVisibility() {
    if (!mapVis) return;
    mapVis.classList.toggle('user-hidden', !state.ui.mapEnabled);
}

let isDragging = false;
let draggedEl = null;
const dragOffsets = new Map();
const dragHandleSelector = '.vis-header';
if (videoContainer) {
    videoContainer.addEventListener('mousedown', dragStart);
    videoContainer.addEventListener('mouseup', dragEnd);
    videoContainer.addEventListener('mousemove', drag);
    videoContainer.addEventListener('mouseleave', dragEnd);
}

function getDragOffset(el) {
    if (!dragOffsets.has(el)) dragOffsets.set(el, { x: 0, y: 0 });
    return dragOffsets.get(el);
}

function dragStart(e) {
    const handle = e.target.closest(dragHandleSelector);
    if (!handle) return;
    const el = handle.parentElement;
    if (el && (el.classList.contains('dashboard-vis') || el.classList.contains('map-vis'))) {
        draggedEl = el;
        isDragging = true;
        const offset = getDragOffset(el);
        el.dataset.startX = e.clientX - offset.x;
        el.dataset.startY = e.clientY - offset.y;
    }
}

function dragEnd(e) {
    isDragging = false;
    draggedEl = null;
}

function drag(e) {
    if (isDragging && draggedEl) {
        e.preventDefault();
        const startX = parseFloat(draggedEl.dataset.startX);
        const startY = parseFloat(draggedEl.dataset.startY);
        const currentX = e.clientX - startX;
        const currentY = e.clientY - startY;
        const offset = getDragOffset(draggedEl);
        offset.x = currentX;
        offset.y = currentY;
        setTranslate(currentX, currentY, draggedEl);
    }
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
}

dropOverlay.onclick = (e) => {
    if (e?.target?.closest?.('#overlayChooseFolderBtn, #overlayChooseFileBtn, #overlayConnectPiBtn')) return;
    folderInput.click();
};
overlayChooseFolderBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); folderInput.click(); };
overlayChooseFileBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); fileInput.click(); };
fileInput.onchange = e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) handleFile(f); };
folderInput.onchange = e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; if (!files.length) return; const root = getRootFolderNameFromWebkitRelativePath(files[0]?.webkitRelativePath); handleFolderFiles(files, root); };
dropOverlay.ondragover = e => { e.preventDefault(); dropOverlay.classList.add('hover'); };
dropOverlay.ondragleave = e => { dropOverlay.classList.remove('hover'); };
dropOverlay.ondrop = e => {
    e.preventDefault();
    dropOverlay.classList.remove('hover');
    const items = e.dataTransfer?.items;
    if (items?.length && window.DashcamHelpers?.getFilesFromDataTransfer) {
        DashcamHelpers.getFilesFromDataTransfer(items).then(({ files, directoryName }) => {
            if (files?.length > 1) { handleFolderFiles(files, directoryName); } else if (files?.length === 1) { handleFile(files[0]); } else if (e.dataTransfer?.files?.length) { handleFile(e.dataTransfer.files[0]); }
        }).catch(() => { if (e.dataTransfer?.files?.length) handleFile(e.dataTransfer.files[0]); });
        return;
    }
    if (e.dataTransfer?.files?.length) handleFile(e.dataTransfer.files[0]);
};

async function handleFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.mp4')) { notify('Please select a valid MP4 file.', { type: 'warn' }); return; }
    setMode('clip');
    clipBrowserSubtitle.textContent = selection.selectedGroupId ? clipBrowserSubtitle.textContent : 'Single MP4 loaded';
    library.folderLabel = library.folderLabel || null;
    pause();
    if (player.decoder) { try { player.decoder.close(); } catch { } player.decoder = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    dropOverlay.classList.add('hidden');
    dashboardVis.classList.remove('visible');
    mapVis.classList.remove('visible');
    playBtn.disabled = true;
    progressBar.disabled = true;
    try {
        if (multi.enabled && selection.selectedGroupId) {
            const g = library.clipGroupById.get(selection.selectedGroupId);
            if (g) { await loadMultiCamGroup(g, { configureTimeline: true, deferRender: false, autoplay: !!autoplayToggle?.checked }); return; }
        }
        await loadMp4IntoPlayer(file);
        player.firstKeyframe = player.frames.findIndex(f => f.keyframe);
        if (player.firstKeyframe === -1) throw new Error('No keyframes found in MP4');
        const config = player.mp4.getConfig();
        canvas.width = config.width;
        canvas.height = config.height;
        progressBar.min = 0;
        progressBar.max = player.frames.length - 1;
        progressBar.value = player.firstKeyframe;
        progressBar.step = 1;
        if (map) {
            mapPath = [];
            if (mapMarker) { mapMarker.remove(); mapMarker = null; }
            if (mapPolyline) { mapPolyline.remove(); mapPolyline = null; }
            mapPath = player.frames.filter(f => hasValidGps(f.sei)).map(f => [f.sei.latitude_deg, f.sei.longitude_deg]);
            if (mapPath.length > 0) {
                mapVis.classList.add('visible');
                setTimeout(() => { map.invalidateSize(); mapPolyline = L.polyline(mapPath, { color: '#3e9cbf', weight: 3, opacity: 0.7 }).addTo(map); map.fitBounds(mapPolyline.getBounds(), { padding: [20, 20] }); }, 100);
            }
        }
        playBtn.disabled = false;
        progressBar.disabled = false;
        dashboardVis.classList.add('visible');
        showFrame(player.firstKeyframe);
        if (autoplayToggle?.checked) { setTimeout(() => play(), 0); }
    } catch (err) {
        console.error(err);
        notify('Error loading file: ' + (err?.message || String(err)), { type: 'error' });
        dropOverlay.classList.remove('hidden');
    }
}

async function loadMp4IntoPlayer(file) {
    const buffer = await file.arrayBuffer();
    player.mp4 = new DashcamMP4(buffer);
    player.frames = player.mp4.parseFrames(seiType);
    player.lastDecodedFrameIndex = -1;
    player.seekTargetTimestamp = null;
    return { mp4: player.mp4, frames: player.frames };
}

function isMultiCamActive() { return multi.enabled && Array.from(multi.streams.values()).some(s => s.frames?.length); }

function setMultiCamGridVisible(visible) {
    if (!multiCamGrid) return;
    multiCamGrid.classList.toggle('hidden', !visible);
    canvas.classList.toggle('hidden', visible);
    if (!visible) clearMultiFocus();
}

function resetMultiStreams() {
    for (const s of multi.streams.values()) { try { s.decoder?.close?.(); } catch { } }
    multi.streams.clear();
}

async function reloadSelectedGroup() {
    const g = selection.selectedGroupId ? library.clipGroupById.get(selection.selectedGroupId) : null;
    if (!g) {
        setMultiCamGridVisible(false);
        // Clear all multi-cam canvases
        [canvasTL, canvasTC, canvasTR, canvasBL, canvasBC, canvasBR, canvasMain, canvasOverlayTL, canvasOverlayTR, canvasOverlayBL, canvasOverlayBC, canvasOverlayBR].forEach(c => { if (c && c.getContext) { const ctx = c.getContext('2d'); ctx.clearRect(0, 0, c.width, c.height); } });
        return;
    }
    pause();
    if (multi.enabled) {
        // If no cameras are available, show error and hide grid
        if (!g.filesByCamera || g.filesByCamera.size === 0) {
            setMultiCamGridVisible(false);
            notify('No cameras available for this group.', { type: 'error' });
            return;
        }
        setMultiCamGridVisible(true);
        await loadMultiCamGroup(g, { configureTimeline: true, deferRender: false, autoplay: !!autoplayToggle?.checked });
    } else {
        setMultiCamGridVisible(false);
        updateCameraSelect(g);
        const cam = selection.selectedCamera || (g.filesByCamera.has('front') ? 'front' : (g.filesByCamera.keys().next().value || 'front'));
        selection.selectedCamera = cam;
        cameraSelect.value = cam;
        loadClipGroupCamera(g, cam);
    }
}

function buildStream(camera, canvasEl) {
    return {
        camera, canvas: canvasEl, ctx: canvasEl?.getContext?.('2d') ?? null,
        file: null, buffer: null, mp4: null, frames: null, timestamps: null,
        firstKeyframe: 0, decoder: null, decoding: false, pendingFrame: null, hasSei: false,
        lastDecodedFrameIndex: -1, seekTargetTimestamp: null
    };
}

function streamSetFrames(stream, mp4Obj, framesArr, hasSei) {
    stream.mp4 = mp4Obj; stream.frames = framesArr; stream.timestamps = framesArr.map(f => f.timestamp);
    stream.firstKeyframe = framesArr.findIndex(f => f.keyframe); if (stream.firstKeyframe < 0) stream.firstKeyframe = 0;
    stream.hasSei = !!hasSei;
    const config = mp4Obj.getConfig();
    if (stream.canvas) { stream.canvas.width = config.width; stream.canvas.height = config.height; }
}

function findFrameIndexAtTime(stream, tMs) {
    const ts = stream.timestamps; if (!ts?.length) return 0;
    let lo = 0, hi = ts.length - 1;
    while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if (ts[mid] <= tMs) lo = mid; else hi = mid - 1; }
    return lo;
}

async function loadMultiCamGroup(group, opts = {}) {
    if (!seiType) throw new Error('Metadata parser not initialized');
    const configureTimeline = opts.configureTimeline !== false;
    const deferRender = !!opts.deferRender;
    const doAutoplay = opts.autoplay === true;
    const keepPlaying = !!opts.keepPlaying;

    resetMultiStreams();
    setMultiCamGridVisible(true);
    clearMultiFocus();

    const layout = MULTI_LAYOUTS[multi.layoutId] || MULTI_LAYOUTS[DEFAULT_MULTI_LAYOUT];
    const isImmersive = layout.type === 'immersive';
    const slotCanvases = { tl: canvasTL, tc: canvasTC, tr: canvasTR, bl: canvasBL, bc: canvasBC, br: canvasBR, main: canvasMain, overlay_tl: canvasOverlayTL, overlay_tr: canvasOverlayTR, overlay_bl: canvasOverlayBL, overlay_bc: canvasOverlayBC, overlay_br: canvasOverlayBR };

    if (multiCamGrid) {
        multiCamGrid.setAttribute('data-columns', layout.columns || 3);
        if (isImmersive) { multiCamGrid.setAttribute('data-layout-type', 'immersive'); multiCamGrid.style.setProperty('--immersive-opacity', layout.overlayOpacity || 0.9); } else { multiCamGrid.removeAttribute('data-layout-type'); multiCamGrid.style.removeProperty('--immersive-opacity'); }
    }
    
    try { for (const slotDef of layout.slots) {
        const tile = multiCamGrid.querySelector(`.multi-tile[data-slot="${cssEscape(slotDef.slot)}"]`) || multiCamGrid.querySelector(`.immersive-overlay[data-slot="${cssEscape(slotDef.slot)}"]`);
        const labelEl = tile?.querySelector?.('.multi-label'); if (labelEl && slotDef?.label) labelEl.textContent = slotDef.label;
    } } catch { }

    for (const sdef of layout.slots) {
        const cEl = slotCanvases[sdef.slot]; const stream = buildStream(sdef.camera, cEl); stream.slot = sdef.slot; multi.streams.set(sdef.slot, stream);
        if (stream.ctx) { stream.ctx.fillStyle = '#000'; stream.ctx.fillRect(0, 0, cEl.width || 1, cEl.height || 1); }
    }

    if (!group.filesByCamera.has(multi.masterCamera)) { multi.masterCamera = group.filesByCamera.has('front') ? 'front' : (group.filesByCamera.keys().next().value || 'front'); }
    updateCameraSelect(group); cameraSelect.value = multi.masterCamera;

    const loadPromises = [];
    for (const stream of multi.streams.values()) {
        const entry = group.filesByCamera.get(stream.camera); if (!entry?.file) continue;
        stream.file = entry.file;
        loadPromises.push((async () => {
            stream.buffer = await entry.file.arrayBuffer();
            const mp4Obj = new DashcamMP4(stream.buffer);
            const isMaster = stream.camera === multi.masterCamera;
            const framesArr = mp4Obj.parseFrames(isMaster ? seiType : null);
            streamSetFrames(stream, mp4Obj, framesArr, isMaster);
        })());
    }
    await Promise.all(loadPromises);

    const hasMaster = Array.from(multi.streams.values()).some(s => s.camera === multi.masterCamera && s.frames?.length);
    if (!hasMaster) {
        const entry = group.filesByCamera.get(multi.masterCamera) || group.filesByCamera.get('front') || group.filesByCamera.values().next().value;
        if (entry?.file) {
            const fallbackCanvas = isImmersive ? canvasMain : canvasTL;
            const temp = buildStream(multi.masterCamera, fallbackCanvas); temp.file = entry.file;
            temp.buffer = await entry.file.arrayBuffer();
            const mp4Obj = new DashcamMP4(temp.buffer);
            const framesArr = mp4Obj.parseFrames(seiType);
            streamSetFrames(temp, mp4Obj, framesArr, true);
            multi.streams.set('__master__', temp);
        }
    }

    const mStream = Array.from(multi.streams.values()).find(s => s.camera === multi.masterCamera && s.frames?.length) || multi.streams.get('__master__');
    if (!mStream?.frames?.length) throw new Error('Master camera failed to load');
    player.mp4 = mStream.mp4; player.frames = mStream.frames; player.firstKeyframe = mStream.firstKeyframe;

    if (!keepPlaying) pause();
    if (player.decoder) { try { player.decoder.close(); } catch { } player.decoder = null; }
    player.decoding = false; player.pendingFrame = null;
    playBtn.disabled = false; progressBar.disabled = false;
    dashboardVis.classList.add('visible'); dropOverlay.classList.add('hidden');

    if (configureTimeline) { progressBar.min = 0; progressBar.max = player.frames.length - 1; multi.masterTimeIndex = Math.max(player.firstKeyframe, 0); progressBar.value = multi.masterTimeIndex; progressBar.step = 1; }

    if (map) {
        mapPath = []; if (mapMarker) { mapMarker.remove(); mapMarker = null; } if (mapPolyline) { mapPolyline.remove(); mapPolyline = null; }
        mapPath = player.frames.filter(f => hasValidGps(f.sei)).map(f => [f.sei.latitude_deg, f.sei.longitude_deg]);
        if (mapPath.length > 0) {
            mapVis.classList.add('visible');
            setTimeout(() => { map.invalidateSize(); mapPolyline = L.polyline(mapPath, { color: '#3e9cbf', weight: 3, opacity: 0.7 }).addTo(map); map.fitBounds(mapPolyline.getBounds(), { padding: [20, 20] }); }, 100);
        } else { mapVis.classList.remove('visible'); }
    }

    // Render the first frame for all streams in the grid
    if (!deferRender) {
        for (const [slot, stream] of multi.streams.entries()) {
            if (stream.frames && stream.frames.length && stream.ctx) {
                const frame = stream.frames[stream.firstKeyframe] || stream.frames[0];
                if (frame && frame.imageBitmap) {
                    stream.ctx.clearRect(0, 0, stream.canvas.width, stream.canvas.height);
                    stream.ctx.drawImage(frame.imageBitmap, 0, 0, stream.canvas.width, stream.canvas.height);
                }
            }
        }
        const idx = configureTimeline ? multi.masterTimeIndex : Math.max(player.firstKeyframe, 0);
        showFrame(idx);
    }
    if (doAutoplay) setTimeout(() => play(), 0);
}

function getRootFolderNameFromWebkitRelativePath(relPath) {
    if (!relPath || typeof relPath !== 'string') return null;
    const parts = relPath.split('/').filter(Boolean);
    return parts.length ? parts[0] : null;
}

function getBestEffortRelPath(file, directoryName = null) {
    if (file?.webkitRelativePath) return file.webkitRelativePath;
    const p = file?._teslaPath; if (typeof p === 'string' && p.length) return p.startsWith('/') ? p.slice(1) : p;
    return directoryName ? `${directoryName}/${file.name}` : file.name;
}

function parseTeslaCamPath(relPath) {
    const norm = (relPath || '').replace(/\\/g, '/');
    const parts = norm.split('/').filter(Boolean);
    const teslaIdx = parts.findIndex(p => p.toLowerCase() === 'teslacam');
    const base = teslaIdx >= 0 ? parts.slice(teslaIdx) : parts;
    if (base.length >= 2 && base[0].toLowerCase() === 'teslacam') { return { tag: base[1], rest: base.slice(2) }; }
    if (parts.length >= 2) return { tag: parts[0], rest: parts.slice(1) };
    return { tag: 'Unknown', rest: parts.slice(1) };
}

function parseClipFilename(name) {
    const lower = name.toLowerCase();
    if (!lower.endsWith('.mp4') || lower === 'event.mp4') return null;
    const m = name.match(/^(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})-(.+)\.mp4$/i);
    if (!m) return null;
    return { timestampKey: `${m[1]}_${m[2]}`, camera: normalizeCamera(m[3]) };
}

function normalizeCamera(cameraRaw) {
    const c = (cameraRaw || '').toLowerCase();
    if (c === 'front') return 'front';
    if (c === 'back') return 'back';
    if (c === 'left_repeater' || c === 'left') return 'left_repeater';
    if (c === 'right_repeater' || c === 'right') return 'right_repeater';
    if (c === 'left_pillar') return 'left_pillar';
    if (c === 'right_pillar') return 'right_pillar';
    return c || 'unknown';
}

function cameraLabel(camera) {
    if (camera === 'front') return 'Front';
    if (camera === 'back') return 'Back';
    if (camera === 'left_repeater') return 'Left Rep';
    if (camera === 'right_repeater') return 'Right Rep';
    if (camera === 'left_pillar') return 'Left Pillar';
    if (camera === 'right_pillar') return 'Right Pillar';
    return camera;
}

function timestampLabel(timestampKey) {
    return (timestampKey || '').replace('_', ' ').replace(/-/g, (m, off, s) => m).replace(/(\d{4}-\d{2}-\d{2}) (\d{2})-(\d{2})-(\d{2})/, '$1 $2:$3:$4');
}

function parseTimestampKeyToEpochMs(timestampKey) {
    const m = String(timestampKey || '').match(/^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6], 0).getTime();
}

function buildDisplayItems() {
    const items = []; const sentryBuckets = new Map();
    for (const g of library.clipGroups) {
        if (g.tag?.toLowerCase() === 'sentryclips' && g.eventId) {
            const key = `${g.tag}/${g.eventId}`;
            if (!sentryBuckets.has(key)) sentryBuckets.set(key, []);
            sentryBuckets.get(key).push(g);
        } else { items.push({ type: 'group', id: g.id, group: g }); }
    }
    for (const [key, groups] of sentryBuckets.entries()) {
        groups.sort((a, b) => (a.timestampKey || '').localeCompare(b.timestampKey || ''));
        const [tag, eventId] = key.split('/'); const id = `sentry:${key}`;
        const startEpochMs = parseTimestampKeyToEpochMs(groups[0]?.timestampKey) ?? 0;
        const lastStart = parseTimestampKeyToEpochMs(groups[groups.length - 1]?.timestampKey) ?? startEpochMs;
        const endEpochMs = lastStart + 60_000;
        const durationMs = Math.max(1, endEpochMs - startEpochMs);
        const segmentStartsMs = groups.map(g => { const t = parseTimestampKeyToEpochMs(g.timestampKey) ?? startEpochMs; return Math.max(0, t - startEpochMs); });
        const meta = groups[0]?.eventMeta || (eventMetaByKey.get(key) ?? null);
        let anchorMs = null; let anchorGroupId = groups[0].id;
        if (meta?.timestamp) {
            const eventEpoch = Date.parse(meta.timestamp);
            if (Number.isFinite(eventEpoch)) {
                anchorMs = Math.max(0, Math.min(durationMs, eventEpoch - startEpochMs));
                let anchorIdx = 0;
                for (let i = 0; i < segmentStartsMs.length; i++) { if (segmentStartsMs[i] <= anchorMs) anchorIdx = i; }
                anchorGroupId = groups[anchorIdx]?.id || anchorGroupId;
            }
        }
        const sortEpoch = meta?.timestamp ? Date.parse(meta.timestamp) : lastStart;
        items.push({ type: 'collection', id, sortEpoch: Number.isFinite(sortEpoch) ? sortEpoch : lastStart, collection: { id, key, tag, eventId, groups, meta, durationMs, segmentStartsMs, anchorMs, anchorGroupId } });
    }
    items.sort((a, b) => {
        const ta = a.type === 'collection' ? (a.sortEpoch ?? 0) : (parseTimestampKeyToEpochMs(a.group.timestampKey) ?? 0);
        const tb = b.type === 'collection' ? (b.sortEpoch ?? 0) : (parseTimestampKeyToEpochMs(b.group.timestampKey) ?? 0);
        return tb - ta;
    });
    return items;
}

function buildTeslaCamIndex(files, directoryName = null) {
    const groups = new Map(); let inferredRoot = directoryName || null; const eventAssetsByKey = new Map();
    for (const file of files) {
        const relPath = getBestEffortRelPath(file, directoryName); const { tag, rest } = parseTeslaCamPath(relPath);
        const filename = rest[rest.length - 1] || file.name; const lowerName = String(filename || '').toLowerCase();
        if (tag.toLowerCase() === 'sentryclips' && rest.length >= 2 && (lowerName === 'event.json' || lowerName === 'event.png' || lowerName === 'event.mp4')) {
            const eventId = rest[0]; const key = `${tag}/${eventId}`;
            if (!eventAssetsByKey.has(key)) eventAssetsByKey.set(key, {});
            const entry = eventAssetsByKey.get(key);
            if (lowerName === 'event.json') entry.jsonFile = file; if (lowerName === 'event.png') entry.pngFile = file; if (lowerName === 'event.mp4') entry.mp4File = file;
            continue;
        }
        const parsed = parseClipFilename(filename); if (!parsed) continue;
        let eventId = null; if (tag.toLowerCase() === 'sentryclips' && rest.length >= 2) { eventId = rest[0]; }
        const groupId = `${tag}/${eventId ? eventId + '/' : ''}${parsed.timestampKey}`;
        if (!groups.has(groupId)) { groups.set(groupId, { id: groupId, tag, eventId, timestampKey: parsed.timestampKey, filesByCamera: new Map(), bestRelPathHint: relPath, eventMeta: null, eventJsonFile: null, eventPngFile: null, eventMp4File: null }); }
        const g = groups.get(groupId); g.filesByCamera.set(parsed.camera, { file, relPath, tag, eventId, timestampKey: parsed.timestampKey, camera: parsed.camera });
        if (!inferredRoot && relPath) inferredRoot = relPath.split('/')[0] || null;
    }
    for (const g of groups.values()) {
        if (!g.eventId) continue; const key = `${g.tag}/${g.eventId}`; const assets = eventAssetsByKey.get(key); if (!assets) continue;
        g.eventJsonFile = assets.jsonFile || null; g.eventPngFile = assets.pngFile || null; g.eventMp4File = assets.mp4File || null;
    }
    const arr = Array.from(groups.values()); arr.sort((a, b) => (b.timestampKey || '').localeCompare(a.timestampKey || ''));
    return { groups: arr, inferredRoot, eventAssetsByKey };
}

function handleFolderFiles(fileList, directoryName = null) {
    if (!seiType) { notify('Metadata parser not initialized yet—try again in a second.', { type: 'warn' }); return; }
    const files = (Array.isArray(fileList) ? fileList : Array.from(fileList)).filter(f => { const n = f?.name?.toLowerCase?.() || ''; return n.endsWith('.mp4') || n.endsWith('.json') || n.endsWith('.png'); });
    if (!files.length) { notify('No supported files found in that folder.', { type: 'warn' }); return; }
    const built = buildTeslaCamIndex(files, directoryName);
    library.clipGroups = built.groups; library.clipGroupById = new Map(library.clipGroups.map(g => [g.id, g])); library.folderLabel = built.inferredRoot || directoryName || 'Folder';
    selection.selectedGroupId = null; state.collection.active = null; previews.cache.clear(); previews.queue.length = 0; previews.inFlight = 0; state.ui.openEventRowId = null;
    clipBrowserSubtitle.textContent = `${library.folderLabel}: ${library.clipGroups.length} clip group${library.clipGroups.length === 1 ? '' : 's'}`;
    renderClipList();
    if (library.clipGroups.length) { const items = buildDisplayItems(); const first = items[0]; if (first?.type === 'collection') selectSentryCollection(first.id); else if (first?.type === 'group') selectClipGroup(first.id); }
    dropOverlay.classList.add('hidden');
    ingestSentryEventJson(built.eventAssetsByKey);
}

function renderClipList() {
    clipList.innerHTML = '';
    if (!library.clipGroups.length) return;
    if (previews.observer) { try { previews.observer.disconnect(); } catch { } previews.observer = null; }
    const items = buildDisplayItems();
    for (const it of items) {
        const isCollection = it.type === 'collection'; const g = isCollection ? null : it.group; const c = isCollection ? it.collection : null;
        const item = document.createElement('div'); item.className = 'clip-item'; item.dataset.groupid = isCollection ? c.id : g.id; item.dataset.type = it.type;
        if (isCollection && c.anchorGroupId) item.dataset.previewGroupid = c.anchorGroupId;
        const cameras = isCollection ? Array.from((c.groups[0]?.filesByCamera?.keys?.() ?? [])) : Array.from(g.filesByCamera.keys());
        const hasEventAssets = isCollection ? !!(c.meta || c.groups[0]?.eventJsonFile) : !!(g.eventJsonFile || g.eventMeta);
        const badges = isCollection ? [`<span class="badge">${escapeHtml(c.tag)}</span>`, `<span class="badge muted">${escapeHtml(c.eventId)}</span>`, `<span class="badge muted">${c.groups.length} segments</span>`].join('') : [`<span class="badge">${escapeHtml(g.tag)}</span>`, g.eventId ? `<span class="badge muted">${escapeHtml(g.eventId)}</span>` : '', `<span class="badge muted">${cameras.length} cam</span>`].join('');
        const title = isCollection ? `${c.eventId}` : timestampLabel(g.timestampKey);
        const subline = isCollection ? `${c.groups.length} segments · ${Math.max(1, cameras.length)} cam` : cameras.map(cameraLabel).join(' · ');
        const markerLeft = (isCollection && c.anchorMs != null) ? Math.round((c.anchorMs / c.durationMs) * 1000) / 10 : null;
        item.innerHTML = `
            <div class="clip-media">
                <div class="clip-thumb"><img alt="" /></div>
                <canvas class="clip-minimap" width="112" height="63"></canvas>
            </div>
            <div class="clip-meta">
                <div class="clip-title">${escapeHtml(title)}</div>
                <div class="clip-badges">${badges}
                    ${hasEventAssets ? `<button class="event-btn" type="button" title="Event details"><svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 4a1.2 1.2 0 1 1 0 2.4A1.2 1.2 0 0 1 12 6zm-1.3 5.1h2.6V18h-2.6v-6.9z"></path></svg></button>` : ''}
                </div>
                <div class="clip-sub"><div>${escapeHtml(subline)}</div>${markerLeft != null ? `<div class="timeline-bar" title="Event time"><div class="timeline-marker" style="left:${markerLeft}%"></div></div>` : ''}</div>
            </div>
            <div class="event-pop"><div class="event-pop-header"><div class="event-pop-title">Event</div><button class="event-close">✕</button></div><div class="event-kv"></div></div>`;
        item.onclick = () => isCollection ? selectSentryCollection(c.id) : selectClipGroup(g.id);
        const eventBtn = item.querySelector('.event-btn'); if (eventBtn) { eventBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); if (isCollection) { toggleEventPopout(c.id, c.meta || null); } else { toggleEventPopout(g.id); } }; }
        const closeBtn = item.querySelector('.event-close'); if (closeBtn) { closeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); closeEventPopout(); }; }
        clipList.appendChild(item);
    }
    previews.observer = new IntersectionObserver((entries) => { for (const entry of entries) { if (!entry.isIntersecting) continue; const el = entry.target; const type = el.dataset.type; const groupId = el.dataset.groupid; const previewGroupId = el.dataset.previewGroupid; if (type === 'collection' && previewGroupId) ensureGroupPreview(previewGroupId); else if (type === 'group' && groupId) ensureGroupPreview(groupId); } }, { root: clipList, threshold: 0.2 });
    for (const el of clipList.querySelectorAll('.clip-item')) { previews.observer.observe(el); }
    highlightSelectedClip();
}

document.addEventListener('click', (e) => { if (!state.ui.openEventRowId) return; const openEl = clipList?.querySelector?.(`.clip-item[data-groupid="${cssEscape(state.ui.openEventRowId)}"]`); if (!openEl) { state.ui.openEventRowId = null; return; } if (openEl.contains(e.target)) return; closeEventPopout(); });

function closeEventPopout() {
    if (!state.ui.openEventRowId) return;
    const el = clipList?.querySelector?.(`.clip-item[data-groupid="${cssEscape(state.ui.openEventRowId)}"]`);
    if (el) el.classList.remove('event-open');
    state.ui.openEventRowId = null;
}

function toggleEventPopout(rowId, metaOverride = null) {
    if (state.ui.openEventRowId && state.ui.openEventRowId !== rowId) closeEventPopout();
    const el = clipList?.querySelector?.(`.clip-item[data-groupid="${cssEscape(rowId)}"]`);
    if (!el) return;
    const opening = !el.classList.contains('event-open');
    if (!opening) { closeEventPopout(); return; }
    const meta = metaOverride ?? (library.clipGroupById.get(rowId)?.eventMeta || null);
    populateEventPopout(el, meta);
    el.classList.add('event-open');
    state.ui.openEventRowId = rowId;
}

function populateEventPopout(rowEl, meta) {
    const kv = rowEl.querySelector('.event-kv'); if (!kv) return; kv.innerHTML = '';
    if (!meta) { const kEl = document.createElement('div'); kEl.className = 'k'; kEl.textContent = 'status'; const vEl = document.createElement('div'); vEl.className = 'v'; vEl.textContent = 'Loading event.json…'; kv.appendChild(kEl); kv.appendChild(vEl); return; }
    const preferred = ['timestamp', 'reason', 'camera', 'city', 'street', 'est_lat', 'est_lon'];
    const keys = [...preferred.filter(k => meta[k] != null), ...Object.keys(meta).filter(k => !preferred.includes(k))];
    for (const k of keys) { const v = meta[k]; const kEl = document.createElement('div'); kEl.className = 'k'; kEl.textContent = k; const vEl = document.createElement('div'); vEl.className = 'v'; vEl.textContent = String(v); kv.appendChild(kEl); kv.appendChild(vEl); }
}

function highlightSelectedClip() { for (const el of clipList.querySelectorAll('.clip-item')) { el.classList.toggle('selected', el.dataset.groupid === selection.selectedGroupId || el.dataset.groupid === state.collection.active?.id); } }

function selectClipGroup(groupId) {
    const g = library.clipGroupById.get(groupId); if (!g) return;
    setMode('clip'); selection.selectedGroupId = groupId; highlightSelectedClip(); progressBar.step = 1;
    const defaultCam = g.filesByCamera.has('front') ? 'front' : (g.filesByCamera.keys().next().value || 'front');
    selection.selectedCamera = defaultCam; multi.masterCamera = multi.masterCamera || defaultCam;
    if (!g.filesByCamera.has(multi.masterCamera)) multi.masterCamera = defaultCam;
    updateCameraSelect(g); cameraSelect.value = multi.enabled ? multi.masterCamera : selection.selectedCamera;
    reloadSelectedGroup(); ensureGroupPreview(groupId, { highPriority: true });
}

function selectSentryCollection(collectionId) {
    const items = buildDisplayItems(); const it = items.find(x => x.type === 'collection' && x.id === collectionId); if (!it) return;
    const c = it.collection; setMode('collection'); pause();
    state.collection.active = { ...c, currentSegmentIdx: -1, currentGroupId: null, currentLocalFrameIdx: 0, loadToken: 0 };
    highlightSelectedClip(); progressBar.min = 0; progressBar.max = Math.floor(state.collection.active.durationMs); progressBar.step = 1; progressBar.value = Math.floor(state.collection.active.anchorMs ?? 0);
    playBtn.disabled = false; progressBar.disabled = false;
    const startMs = state.collection.active.anchorMs ?? 0;
    showCollectionAtMs(startMs).then(() => { if (autoplayToggle?.checked) setTimeout(() => play(), 0); }).catch(() => { });
}

function updateCameraSelect(group) {
    const cams = Array.from(group.filesByCamera.keys()); cameraSelect.innerHTML = '';
    const ordered = ['front', 'back', 'left_repeater', 'right_repeater', 'left_pillar', 'right_pillar', ...cams];
    const seen = new Set();
    for (const cam of ordered) {
        if (seen.has(cam)) continue; seen.add(cam); if (!group.filesByCamera.has(cam)) continue;
        const opt = document.createElement('option'); opt.value = cam; opt.textContent = cameraLabel(cam); cameraSelect.appendChild(opt);
    }
    cameraSelect.disabled = cameraSelect.options.length === 0; cameraSelect.value = selection.selectedCamera;
}

async function ingestSentryEventJson(eventAssetsByKey) {
    if (!eventAssetsByKey || eventAssetsByKey.size === 0) return;
    for (const [key, assets] of eventAssetsByKey.entries()) {
        if (!assets?.jsonFile) continue;
        try {
            const text = await assets.jsonFile.text(); const meta = JSON.parse(text); eventMetaByKey.set(key, meta);
            const [tag, eventId] = key.split('/'); for (const g of library.clipGroups) { if (g.tag === tag && g.eventId === eventId) g.eventMeta = meta; }
            renderClipList(); if (state.ui.openEventRowId) { const el = clipList?.querySelector?.(`.clip-item[data-groupid="${cssEscape(state.ui.openEventRowId)}"]`); if (el?.classList?.contains('event-open')) populateEventPopout(el, meta); }
        } catch { }
    }
}

function loadClipGroupCamera(group, camera) {
    const entry = group.filesByCamera.get(camera) || group.filesByCamera.get('front') || group.filesByCamera.values().next().value;
    if (!entry?.file) return;
    handleFile(entry.file);
}

async function loadSingleGroup(group, camera, opts = {}) {
    const configureTimeline = opts.configureTimeline !== false;
    const deferRender = !!opts.deferRender;
    const doAutoplay = opts.autoplay === true;
    const keepPlaying = !!opts.keepPlaying;

    const entry = group.filesByCamera.get(camera) || group.filesByCamera.get('front') || group.filesByCamera.values().next().value;
    if (!entry?.file) throw new Error('Camera file not found');

    if (!keepPlaying) pause();
    if (player.decoder) { try { player.decoder.close(); } catch { } player.decoder = null; }
    player.decoding = false;
    player.pendingFrame = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    dropOverlay.classList.add('hidden');
    dashboardVis.classList.remove('visible');
    mapVis.classList.remove('visible');
    playBtn.disabled = true;
    progressBar.disabled = true;

    await loadMp4IntoPlayer(entry.file);
    player.firstKeyframe = player.frames.findIndex(f => f.keyframe);
    if (player.firstKeyframe === -1) throw new Error('No keyframes found in MP4');

    const config = player.mp4.getConfig();
    canvas.width = config.width;
    canvas.height = config.height;

    if (configureTimeline) {
        progressBar.min = 0;
        progressBar.max = player.frames.length - 1;
        progressBar.value = Math.max(player.firstKeyframe, 0);
    }

    if (map) {
        mapPath = [];
        if (mapMarker) { mapMarker.remove(); mapMarker = null; }
        if (mapPolyline) { mapPolyline.remove(); mapPolyline = null; }

        mapPath = player.frames
            .filter(f => hasValidGps(f.sei))
            .map(f => [f.sei.latitude_deg, f.sei.longitude_deg]);

        if (mapPath.length > 0) {
            mapVis.classList.add('visible');
            setTimeout(() => {
                map.invalidateSize();
                mapPolyline = L.polyline(mapPath, { color: '#3e9cbf', weight: 3, opacity: 0.7 }).addTo(map);
                map.fitBounds(mapPolyline.getBounds(), { padding: [20, 20] });
            }, 100);
        }
    }

    playBtn.disabled = false;
    progressBar.disabled = false;
    dashboardVis.classList.add('visible');

    if (!deferRender) {
        showFrame(Math.max(player.firstKeyframe, 0));
    }
    if (doAutoplay) setTimeout(() => play(), 0);
}

function ensureGroupPreview(groupId, opts = {}) {
    const existing = previews.cache.get(groupId);
    if (existing?.status === 'ready' || existing?.status === 'loading' || existing?.status === 'queued') return;
    previews.cache.set(groupId, { status: 'queued' });

    const task = async () => {
        previews.cache.set(groupId, { ...(previews.cache.get(groupId) || {}), status: 'loading' });
        const group = library.clipGroupById.get(groupId);
        if (!group) return;

        const entry = group.filesByCamera.get('front') || group.filesByCamera.values().next().value;
        if (!entry?.file) return;

        let pathPoints = null;
        let buffer = null;
        try {
            buffer = await entry.file.arrayBuffer();
            const pmp4 = new DashcamMP4(buffer);
            const messages = pmp4.extractSeiMessages(seiType);
            const pts = [];
            for (const m of messages) {
                if (!hasValidGps(m)) continue;
                pts.push([m.latitude_deg, m.longitude_deg]);
            }
            pathPoints = downsamplePoints(pts, 120);
        } catch { }

        let thumbDataUrl = null;
        if (group.eventPngFile) {
            try { thumbDataUrl = await fileToDataUrl(group.eventPngFile); } catch { }
        }
        try {
            if (!thumbDataUrl) thumbDataUrl = await captureVideoThumbnail(entry.file, 112, 63);
        } catch { }
        if (!thumbDataUrl && buffer) {
            try {
                thumbDataUrl = await captureWebcodecsThumbnailFromMp4Buffer(buffer, 112, 63);
            } catch { }
        }

        previews.cache.set(groupId, { status: 'ready', thumbDataUrl, pathPoints });
        applyGroupPreviewToRow(groupId);
    };

    if (opts.highPriority) previews.queue.unshift(task);
    else previews.queue.push(task);
    pumpPreviewQueue();
}

function pumpPreviewQueue() {
    while (previews.inFlight < previews.maxConcurrency && previews.queue.length) {
        const task = previews.queue.shift();
        previews.inFlight++;
        Promise.resolve().then(task).catch(() => { }).finally(() => { previews.inFlight--; pumpPreviewQueue(); });
    }
}

function applyGroupPreviewToRow(groupId) {
    const preview = previews.cache.get(groupId);
    if (!preview || preview.status !== 'ready') return;
    const rows = [...clipList.querySelectorAll(`.clip-item[data-groupid="${cssEscape(groupId)}"]`), ...clipList.querySelectorAll(`.clip-item[data-preview-groupid="${cssEscape(groupId)}"]`)];
    for (const el of rows) {
        const img = el.querySelector('.clip-thumb img'); if (img && preview.thumbDataUrl) img.src = preview.thumbDataUrl;
        const canvasEl = el.querySelector('canvas.clip-minimap'); if (canvasEl && preview.pathPoints?.length) { drawMiniPath(canvasEl, preview.pathPoints); }
    }
}

function downsamplePoints(points, maxPoints) {
    if (!Array.isArray(points) || points.length <= maxPoints) return points;
    const step = points.length / maxPoints; const out = [];
    for (let i = 0; i < maxPoints; i++) out.push(points[Math.floor(i * step)]);
    return out;
}

function drawMiniPath(canvasEl, points) {
    const c = canvasEl.getContext('2d'); const w = canvasEl.width, h = canvasEl.height; c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 0, w, h);
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    for (const [lat, lon] of points) { minLat = Math.min(minLat, lat); maxLat = Math.max(maxLat, lat); minLon = Math.min(minLon, lon); maxLon = Math.max(maxLon, lon); }
    const pad = 6; const dy = (maxLat - minLat) || 1e-9;
    const meanLat = (minLat + maxLat) / 2; const lonScale = Math.cos((meanLat * Math.PI) / 180) || 1;
    const minLonAdj = minLon * lonScale; const maxLonAdj = maxLon * lonScale; const dx = (maxLonAdj - minLonAdj) || 1e-9;
    const availW = Math.max(1, w - pad * 2); const availH = Math.max(1, h - pad * 2); const scale = Math.min(availW / dx, availH / dy);
    const contentW = dx * scale; const contentH = dy * scale; const offX = (w - contentW) / 2; const offY = (h - contentH) / 2;
    const project = (lat, lon) => { const x = offX + ((lon * lonScale - minLonAdj) * scale); const y = offY + ((maxLat - lat) * scale); return [x, y]; };
    c.strokeStyle = 'rgba(62, 156, 191, 0.95)'; c.lineWidth = 2; c.beginPath();
    points.forEach(([lat, lon], idx) => { const [x, y] = project(lat, lon); if (idx === 0) c.moveTo(x, y); else c.lineTo(x, y); });
    c.stroke();
    const [sLat, sLon] = points[0]; const [eLat, eLon] = points[points.length - 1];
    const [sx, sy] = project(sLat, sLon); const [ex, ey] = project(eLat, eLon);
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.arc(sx, sy, 2.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255, 0, 0, 0.85)'; c.beginPath(); c.arc(ex, ey, 2.5, 0, Math.PI * 2); c.fill();
}

async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader(); reader.onerror = () => reject(new Error('FileReader failed')); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(file);
    });
}

async function captureVideoThumbnail(file, width, height) {
    const url = URL.createObjectURL(file);
    try {
        const video = document.createElement('video'); video.muted = true; video.playsInline = true; video.preload = 'auto'; video.src = url;
        await new Promise((resolve, reject) => { const onError = () => reject(new Error('video load failed')); video.addEventListener('error', onError, { once: true }); video.addEventListener('loadedmetadata', () => resolve(), { once: true }); try { video.load(); } catch { } });
        const seekTo = (() => { const d = Number.isFinite(video.duration) ? video.duration : 0; if (d > 0) return Math.min(0.5, Math.max(0.05, d * 0.05)); return 0.1; })();
        try { video.currentTime = seekTo; await new Promise((resolve) => video.addEventListener('seeked', resolve, { once: true })); } catch { }
        if (video.requestVideoFrameCallback) { await new Promise((resolve) => video.requestVideoFrameCallback(() => resolve())); } else { await new Promise((resolve, reject) => { const onError = () => reject(new Error('video decode failed')); video.addEventListener('error', onError, { once: true }); video.addEventListener('canplay', () => resolve(), { once: true }); setTimeout(resolve, 250); }); }
        const c = document.createElement('canvas'); c.width = width; c.height = height; const cctx = c.getContext('2d');
        if (!video.videoWidth || !video.videoHeight) throw new Error('video has no decoded frame');
        cctx.drawImage(video, 0, 0, width, height);
        return c.toDataURL('image/jpeg', 0.72);
    } finally { URL.revokeObjectURL(url); }
}

async function captureWebcodecsThumbnailFromMp4Buffer(buffer, width, height) {
    if (!window.VideoDecoder) throw new Error('VideoDecoder not available');
    const localMp4 = new DashcamMP4(buffer);
    const localFrames = localMp4.parseFrames(null);
    const firstKeyIdx = localFrames.findIndex(f => f.keyframe);
    if (firstKeyIdx < 0) throw new Error('No keyframe found');
    const config = localMp4.getConfig(); const frame = localFrames[firstKeyIdx];
    const sc = new Uint8Array([0, 0, 0, 1]);
    const data = frame.keyframe ? DashcamMP4.concat(sc, frame.sps || config.sps, sc, frame.pps || config.pps, sc, frame.data) : DashcamMP4.concat(sc, frame.data);
    const canvasEl = document.createElement('canvas'); canvasEl.width = width; canvasEl.height = height; const cctx = canvasEl.getContext('2d');
    const decoder = new VideoDecoder({ output: (vf) => { try { cctx.drawImage(vf, 0, 0, width, height); } finally { vf.close(); } }, error: () => { } });
    decoder.configure({ codec: config.codec, width: config.width, height: config.height });
    decoder.decode(new EncodedVideoChunk({ type: 'key', timestamp: 0, data }));
    await decoder.flush();
    try { decoder.close(); } catch { }
    return canvasEl.toDataURL('image/jpeg', 0.72);
}

playBtn.onclick = () => player.playing ? pause() : play();
function previewAtSliderValue() {
    pause();
    if (state.collection.active) {
        const quantum = 100; const raw = +progressBar.value || 0; const snapped = Math.round(raw / quantum) * quantum; progressBar.value = String(snapped);
        if (state.ui.collectionScrubPreviewTimer) clearTimeout(state.ui.collectionScrubPreviewTimer);
        state.ui.collectionScrubPreviewTimer = setTimeout(() => { state.ui.collectionScrubPreviewTimer = null; showCollectionAtMs(snapped); }, 120);
    } else { showFrame(+progressBar.value); }
}

function maybeAutoplayAfterSeek() {
    if (!autoplayToggle?.checked) return;
    if (state.ui.isScrubbing) return;
    setTimeout(() => play(), 0);
}

progressBar.addEventListener('input', () => { previewAtSliderValue(); });
progressBar.addEventListener('change', () => {
    state.ui.isScrubbing = false;
    if (state.ui.collectionScrubPreviewTimer) { clearTimeout(state.ui.collectionScrubPreviewTimer); state.ui.collectionScrubPreviewTimer = null; }
    if (state.collection.active) {
        pause(); const quantum = 100; const raw = +progressBar.value || 0; const snapped = Math.round(raw / quantum) * quantum; progressBar.value = String(snapped);
        showCollectionAtMs(snapped).then(() => maybeAutoplayAfterSeek()).catch(() => { });
        return;
    }
    previewAtSliderValue(); maybeAutoplayAfterSeek();
});
progressBar.addEventListener('pointerdown', () => { state.ui.isScrubbing = true; });
progressBar.addEventListener('pointerup', () => { state.ui.isScrubbing = false; maybeAutoplayAfterSeek(); });
progressBar.addEventListener('pointercancel', () => { state.ui.isScrubbing = false; });

document.addEventListener('keydown', (e) => {
    if (!player.frames && !state.collection.active) return;
    const activeEl = document.activeElement;
    const isInteractive = activeEl && (activeEl.tagName === 'BUTTON' || activeEl.tagName === 'INPUT' || activeEl.tagName === 'SELECT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable);
    if (e.code === 'Space') { if (isInteractive) return; e.preventDefault(); player.playing ? pause() : play(); }
    else if (e.code === 'Escape') { if (state.ui.openEventRowId) { e.preventDefault(); closeEventPopout(); } else if (state.ui.multiFocusSlot) { e.preventDefault(); clearMultiFocus(); } }
    else if (e.code === 'ArrowLeft') {
        pause();
        if (state.collection.active) { const prev = Math.max(0, +progressBar.value - 1000); progressBar.value = prev; showCollectionAtMs(prev); maybeAutoplayAfterSeek(); }
        else { const prev = Math.max(0, +progressBar.value - 15); progressBar.value = prev; showFrame(prev); maybeAutoplayAfterSeek(); }
    } else if (e.code === 'ArrowRight') {
        pause();
        if (state.collection.active) { const next = Math.min(+progressBar.max, +progressBar.value + 1000); progressBar.value = next; showCollectionAtMs(next); maybeAutoplayAfterSeek(); }
        else { const next = Math.min(player.frames.length - 1, +progressBar.value + 15); progressBar.value = next; showFrame(next); maybeAutoplayAfterSeek(); }
    }
});

function play() {
    if (player.playing) return;
    if (!player.frames || !player.frames.length) {
        if (state.collection.active) {
            player.playing = true; updatePlayButton();
            showCollectionAtMs(+progressBar.value || 0).then(() => { if (player.playing) playNext(); }).catch(() => { pause(); });
            // Resume blinker animation if needed
            if ((blinkerState.left || blinkerState.right) && !blinkerState.interval) {
                updateBlinkerInterval();
            }
            return;
        }
        return;
    }
    player.playing = true; updatePlayButton();
    player.nextFrameTime = performance.now();
    playNext();
    // Resume blinker animation if needed
    if ((blinkerState.left || blinkerState.right) && !blinkerState.interval) {
        updateBlinkerInterval();
    }
}

function pause() {
    player.playing = false; updatePlayButton();
    if (player.playTimer) { clearTimeout(player.playTimer); player.playTimer = null; }
    if (player.decoder && player.decoder.state === 'configured') { player.decoder.flush().catch(() => {}); }
    // Pause blinker animation
    if (blinkerState.interval) {
        clearInterval(blinkerState.interval);
        blinkerState.interval = null;
    }
}

function updatePlayButton() {
    playBtn.innerHTML = player.playing 
        ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
        : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
}

function playNext() {
    if (!player.playing) return;
    if (state.collection.active) {
        if (player.playTimer) { clearTimeout(player.playTimer); player.playTimer = null; }
        if (state.collection.active.loading) { player.playTimer = setTimeout(playNext, 20); player.nextFrameTime = performance.now(); return; }
        const currentMs = +progressBar.value;
        const idx = Math.min(Math.max(state.collection.active.currentLocalFrameIdx || 0, 0), (player.frames?.length || 1) - 1);
        const frameDur = player.frames?.[idx]?.duration || 33;
        const nextMs = currentMs + frameDur;
        if (nextMs > +progressBar.max) { pause(); return; }
        progressBar.value = Math.floor(nextMs);
        player.nextFrameTime += frameDur;
        const now = performance.now();
        let delay = player.nextFrameTime - now;
        if (delay < -100) { player.nextFrameTime = now; delay = 0; }
        showCollectionAtMs(nextMs).then(() => { if (!player.playing) return; player.playTimer = setTimeout(playNext, Math.max(0, delay)); }).catch(() => pause());
        return;
    }

    let next = +progressBar.value + 1;
    if (!player.frames || next >= player.frames.length) { pause(); return; }
    if (player.decoder && player.decoder.decodeQueueSize > 15) { player.playTimer = setTimeout(playNext, 10); return; }
    progressBar.value = next; showFrame(next);
    const frameDur = player.frames[next].duration || 33;
    player.nextFrameTime += frameDur;
    const now = performance.now();
    let delay = player.nextFrameTime - now;
    if (delay < -100) { player.nextFrameTime = now; delay = 0; }
    player.playTimer = setTimeout(playNext, Math.max(0, delay));
}

function showFrame(index) {
    if (!player.frames?.[index]) return;
    updateVisualization(player.frames[index].sei);
    updateTimeDisplay(index);
    if (isMultiCamActive()) {
        const t = player.frames[index].timestamp;
        for (const stream of multi.streams.values()) {
            if (stream.slot === '__master__') continue;
            if (!stream?.frames?.length || !stream.ctx) continue;
            const idx = findFrameIndexAtTime(stream, t);
            streamShowFrame(stream, idx);
        }
        return;
    }
    if (player.decoding) { player.pendingFrame = index; } else { decodeFrame(index); }
}

function findFrameIndexAtLocalMs(localMs) {
    if (!player.frames?.length) return 0;
    let lo = 0, hi = player.frames.length - 1;
    while (lo < hi) { const mid = Math.floor((lo + hi + 1) / 2); if ((player.frames[mid].timestamp || 0) <= localMs) lo = mid; else hi = mid - 1; }
    return lo;
}

async function showCollectionAtMs(ms) {
    if (!state.collection.active) return;
    const token = ++state.collection.active.loadToken;
    const clamped = Math.max(0, Math.min(state.collection.active.durationMs, ms));
    const starts = state.collection.active.segmentStartsMs;
    let segIdx = 0; for (let i = 0; i < starts.length; i++) { if (starts[i] <= clamped) segIdx = i; else break; }
    const segStart = starts[segIdx] || 0; const localMs = Math.max(0, clamped - segStart);
    if (segIdx !== state.collection.active.currentSegmentIdx) { await loadCollectionSegment(segIdx, token); if (!state.collection.active || state.collection.active.loadToken !== token) return; }
    const idx = findFrameIndexAtLocalMs(localMs);
    state.collection.active.currentLocalFrameIdx = idx;
    progressBar.value = Math.floor(clamped);
    showFrame(idx);
}

async function loadCollectionSegment(segIdx, token) {
    if (!state.collection.active) return;
    const group = state.collection.active.groups?.[segIdx]; if (!group) return;
    if (player.playTimer) { clearTimeout(player.playTimer); player.playTimer = null; }
    state.collection.active.loading = true;
    state.collection.active.currentSegmentIdx = segIdx; state.collection.active.currentGroupId = group.id;
    if (multi.enabled) { await loadMultiCamGroup(group, { configureTimeline: false, deferRender: true, autoplay: false, keepPlaying: true }); }
    else { await loadSingleGroup(group, selection.selectedCamera || 'front', { configureTimeline: false, deferRender: true, autoplay: false, keepPlaying: true }); }
    if (!state.collection.active || state.collection.active.loadToken !== token) return;
    state.collection.active.loading = false;
}

function streamShowFrame(stream, index) {
    if (!stream.frames?.[index]) return;
    if (stream.decoding) { stream.pendingFrame = index; } else { streamDecodeFrame(stream, index); }
}

async function streamDecodeFrame(stream, index) {
    stream.decoding = true;
    try {
        if (!stream.frames?.[index]) return;
        const targetFrame = stream.frames[index]; const targetTs = targetFrame.timestamp;
        if (!stream.decoder || stream.decoder.state === 'closed') { stream.decoder = new VideoDecoder({ output: (frame) => handleStreamOutput(stream, frame), error: (e) => { console.error('Stream decoder error:', e); stream.decoder = null; } }); }
        const config = stream.mp4.getConfig();
        if (stream.decoder.state === 'unconfigured') { stream.decoder.configure({ codec: config.codec, width: config.width, height: config.height }); }
        const isSequential = (stream.lastDecodedFrameIndex === index - 1);
        if (isSequential) {
            stream.seekTargetTimestamp = null;
            stream.decoder.decode(createChunkForStream(stream, targetFrame));
            stream.lastDecodedFrameIndex = index;
        } else {
            stream.decoder.reset();
            stream.decoder.configure({ codec: config.codec, width: config.width, height: config.height });
            let keyIdx = index; while (keyIdx >= 0 && !stream.frames[keyIdx].keyframe) keyIdx--; if (keyIdx < 0) keyIdx = 0;
            stream.seekTargetTimestamp = targetTs;
            for (let i = keyIdx; i <= index; i++) { stream.decoder.decode(createChunkForStream(stream, stream.frames[i])); }
            await stream.decoder.flush();
            stream.lastDecodedFrameIndex = stream.frames[index].keyframe ? index : keyIdx;
        }
    } catch (e) { if (e?.name !== 'AbortError') { } } finally { stream.decoding = false; if (stream.pendingFrame !== null) { const next = stream.pendingFrame; stream.pendingFrame = null; streamDecodeFrame(stream, next); } }
}

function handleStreamOutput(stream, frame) {
    const frameTsMs = frame.timestamp / 1000;
    let shouldDraw = true;
    if (stream.seekTargetTimestamp != null) { if (Math.abs(frameTsMs - stream.seekTargetTimestamp) > 0.01) { shouldDraw = false; } else { stream.seekTargetTimestamp = null; } }
    if (shouldDraw && stream.ctx) { createImageBitmap(frame).then(bitmap => { stream.ctx.drawImage(bitmap, 0, 0); }).catch(() => {}); }
    frame.close();
}

function createChunkForStream(stream, frame) {
    const config = stream.mp4.getConfig();
    const data = frame.keyframe ? DashcamMP4.concat(NAL_START_CODE, frame.sps || config.sps, NAL_START_CODE, frame.pps || config.pps, NAL_START_CODE, frame.data) : DashcamMP4.concat(NAL_START_CODE, frame.data);
    return new EncodedVideoChunk({ type: frame.keyframe ? 'key' : 'delta', timestamp: frame.timestamp * 1000, data });
}

async function decodeFrame(index) {
    player.decoding = true;
    try {
        if (!player.frames?.[index]) return;
        const targetFrame = player.frames[index]; const targetTs = targetFrame.timestamp;
        if (!player.decoder || player.decoder.state === 'closed') { player.decoder = new VideoDecoder({ output: handleDecoderOutput, error: (e) => { console.error('VideoDecoder error:', e); player.decoder = null; } }); }
        const config = player.mp4.getConfig();
        if (player.decoder.state === 'unconfigured') { player.decoder.configure({ codec: config.codec, width: config.width, height: config.height }); }
        const isSequential = (player.lastDecodedFrameIndex === index - 1);
        if (isSequential) {
            player.seekTargetTimestamp = null; player.decoder.decode(createChunk(targetFrame)); player.lastDecodedFrameIndex = index;
        } else {
            player.decoder.reset(); player.decoder.configure({ codec: config.codec, width: config.width, height: config.height });
            let keyIdx = index; while (keyIdx >= 0 && !player.frames[keyIdx].keyframe) keyIdx--; if (keyIdx < 0) keyIdx = 0;
            player.seekTargetTimestamp = targetTs;
            for (let i = keyIdx; i <= index; i++) { player.decoder.decode(createChunk(player.frames[i])); }
            await player.decoder.flush(); player.lastDecodedFrameIndex = player.frames[index].keyframe ? index : keyIdx;
        }
    } catch (e) { if (e?.name !== 'AbortError') { console.error('Decode error:', e); } } finally { player.decoding = false; if (player.pendingFrame !== null) { const next = player.pendingFrame; player.pendingFrame = null; decodeFrame(next); } }
}

function handleDecoderOutput(frame) {
    const frameTsMs = frame.timestamp / 1000;
    let shouldDraw = true;
    if (player.seekTargetTimestamp != null) { if (Math.abs(frameTsMs - player.seekTargetTimestamp) > 0.01) { shouldDraw = false; } else { player.seekTargetTimestamp = null; } }
    if (shouldDraw) { createImageBitmap(frame).then(bitmap => { ctx.drawImage(bitmap, 0, 0); }).catch(() => {}); }
    frame.close();
}

function createChunk(frame) {
    const config = player.mp4.getConfig();
    const data = frame.keyframe ? DashcamMP4.concat(NAL_START_CODE, frame.sps || config.sps, NAL_START_CODE, frame.pps || config.pps, NAL_START_CODE, frame.data) : DashcamMP4.concat(NAL_START_CODE, frame.data);
    return new EncodedVideoChunk({ type: frame.keyframe ? 'key' : 'delta', timestamp: frame.timestamp * 1000, data });
}

// G-Force Meter Logic
const GRAVITY = 9.81; const GFORCE_SCALE = 25;
function updateGForceMeter(sei) {
    if (!gforceDot) return;
    const accX = sei?.linear_acceleration_mps2_x || 0; const accY = sei?.linear_acceleration_mps2_y || 0;
    const gX = accX / GRAVITY; const gY = accY / GRAVITY;
    const clampedGX = Math.max(-2, Math.min(2, gX)); const clampedGY = Math.max(-2, Math.min(2, gY));
    const dotX = 30 + (clampedGX * GFORCE_SCALE); const dotY = 30 - (clampedGY * GFORCE_SCALE);
    gforceHistory.unshift({ x: dotX, y: dotY }); if (gforceHistory.length > GFORCE_HISTORY_MAX) { gforceHistory.pop(); }
    gforceDot.setAttribute('cx', dotX); gforceDot.setAttribute('cy', dotY);
    if (gforceTrail1 && gforceHistory.length > 0) { gforceTrail1.setAttribute('cx', gforceHistory[0]?.x || 30); gforceTrail1.setAttribute('cy', gforceHistory[0]?.y || 30); }
    if (gforceTrail2 && gforceHistory.length > 1) { gforceTrail2.setAttribute('cx', gforceHistory[1]?.x || 30); gforceTrail2.setAttribute('cy', gforceHistory[1]?.y || 30); }
    if (gforceTrail3 && gforceHistory.length > 2) { gforceTrail3.setAttribute('cx', gforceHistory[2]?.x || 30); gforceTrail3.setAttribute('cy', gforceHistory[2]?.y || 30); }
    gforceDot.classList.remove('braking', 'accelerating', 'cornering-hard');
    if (gY < -0.3) { gforceDot.classList.add('braking'); } else if (gY > 0.3) { gforceDot.classList.add('accelerating'); } else if (Math.abs(gX) > 0.5) { gforceDot.classList.add('cornering-hard'); }
    if (gforceX) { gforceX.textContent = (gX >= 0 ? '+' : '') + gX.toFixed(1); gforceX.classList.remove('positive', 'negative', 'high'); if (Math.abs(gX) > 0.8) gforceX.classList.add('high'); else if (gX > 0.2) gforceX.classList.add('positive'); else if (gX < -0.2) gforceX.classList.add('negative'); }
    if (gforceY) { gforceY.textContent = (gY >= 0 ? '+' : '') + gY.toFixed(1); gforceY.classList.remove('positive', 'negative', 'high'); if (Math.abs(gY) > 0.8) gforceY.classList.add('high'); else if (gY > 0.2) gforceY.classList.add('positive'); else if (gY < -0.2) gforceY.classList.add('negative'); }
}

function updateCompass(sei) {
    if (!compassNeedle) return;
    let heading = parseFloat(sei?.heading_deg); if (!Number.isFinite(heading)) heading = 0;
    heading = ((heading % 360) + 360) % 360;
    compassNeedle.setAttribute('transform', `rotate(${heading} 30 30)`);
    if (compassValue) { const cardinals = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; const index = Math.round(heading / 45) % 8; const cardinal = cardinals[index] || 'N'; compassValue.textContent = `${Math.round(heading)}° ${cardinal}`; }
}

function updateVisualization(sei) {
    if (!sei) return;
    const mps = sei.vehicle_speed_mps || 0; const mph = Math.round(mps * MPS_TO_MPH); speedValue.textContent = mph;

    // Defensive: Only update gear UI if elements exist
    const gearEls = [gearP, gearR, gearN, gearD].filter(Boolean);
    gearEls.forEach(el => el.classList.remove('active'));
    const gear = sei.gear_state;
    if (gear === 0 && gearP) gearP.classList.add('active');
    else if (gear === 1 && gearD) gearD.classList.add('active');
    else if (gear === 2 && gearR) gearR.classList.add('active');
    else if (gear === 3 && gearN) gearN.classList.add('active');

    // --- Turn Signal Flashing Logic ---

    // Defensive: Only update blinkers if elements exist
    const leftOn = !!sei.blinker_on_left;
    const rightOn = !!sei.blinker_on_right;
    // Only update interval if state changes
    if (blinkerState.left !== leftOn || blinkerState.right !== rightOn) {
        blinkerState.left = leftOn;
        blinkerState.right = rightOn;
        updateBlinkerInterval();
    }
    // Always update DOM to reflect current state
    if (blinkLeft) blinkLeft.classList.toggle('active', blinkerState.left && blinkerState.on);
    if (blinkRight) blinkRight.classList.toggle('active', blinkerState.right && blinkerState.on);

    if (steeringIcon) {
        const angle = sei.steering_wheel_angle || 0;
        steeringIcon.style.transform = `rotate(${angle}deg)`;
    }
    if (autopilotStatus && apText) {
        const apState = sei.autopilot_state;
        autopilotStatus.className = 'autopilot-badge';
        if (apState === 2 || apState === 3) { autopilotStatus.classList.add('active-ap'); apText.textContent = apState === 3 ? 'TACC' : 'AP'; } else if (apState === 1) { autopilotStatus.classList.add('active-fsd'); apText.textContent = 'FSD'; } else { apText.textContent = 'Manual'; }
    }

    // --- Brake and Accelerator Bar UI ---
    // Accelerator
    let accel = sei.accelerator_pedal_position || 0;
    if (accel > 100) accel = 100;
    if (accel < 0) accel = 0;
    if (accelBar) accelBar.style.width = `${accel}%`;

    // Brake pressure (show as bar like accelerator)
    let brake = sei.brake_pedal_pressure || 0;
    if (brake > 100) brake = 100;
    if (brake < 0) brake = 0;
    if (brakeBar) brakeBar.style.width = `${brake}%`;
    if (brakeInd) brakeInd.classList.toggle('active', brake > 0);
    if (extraDataContainer.classList.contains('expanded')) {
        if (valSeq) valSeq.textContent = sei.frame_seq_no || '--'; if (valLat) valLat.textContent = (sei.latitude_deg || 0).toFixed(6); if (valLon) valLon.textContent = (sei.longitude_deg || 0).toFixed(6); if (valHeading) valHeading.textContent = (sei.heading_deg || 0).toFixed(1) + '°';
        if (valAccX) valAccX.textContent = (sei.linear_acceleration_mps2_x || 0).toFixed(2); if (valAccY) valAccY.textContent = (sei.linear_acceleration_mps2_y || 0).toFixed(2); if (valAccZ) valAccZ.textContent = (sei.linear_acceleration_mps2_z || 0).toFixed(2);
    }
    updateGForceMeter(sei); updateCompass(sei);
    if (map && hasValidGps(sei)) { const latlng = [sei.latitude_deg, sei.longitude_deg]; if (!mapMarker) { mapMarker = L.circleMarker(latlng, { radius: 6, fillColor: '#fff', color: '#3e9cbf', weight: 2, opacity: 1, fillOpacity: 1 }).addTo(map); } else { mapMarker.setLatLng(latlng); } }
}

// Manage blinker animation interval globally
function updateBlinkerInterval() {
    if (blinkerState.interval) {
        clearInterval(blinkerState.interval);
        blinkerState.interval = null;
    }
    if (blinkerState.left || blinkerState.right) {
        blinkerState.on = true;
        blinkerState.interval = setInterval(() => {
            blinkerState.on = !blinkerState.on;
            if (blinkLeft) blinkLeft.classList.toggle('active', blinkerState.left && blinkerState.on);
            if (blinkRight) blinkRight.classList.toggle('active', blinkerState.right && blinkerState.on);
        }, 500);
    } else {
        blinkerState.on = false;
        if (blinkLeft) blinkLeft.classList.remove('active');
        if (blinkRight) blinkRight.classList.remove('active');
    }
}

toggleExtra.addEventListener('mousedown', (e) => e.stopPropagation()); toggleExtra.addEventListener('pointerdown', (e) => e.stopPropagation());
toggleExtra.onclick = (e) => { e.preventDefault(); e.stopPropagation(); extraDataContainer.classList.toggle('expanded'); if (extraDataContainer.classList.contains('expanded') && player.frames && progressBar.value) { updateVisualization(player.frames[+progressBar.value].sei); } toggleExtra.blur(); };
dashboardVis.addEventListener('mousedown', (e) => { if (!e.target.closest('.vis-header')) { e.stopPropagation(); } });
dashboardVis.addEventListener('pointerdown', (e) => { if (!e.target.closest('.vis-header')) { e.stopPropagation(); } });

function updateTimeDisplay(frameIndex) {
    if (state.collection.active) { const seconds = Math.floor((+progressBar.value || 0) / 1000); const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); timeDisplay.textContent = `${m}:${s}`; return; }
    if (!player.frames || !player.frames[frameIndex]) return;
    const seconds = Math.floor(player.frames[frameIndex].timestamp / 1000); const m = Math.floor(seconds / 60).toString().padStart(2, '0'); const s = (seconds % 60).toString().padStart(2, '0'); timeDisplay.textContent = `${m}:${s}`;
}
