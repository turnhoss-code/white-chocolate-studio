/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * White Chocolate Studio - TikTok LIVE Compatible Donations, Song Request Tip Jar & Super Fan Subscription Hub
 */

import React, { useState } from 'react';
import { DJEngine } from '../audio/DJEngine';
import { TrackMetadata } from '../audio/proceduralTracks';
import {
  DollarSign,
  Crown,
  Gift,
  Music,
  Bell,
  Sparkles,
  Check,
  Users,
  Plus,
  Volume2,
  Shield,
} from 'lucide-react';

interface DonationsSubscriptionPanelProps {
  engine: DJEngine;
  availableTracks: TrackMetadata[];
  onOpenOverlay?: () => void;
}

export const DonationsSubscriptionPanel: React.FC<DonationsSubscriptionPanelProps> = ({
  engine,
  availableTracks,
  onOpenOverlay,
}) => {
  const tk = engine.tiktokConfig;

  // New Donation / Paid Song Request form state
  const [donorHandle, setDonorHandle] = useState('@LowriderKing_LA');
  const [donationAmount, setDonationAmount] = useState<number>(15);
  const [donationMethod, setDonationMethod] = useState<
    'TikTok Coins' | 'CashApp' | 'Venmo' | 'PayPal' | 'SuperChat'
  >('TikTok Coins');
  const [donationMessage, setDonationMessage] = useState(
    'Spin that West Coast bounce on the 100-spokes!'
  );
  const [requestedSongTitle, setRequestedSongTitle] = useState<string>(
    availableTracks[0]?.title || 'West Coast Lowrider Bounce (100-Spoke Mix)'
  );

  // New Subscriber simulation state
  const [subHandle, setSubHandle] = useState('@CandyPaint_VIP');
  const [subTierId, setSubTierId] = useState<'cruiser' | 'chrome_vip' | 'bullet_legend'>(
    'chrome_vip'
  );
  const [subMonths, setSubMonths] = useState<number>(3);
  const [subGiftedCount, setSubGiftedCount] = useState<number>(0);
  const [subMessage, setSubMessage] = useState('100-Spoke VIP Crew checking in!');

  const donationProgressPct = Math.min(
    100,
    Math.round((tk.donationCurrentUsd / Math.max(1, tk.donationTargetUsd)) * 100)
  );
  const subProgressPct = Math.min(
    100,
    Math.round((tk.subscriberCount / Math.max(1, tk.subscriberGoal)) * 100)
  );

  const handleAddDonationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Math.max(1, Number(donationAmount) || 5);
    engine.addDonation({
      donorHandle: donorHandle.trim() || '@TikTokFan',
      amountUsd: amt,
      method: donationMethod,
      message: donationMessage.trim() || 'Keep the mix rolling!',
      songRequest: amt >= tk.minSongRequestUsd ? requestedSongTitle.trim() : undefined,
    });
  };

  const handleTriggerSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    const giftedNum = Math.max(0, Number(subGiftedCount) || 0);
    engine.addSubscription({
      subHandle: subHandle.trim() || '@SubCruiser',
      tierId: subTierId,
      months: Math.max(1, Number(subMonths) || 1),
      isGifted: giftedNum > 0,
      giftedCount: giftedNum > 0 ? giftedNum : undefined,
      message: subMessage.trim() || 'Subscribed to White Chocolate Studio!',
    });
  };

  const handleLoadRequestedSong = (songName: string, deckId: 'A' | 'B') => {
    const lower = songName.toLowerCase();
    const matched =
      availableTracks.find(
        (t) =>
          t.title.toLowerCase().includes(lower) || lower.includes(t.title.toLowerCase())
      ) || availableTracks[0];
    if (matched) {
      engine.loadTrack(deckId, matched);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* =================================================================== */}
      {/* LEFT COLUMN: TIKTOK LIVE DONATIONS, COINS & PAID SONG REQUESTS      */}
      {/* =================================================================== */}
      <div className="bg-slate-900/95 rounded-2xl border border-amber-500/30 p-4 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
          }}
        />

        {/* Header & Live Revenue Metrics */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                TikTok LIVE Donations &amp; Tip Jar
              </h3>
              <p className="text-[11px] text-slate-400">
                Coins/Diamonds · CashApp/Venmo/PayPal · Paid Song Requests
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-[9px] font-mono text-slate-400">STREAM TIPS</div>
              <div className="text-xs font-black font-mono text-emerald-400 tabular-nums">
                ${tk.donationCurrentUsd.toFixed(2)}
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-[9px] font-mono text-slate-400">TIKTOK COINS</div>
              <div className="text-xs font-black font-mono text-amber-400 tabular-nums">
                🪙 {tk.totalTikTokCoins.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Stream Donation Goal Progress Bar & Settings */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <input
              type="text"
              value={tk.donationGoalTitle}
              onChange={(e) => {
                tk.donationGoalTitle = e.target.value;
                engine.notifyUpdate();
              }}
              className="bg-transparent font-bold text-amber-300 focus:outline-none focus:border-b border-amber-400 flex-1 min-w-0"
              title="Click to edit stream donation goal title"
            />
            <div className="flex items-center gap-1 font-mono text-xs tabular-nums shrink-0">
              <span className="text-emerald-400 font-black">${tk.donationCurrentUsd}</span>
              <span className="text-slate-500">/</span>
              <span className="text-slate-400">$</span>
              <input
                type="number"
                value={tk.donationTargetUsd}
                onChange={(e) => {
                  tk.donationTargetUsd = Math.max(10, Number(e.target.value) || 250);
                  engine.notifyUpdate();
                }}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-right font-mono text-xs"
                title="Donation Goal Target ($ USD)"
              />
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${donationProgressPct}%`,
                background: 'linear-gradient(90deg, #10b981 0%, #f59e0b 75%, #ef4444 100%)',
              }}
            />
          </div>

          {/* Creator Payment Handles & Min Song Request Tip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            <div>
              <label className="block text-[9px] font-mono text-slate-400">CASHAPP TAG</label>
              <input
                type="text"
                value={tk.cashAppTag}
                onChange={(e) => {
                  tk.cashAppTag = e.target.value;
                  engine.notifyUpdate();
                }}
                className="w-full h-7 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-emerald-300"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-slate-400">VENMO HANDLE</label>
              <input
                type="text"
                value={tk.venmoTag}
                onChange={(e) => {
                  tk.venmoTag = e.target.value;
                  engine.notifyUpdate();
                }}
                className="w-full h-7 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-blue-300"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-slate-400">PAYPAL.ME</label>
              <input
                type="text"
                value={tk.paypalLink}
                onChange={(e) => {
                  tk.paypalLink = e.target.value;
                  engine.notifyUpdate();
                }}
                className="w-full h-7 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-amber-300"
              />
            </div>
            <div>
              <label className="block text-[9px] font-mono text-slate-400">MIN SONG TIP ($)</label>
              <input
                type="number"
                min={1}
                value={tk.minSongRequestUsd}
                onChange={(e) => {
                  tk.minSongRequestUsd = Math.max(1, Number(e.target.value) || 5);
                  engine.notifyUpdate();
                }}
                className="w-full h-7 px-2 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono text-white tabular-nums"
              />
            </div>
          </div>
        </div>

        {/* Log / Trigger Live Donation & Paid Song Request Alert */}
        <form
          onSubmit={handleAddDonationSubmit}
          className="p-3 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-400 uppercase flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              <span>Trigger Live Donation &amp; Song Request Alert</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Auto-Ducks Mix + Plays Cash Drop
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={donorHandle}
              onChange={(e) => setDonorHandle(e.target.value)}
              placeholder="@TikTokDonor"
              className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
            />
            <div className="flex items-center gap-1">
              <span className="text-xs font-mono text-emerald-400 font-bold">$</span>
              <input
                type="number"
                min={1}
                value={donationAmount}
                onChange={(e) => setDonationAmount(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-emerald-400 font-mono font-bold tabular-nums"
              />
            </div>
            <select
              value={donationMethod}
              onChange={(e) =>
                setDonationMethod(
                  e.target.value as
                    | 'TikTok Coins'
                    | 'CashApp'
                    | 'Venmo'
                    | 'PayPal'
                    | 'SuperChat'
                )
              }
              className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 font-bold"
            >
              <option value="TikTok Coins">TikTok Coins 🪙</option>
              <option value="CashApp">CashApp 💸</option>
              <option value="Venmo">Venmo 💙</option>
              <option value="PayPal">PayPal 🌐</option>
              <option value="SuperChat">SuperChat ⭐</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={donationMessage}
              onChange={(e) => setDonationMessage(e.target.value)}
              placeholder="Shoutout message on overlay..."
              className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            />
            <select
              value={requestedSongTitle}
              onChange={(e) => setRequestedSongTitle(e.target.value)}
              className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300 font-mono"
            >
              {availableTracks.map((t) => (
                <option key={t.id} value={t.title}>
                  🎵 Req: {t.title} ({t.bpm} BPM)
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1">
              {[5, 10, 25, 50].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setDonationAmount(preset)}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold border ${
                    donationAmount === preset
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                  }`}
                >
                  +${preset}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Send Donation Alert</span>
            </button>
          </div>
        </form>

        {/* Live Donations & Song Request Queue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>LIVE DONATION &amp; PAID SONG REQUEST QUEUE ({tk.donations.length})</span>
            {onOpenOverlay && (
              <button
                onClick={onOpenOverlay}
                className="text-amber-400 hover:underline font-mono text-[10px]"
              >
                View on Stream Overlay →
              </button>
            )}
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
            {tk.donations.map((don) => (
              <div
                key={don.id}
                className={`p-2.5 rounded-xl border transition-colors flex flex-col gap-1.5 ${
                  don.shoutedOut
                    ? 'bg-slate-950/60 border-slate-800/80'
                    : 'bg-slate-950 border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs tabular-nums shrink-0">
                      ${don.amountUsd}
                    </span>
                    <span className="text-xs font-bold text-white truncate">{don.donorHandle}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">
                      via {don.method}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
                    {don.timestamp}
                  </span>
                </div>

                <div className="text-[11px] text-slate-300">{don.message}</div>

                {/* Song Request + 1-Click Load to Deck A/B + Replay Shoutout */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-slate-900">
                  {don.songRequest ? (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-amber-300 truncate max-w-[60%]">
                      <Music className="w-3 h-3 shrink-0" />
                      <span className="truncate">REQ: {don.songRequest}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-mono text-slate-500">General Stream Tip</span>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    {don.songRequest && (
                      <>
                        <button
                          onClick={() => handleLoadRequestedSong(don.songRequest!, 'A')}
                          className="px-2 py-0.5 rounded bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-[10px] font-bold transition-colors whitespace-nowrap"
                          title="Load requested track to Deck A"
                        >
                          Load A
                        </button>
                        <button
                          onClick={() => handleLoadRequestedSong(don.songRequest!, 'B')}
                          className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/30 text-[10px] font-bold transition-colors whitespace-nowrap"
                          title="Load requested track to Deck B"
                        >
                          Load B
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => engine.triggerDonationShoutout(don.id)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap"
                      title="Flash Shoutout Banner on Stream Overlay + Play Cash Drop"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{don.shoutedOut ? 'Replay Alert' : 'Shoutout Alert'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* RIGHT COLUMN: TIKTOK LIVE SUBSCRIPTIONS & SUPER FAN VIP TIERS       */}
      {/* =================================================================== */}
      <div className="bg-slate-900/95 rounded-2xl border border-amber-500/30 p-4 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: 'linear-gradient(90deg, #f59e0b 0%, #ffffff 50%, #ef4444 100%)',
          }}
        />

        {/* Header & Subscriber Goal Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide text-white">
                TikTok LIVE Subscriptions &amp; Super Fans
              </h3>
              <p className="text-[11px] text-slate-400">
                100-Spoke VIP Tiers · Custom Sub Badges · Gifted Sub Alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-right">
              <div className="text-[9px] font-mono text-slate-400">ACTIVE SUBS</div>
              <div className="text-xs font-black font-mono text-amber-400 tabular-nums">
                👑 {tk.subscriberCount} / {tk.subscriberGoal}
              </div>
            </div>
          </div>
        </div>

        {/* Subscriber Goal Bar + Sub Perks Toggles */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>MONTHLY SUBSCRIBER GOAL</span>
            </span>
            <div className="flex items-center gap-1 font-mono text-xs tabular-nums">
              <span className="text-amber-400 font-black">{tk.subscriberCount}</span>
              <span className="text-slate-500">/</span>
              <input
                type="number"
                value={tk.subscriberGoal}
                onChange={(e) => {
                  tk.subscriberGoal = Math.max(10, Number(e.target.value) || 200);
                  engine.notifyUpdate();
                }}
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white text-right font-mono text-xs"
              />
            </div>
          </div>

          <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${subProgressPct}%`,
                background: 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              onClick={() => {
                tk.subOnlyRequests = !tk.subOnlyRequests;
                engine.notifyUpdate();
              }}
              className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-between transition-colors ${
                tk.subOnlyRequests
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>Sub-Only Song Queue</span>
              </span>
              <span className="font-mono text-[10px]">{tk.subOnlyRequests ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={() => {
                tk.autoSubShoutout = !tk.autoSubShoutout;
                engine.notifyUpdate();
              }}
              className={`py-1.5 px-2.5 rounded-lg text-[11px] font-bold border flex items-center justify-between transition-colors ${
                tk.autoSubShoutout
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="flex items-center gap-1">
                <Bell className="w-3 h-3" />
                <span>Auto Klaxon Sub Alert</span>
              </span>
              <span className="font-mono text-[10px]">{tk.autoSubShoutout ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* 3 Lowrider TikTok Subscription Tiers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {tk.subscriptionTiers.map((tier) => (
            <div
              key={tier.id}
              onClick={() => setSubTierId(tier.id)}
              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                subTierId === tier.id
                  ? 'bg-slate-950 border-amber-400 ring-1 ring-amber-400/50'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-[9px] font-mono font-bold text-amber-300 border border-slate-800">
                    {tier.badgeText}
                  </span>
                  <span
                    className="text-xs font-black font-mono tabular-nums"
                    style={{ color: tier.accentColor }}
                  >
                    ${tier.priceMonthly.toFixed(2)}/mo
                  </span>
                </div>
                <div className="text-xs font-black text-white leading-tight">{tier.name}</div>
                <div className="mt-1.5 space-y-0.5">
                  {tier.perks.slice(0, 2).map((perk, i) => (
                    <div
                      key={i}
                      className="text-[10px] text-slate-400 flex items-center gap-1 truncate"
                    >
                      <Check className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                      <span className="truncate">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-500">ACTIVE:</span>
                <span className="text-slate-200 font-bold tabular-nums">
                  {tier.activeSubscribers} subs
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Trigger New Subscriber / Gifted Sub Bomb Form */}
        <form
          onSubmit={handleTriggerSubscription}
          className="p-3 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-amber-400 uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate New Subscriber / Gifted Sub Alert</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              100-Spoke Overlay Banner
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              value={subHandle}
              onChange={(e) => setSubHandle(e.target.value)}
              placeholder="@NewSubscriber"
              className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
            />
            <select
              value={subTierId}
              onChange={(e) =>
                setSubTierId(e.target.value as 'cruiser' | 'chrome_vip' | 'bullet_legend')
              }
              className="h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-amber-300 font-bold"
            >
              <option value="cruiser">🛞 Street Cruiser ($4.99)</option>
              <option value="chrome_vip">👑 100-Spoke VIP ($9.99)</option>
              <option value="bullet_legend">🏆 24K Bullet Legend ($24.99)</option>
            </select>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1}
                max={60}
                value={subMonths}
                onChange={(e) => setSubMonths(Number(e.target.value))}
                className="w-16 h-8 px-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono tabular-nums"
                title="Months Subscribed"
              />
              <span className="text-[10px] font-mono text-slate-400">Months</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={subMessage}
              onChange={(e) => setSubMessage(e.target.value)}
              placeholder="Subscriber stream chat message..."
              className="h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-rose-300 shrink-0">Gifted Subs:</span>
              <input
                type="number"
                min={0}
                max={50}
                value={subGiftedCount}
                onChange={(e) => setSubGiftedCount(Number(e.target.value))}
                className="w-full h-8 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-rose-300 font-mono tabular-nums"
                title="Number of Gifted Subscriptions (0 for regular sub)"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => {
                engine.addSubscription({
                  subHandle: '@GoldDaytons_OG',
                  tierId: 'chrome_vip',
                  months: 6,
                  isGifted: true,
                  giftedCount: 5,
                  message: 'Gifted 5x 100-Spoke Chrome VIP Subs to the stream!',
                });
              }}
              className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 font-bold text-[11px] transition-colors whitespace-nowrap"
            >
              🎁 Trigger 5x Gifted Sub Bomb
            </button>

            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow-md whitespace-nowrap"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Trigger Sub Alert</span>
            </button>
          </div>
        </form>

        {/* Recent Subscribers Feed */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-slate-300">
            RECENT TIKTOK LIVE SUBSCRIBERS ({tk.subscribers.length})
          </div>
          <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5">
            {tk.subscribers.map((sub) => (
              <div
                key={sub.id}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate">{sub.subHandle}</span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300 shrink-0">
                      {sub.tierName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 tabular-nums shrink-0">
                      {sub.months}mo
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {sub.isGifted && sub.giftedCount ? `🎁 Gifted ${sub.giftedCount}x · ` : ''}
                    {sub.message}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
                  {sub.timestamp}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
