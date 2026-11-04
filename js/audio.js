/* 寰宇时序 · Ambient soundscape and voice guide
   Everything is synthesized with Web Audio; no external audio assets. */
(function () {
  "use strict";
  let ctx = null, master = null, droneA = null, droneB = null, delay = null, feedback = null;
  let enabled = false, timer = 0, eraId = "global";
  let voiceLang = "zh";

  const SCALES = {
    prehistory: [110, 146.83, 164.81, 220, 246.94],
    bronze: [130.81, 155.56, 196.0, 233.08, 261.63],
    classical: [146.83, 174.61, 220, 261.63, 293.66],
    medieval: [130.81, 164.81, 196.0, 261.63, 329.63],
    earlymodern: [164.81, 196.0, 220, 261.63, 329.63],
    industrial: [146.83, 185.0, 220, 277.18, 329.63],
    worldwars: [130.81, 155.56, 185.0, 220, 261.63],
    coldwar: [110, 138.59, 164.81, 196.0, 246.94],
    global: [146.83, 174.61, 220, 261.63, 349.23],
  };

  function makeContext() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.0;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    master.connect(filter).connect(ctx.destination);
    delay = ctx.createDelay(2.0);
    delay.delayTime.value = 0.42;
    feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    delay.connect(feedback).connect(delay);
    delay.connect(master);
    // two detuned drones
    droneA = ctx.createOscillator();
    droneB = ctx.createOscillator();
    droneA.type = "sine"; droneB.type = "triangle";
    droneA.frequency.value = 110; droneB.frequency.value = 164.81;
    const gA = ctx.createGain(), gB = ctx.createGain();
    gA.gain.value = 0.030; gB.gain.value = 0.012;
    droneA.connect(gA).connect(master);
    droneB.connect(gB).connect(master);
    droneA.start(); droneB.start();
  }

  function setEra(id) {
    if (!SCALES[id]) return;
    eraId = id;
    if (!ctx || !droneA) return;
    const root = SCALES[id][0];
    const t = ctx.currentTime;
    droneA.frequency.cancelScheduledValues(t);
    droneA.frequency.linearRampToValueAtTime(root / 2, t + 2.5);
    droneB.frequency.cancelScheduledValues(t);
    droneB.frequency.linearRampToValueAtTime(root * 1.5, t + 2.5);
  }

  function pluck(freq, when, vol) {
    if (!ctx || !master) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = freq;
    const t = when || ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.05, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    o.connect(g);
    g.connect(master);
    g.connect(delay);
    o.start(t); o.stop(t + 2.6);
  }

  function schedule() {
    if (!enabled || !ctx) return;
    const scale = SCALES[eraId] || SCALES.global;
    const n = scale[Math.floor(Math.random() * scale.length)];
    pluck(n * 2, ctx.currentTime + 0.05, 0.035 + Math.random() * 0.02);
    if (Math.random() > 0.5) pluck(n * 3, ctx.currentTime + 0.6, 0.015);
    timer = setTimeout(schedule, 3500 + Math.random() * 4500);
  }

  function setOn(on) {
    makeContext();
    if (!ctx) return false;
    if (on) {
      ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 1.8);
      enabled = true;
      clearTimeout(timer);
      schedule();
    } else {
      enabled = false;
      clearTimeout(timer);
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.8);
      setTimeout(() => { if (!enabled && ctx) ctx.suspend(); }, 900);
    }
    return enabled;
  }

  function toggle() { return setOn(!enabled); }

  function speak(text, lang) {
    if (!("speechSynthesis" in window)) return false;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const l = lang === "zh" ? "zh-CN" : lang === "es" ? "es-ES" : lang === "fr" ? "fr-FR" : lang === "ar" ? "ar-SA" : "en-US";
      u.lang = l;
      u.rate = 0.95;
      u.pitch = 0.92;
      const voices = window.speechSynthesis.getVoices();
      const v = voices.find((x) => x.lang === l) || voices.find((x) => x.lang.indexOf(l.slice(0, 2)) === 0);
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  function stopSpeak() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }

  window.AtlasAudio = {
    toggle, setOn, setEra, speak, stopSpeak,
    isOn: () => enabled,
    setLang: (l) => { voiceLang = l; },
  };
})();
