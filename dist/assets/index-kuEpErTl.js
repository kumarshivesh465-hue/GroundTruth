(function(){const i=document.createElement("link").relList;if(i&&i.supports&&i.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))c(t);new MutationObserver(t=>{for(const n of t)if(n.type==="childList")for(const r of n.addedNodes)r.tagName==="LINK"&&r.rel==="modulepreload"&&c(r)}).observe(document,{childList:!0,subtree:!0});function l(t){const n={};return t.integrity&&(n.integrity=t.integrity),t.referrerPolicy&&(n.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?n.credentials="include":t.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function c(t){if(t.ep)return;t.ep=!0;const n=l(t);fetch(t.href,n)}})();const w="modulepreload",b=function(s){return"/"+s},m={},L=function(i,l,c){let t=Promise.resolve();if(l&&l.length>0){document.getElementsByTagName("link");const r=document.querySelector("meta[property=csp-nonce]"),o=(r==null?void 0:r.nonce)||(r==null?void 0:r.getAttribute("nonce"));t=Promise.allSettled(l.map(a=>{if(a=b(a),a in m)return;m[a]=!0;const d=a.endsWith(".css"),h=d?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${h}`))return;const e=document.createElement("link");if(e.rel=d?"stylesheet":w,d||(e.as="script"),e.crossOrigin="",e.href=a,o&&e.setAttribute("nonce",o),document.head.appendChild(e),d)return new Promise((g,y)=>{e.addEventListener("load",g),e.addEventListener("error",()=>y(new Error(`Unable to preload CSS for ${a}`)))})}))}function n(r){const o=new Event("vite:preloadError",{cancelable:!0});if(o.payload=r,window.dispatchEvent(o),!o.defaultPrevented)throw r}return t.then(r=>{for(const o of r||[])o.status==="rejected"&&n(o.reason);return i().catch(n)})};function E(s={}){const{immediate:i=!1,onNeedRefresh:l,onOfflineReady:c,onRegistered:t,onRegisteredSW:n,onRegisterError:r}=s;let o,a;const d=async(e=!0)=>{await a};async function h(){if("serviceWorker"in navigator){if(o=await L(async()=>{const{Workbox:e}=await import("./workbox-window.prod.es5-BqEJf4Xk.js");return{Workbox:e}},[]).then(({Workbox:e})=>new e("/sw.js",{scope:"/",type:"classic"})).catch(e=>{r==null||r(e)}),!o)return;o.addEventListener("activated",e=>{(e.isUpdate||e.isExternal)&&window.location.reload()}),o.addEventListener("installed",e=>{e.isUpdate||c==null||c()}),o.register({immediate:i}).then(e=>{n?n("/sw.js",e):t==null||t(e)}).catch(e=>{r==null||r(e)})}}return a=h(),d}E({immediate:!0});const O=document.getElementById("screen-outlet"),p=document.getElementById("tabbar"),P=document.getElementById("net-status");function f(){P.textContent=navigator.onLine?"online":"offline (fine — runs on-device)"}window.addEventListener("online",f);window.addEventListener("offline",f);f();const S={home:()=>`
    <section class="screen">
      <h1>Recent Reports</h1>
      <p class="subtitle">Offline history will list here (IndexedDB) — build during the event.</p>
      <div class="placeholder">
        No reports yet. Tap "Capture" below to start a new one.
      </div>
    </section>
  `,capture:()=>`
    <section class="screen">
      <h1>Capture</h1>
      <p class="subtitle">Live camera feed — wire up MediaPipe Tasks Vision here during the event.</p>
      <video id="camera-video" autoplay playsinline muted></video>
      <div style="height:14px"></div>
      <button class="btn" id="start-camera">Start Camera</button>
      <div style="height:10px"></div>
      <div class="placeholder">
        TODO (event day): run the frame through MediaPipe's Object Detector
        (@mediapipe/tasks-vision) and list detected objects here as
        structured evidence.
      </div>
    </section>
  `,claim:()=>`
    <section class="screen">
      <h1>Claim</h1>
      <p class="subtitle">Voice capture — wire up Web Speech API (or Whisper via transformers.js) here.</p>
      <div class="placeholder">
        TODO (event day): use the SpeechRecognition Web API for a fast MVP,
        or @huggingface/transformers running a small Whisper model for a
        fully on-device version. Show the live transcript in this screen.
      </div>
    </section>
  `,reconcile:()=>`
    <section class="screen">
      <h1>Reconcile</h1>
      <p class="subtitle">On-device LLM comparison — wire up WebLLM here.</p>
      <div class="placeholder">
        TODO (event day): load a small WebLLM model (e.g.
        Qwen2.5-1.5B-Instruct-q4f16_1-MLC) via @mlc-ai/web-llm and prompt it
        with the detected evidence + spoken claim to produce a
        Match / Mismatch verdict with reasoning.
      </div>
    </section>
  `,report:()=>`
    <section class="screen">
      <h1>Report</h1>
      <p class="subtitle">Final reconciled report — build the report card UI here.</p>
      <div class="placeholder">
        TODO (event day): render the Match/Mismatch badge, the raw evidence,
        the raw claim, and save the report to IndexedDB for offline history.
      </div>
    </section>
  `};let u=null;function v(s){O.innerHTML=S[s](),[...p.children].forEach(i=>{i.classList.toggle("active",i.dataset.screen===s)}),s==="capture"?document.getElementById("start-camera").addEventListener("click",C):I()}async function C(){const s=document.getElementById("camera-video");try{u=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:!1}),s.srcObject=u}catch(i){alert("Camera access failed: "+i.message+`

On a phone, camera access needs a secure context (https, or localhost via Chrome port-forwarding — see README).`)}}function I(){u&&(u.getTracks().forEach(s=>s.stop()),u=null)}p.addEventListener("click",s=>{const i=s.target.closest("button[data-screen]");i&&v(i.dataset.screen)});v("home");
