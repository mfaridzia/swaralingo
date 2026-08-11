import React, { useState, useEffect } from 'react';
import { User, Lock, Save, ShieldAlert, Bell, BellOff } from 'lucide-react';
import { apiFetch } from '../api';
import type { UserProfile } from './Auth';

interface SettingsProps {
  user: UserProfile;
  onProfileUpdated: (user: UserProfile) => void;
}

async function MathSha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function playChimeSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Note 1 (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    gain1.gain.setValueAtTime(0.15, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    // Note 2 (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
    gain2.gain.setValueAtTime(0.15, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.error("Audio Synthesis Error:", e);
  }
}

export const Settings: React.FC<SettingsProps> = ({ user, onProfileUpdated }) => {
  const [name, setName] = useState(user.name);
  const [targetLanguage, setTargetLanguage] = useState(user.target_language || 'English');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load initial alarm settings states directly from LocalStorage
  const [isAlarmEnabled, setIsAlarmEnabled] = useState(() => {
    return localStorage.getItem(`alarm_enabled_${user.id}`) === 'true';
  });
  
  const [alarmTime, setAlarmTime] = useState(() => {
    return localStorage.getItem(`alarm_time_${user.id}`) || '19:00';
  });

  // Request browser notification permission explicitly
  const requestPermissionAndTest = () => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          playChimeSound();
          try {
            new Notification('SwaraLingo - Test Notification ✅', {
              body: 'Notification permission is successfully granted and working!',
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.error("Notification trigger error:", e);
          }
        } else {
          alert("Notification permission was denied. Please enable notifications for this website in your browser settings.");
        }
      });
    } else {
      alert("Notifications are not supported in this browser.");
    }
  };

  const triggerNotificationDirectly = (title: string, bodyText: string) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const options = {
      body: bodyText,
      icon: '/favicon.ico'
    };

    try {
      new Notification(title, options);
    } catch (err) {
      console.error("Direct notification failed:", err);
    }
  };

  useEffect(() => {
    setName(user.name);
    setTargetLanguage(user.target_language || 'English');
  }, [user]);

  // Efficient One-Shot Timeout Alarm System (Bypasses CPU setInterval polling entirely)
  useEffect(() => {
    if (!isAlarmEnabled) return;

    // Parse target hours and minutes
    const [targetHour, targetMinute] = alarmTime.split(':').map(Number);
    if (isNaN(targetHour) || isNaN(targetMinute)) return;

    const scheduleNextAlarm = () => {
      const now = new Date();
      const targetDate = new Date();
      
      targetDate.setHours(targetHour, targetMinute, 0, 0);

      // If target time has already passed today, schedule it for tomorrow
      if (targetDate.getTime() <= now.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      const msDelay = targetDate.getTime() - now.getTime();
      console.log(`[Alarm Scheduler] Target set to ${targetDate.toLocaleString()}. Delaying for ${msDelay} ms. CPU usage: 0% sleeping.`);

      const timeoutId = setTimeout(() => {
        // Sound the chime
        playChimeSound();
        
        // Trigger notification
        triggerNotificationDirectly(
          'SwaraLingo Daily Study Reminder! ⚡',
          "Time to complete your English speaking practice today! Consistent steps build native reflexes."
        );

        // Re-schedule the alarm for the next day
        scheduleNextAlarm();
      }, msDelay);

      return timeoutId;
    };

    const activeTimeoutId = scheduleNextAlarm();

    // Clean up timeout on component unmount or settings update
    return () => clearTimeout(activeTimeoutId);
  }, [isAlarmEnabled, alarmTime, user.id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (password && password.length < 6) {
      setErrorMsg('Password baru harus minimal 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    setIsUpdating(true);

    try {
      let payload: any = {
        name,
        target_language: targetLanguage
      };

      if (password) {
        payload.password = await MathSha256(password);
      }

      const response = await apiFetch('/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const resData = await response.json();

      if (response.ok && resData.success) {
        setSuccessMsg('Profil berhasil diperbarui!');
        onProfileUpdated(resData.data);
        setPassword('');
        setConfirmPassword('');
      } else {
        setErrorMsg(resData.error || 'Gagal memperbarui profil.');
      }
    } catch (err) {
      setErrorMsg('Kesalahan koneksi ke server.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAlarmToggle = () => {
    const nextStatus = !isAlarmEnabled;
    setIsAlarmEnabled(nextStatus);
    localStorage.setItem(`alarm_enabled_${user.id}`, String(nextStatus));
  };

  const handleAlarmTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextTime = e.target.value;
    setAlarmTime(nextTime);
    localStorage.setItem(`alarm_time_${user.id}`, nextTime);
  };

  const convertLocalToUTC = (localTime: string): string => {
    const [hours, minutes] = localTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    const utcHours = date.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = date.getUTCMinutes().toString().padStart(2, '0');
    return `${utcHours}:${utcMinutes}`;
  };

  const subscribeToPush = async (timeUTC: string) => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push messaging is not supported in this browser');
      return;
    }
    
    // Request permission explicitly first
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Izin notifikasi ditolak oleh pengguna.');
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Get VAPID public key
    const keyRes = await apiFetch('/notifications/vapid-public-key');
    const keyJson = await keyRes.json();
    if (!keyJson.success || !keyJson.publicKey) {
      throw new Error('Gagal mendapatkan VAPID public key dari server.');
    }

    // Helper to convert VAPID key
    const urlBase64ToUint8Array = (base64String: string) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    };

    // Unsubscribe existing first to avoid duplicate bindings
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await existingSub.unsubscribe();
    }

    // Subscribe user
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(keyJson.publicKey),
    });

    // Save subscription info to backend
    const subscribeRes = await apiFetch('/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription,
        alarmTime: timeUTC,
      }),
    });
    const subscribeJson = await subscribeRes.json();
    if (!subscribeJson.success) {
      throw new Error(subscribeJson.error || 'Gagal menyimpan subskripsi push di server.');
    }
  };

  const unsubscribeFromPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        // Delete on backend
        await apiFetch('/notifications/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        // Unsubscribe on browser
        await subscription.unsubscribe();
      }
    } catch (e) {
      console.error('Failed to unsubscribe from Web Push:', e);
    }
  };

  const saveAlarmSettings = async () => {
    setSuccessMsg('');
    setErrorMsg('');
    setIsUpdating(true);

    try {
      localStorage.setItem(`alarm_enabled_${user.id}`, String(isAlarmEnabled));
      localStorage.setItem(`alarm_time_${user.id}`, alarmTime);

      if (isAlarmEnabled) {
        const utcTime = convertLocalToUTC(alarmTime);
        await subscribeToPush(utcTime);
        playChimeSound();
        triggerNotificationDirectly(
          'SwaraLingo - Reminder Configured! 🔔',
          `Your daily practice alarm is set for ${alarmTime} (Push enabled).`
        );
      } else {
        await unsubscribeFromPush();
      }

      setSuccessMsg('Pengingat harian berhasil disimpan!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Gagal mengonfigurasi push notification.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-[#f4f4f5]">Profile Settings</h1>
        <p className="text-sm text-[#a1a1aa]">
          Manage your account profile, personal name, daily reminders, and security password credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profile Details Form */}
        <form onSubmit={handleUpdate} className="glass-panel space-y-6 rounded-2xl p-6">
          {successMsg && (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-sm text-[#4ade80] font-semibold">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            {/* Email (Read Only) */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Email Address (Cannot be changed)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="rounded-xl border border-[#27272a] bg-[#09090b]/50 p-3 text-[0.875rem] text-[#71717a] cursor-not-allowed outline-none"
              />
            </div>

            {/* Full Name */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                  placeholder="Full Name"
                />
              </div>
            </div>

            {/* Target Language Select */}
            <div className="flex flex-col space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Target Language</label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors appearance-none cursor-pointer"
              >
                <option value="English">English</option>
                <option value="French">French</option>
                <option value="Spanish">Spanish</option>
                <option value="Japanese">Japanese</option>
                <option value="German">German</option>
              </select>
            </div>

            <div className="border-t border-[#27272a]/50 my-6 pt-6 space-y-4">
              <h3 className="text-sm font-bold text-white">Change Password</h3>
              <p className="text-xs text-[#a1a1aa]">Leave fields blank if you don't want to change your password.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Password */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Confirm New Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#52525b]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-[#121214] border border-[#27272a] rounded-xl pl-9 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isUpdating}
              className="premium-btn-hover flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-2.5 text-sm font-semibold text-[#09090b] border-none cursor-pointer disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Save Profile'}
              <Save className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Daily Alarm / Study Reminder Form Panel */}
        <div className="glass-panel space-y-6 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Daily Study Reminder</h3>
              <p className="text-xs text-[#a1a1aa]">Set a scheduled daily browser push notification to stay consistent.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={requestPermissionAndTest}
                className="text-[10px] uppercase font-bold border border-[#27272a] hover:border-white px-2.5 py-1.5 rounded-lg text-[#a1a1aa] hover:text-white transition-colors cursor-pointer"
              >
                Test Notification
              </button>
              <button
                type="button"
                onClick={handleAlarmToggle}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isAlarmEnabled 
                    ? 'bg-[#22c55e]/15 border-[#22c55e]/30 text-[#22c55e]' 
                    : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                }`}
              >
                {isAlarmEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isAlarmEnabled && (
            <div className="flex flex-col space-y-2 max-w-xs animate-fadeIn">
              <label htmlFor="alarm-time" className="text-xs font-semibold uppercase tracking-wider text-[#a1a1aa]">Reminder Time</label>
              <input
                id="alarm-time"
                type="time"
                value={alarmTime}
                onChange={handleAlarmTimeChange}
                className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={saveAlarmSettings}
              className="premium-btn-hover flex items-center gap-2 rounded-xl bg-[#27272a] border border-[#3f3f46] hover:border-white px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
            >
              Save Reminder
              <Save className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
