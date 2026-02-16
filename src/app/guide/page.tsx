'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

function GuideContent() {
  const [activeTab, setActiveTab] = useState<'problem' | 'solution' | 'glossar'>('problem');

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span className="text-2xl">📖</span> Reporting Guide &amp; Glossar
        </h1>
        <p className="text-gray-400 mt-1">
          Einheitliche Datenquellen, korrekte Zeitr&auml;ume und offizielle Meta-Definitionen f&uuml;r alle Projektmanager.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-[#1e1e2e] rounded-xl p-1 border border-gray-700">
        {[
          { id: 'problem' as const, label: 'Das Problem', icon: '⚠️' },
          { id: 'solution' as const, label: 'Die Lösung', icon: '✅' },
          { id: 'glossar' as const, label: 'Kennzahlen-Glossar', icon: '📊' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[#84cc16] text-black'
                : 'text-gray-400 hover:text-white hover:bg-[#2d2d44]'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Das Problem */}
      {activeTab === 'problem' && (
        <div className="space-y-6">
          {/* Hero Problem Statement */}
          <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 rounded-2xl p-8 border border-red-500/30">
            <h2 className="text-2xl font-bold text-red-400 mb-3">Warum unsere Reportings nicht stimmen</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              In 10 Jahren Agenturarbeit haben sich verschiedene Workflows, Vorlagen und Datenquellen vermischt. 
              Jeder PM macht es anders &ndash; das f&uuml;hrt zu <span className="text-red-400 font-semibold">inkonsistenten Zahlen</span> und 
              <span className="text-red-400 font-semibold"> Missverst&auml;ndnissen</span> mit Kunden.
            </p>
          </div>

          {/* Problem 1: Verschiedene Datenquellen */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">1</span>
              Verschiedene Datenquellen = Verschiedene Zahlen
            </h3>
            
            {/* Visual: 3 Sources showing different numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Source 1: Handy App */}
              <div className="bg-[#2d2d44] rounded-xl p-5 border-2 border-red-500/40 relative">
                <div className="absolute -top-3 -right-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">FALSCH</div>
                <div className="text-3xl mb-3">📱</div>
                <h4 className="text-white font-semibold mb-1">Instagram Handy-App</h4>
                <p className="text-gray-500 text-xs mb-3">PM &ouml;ffnet die App am 10. Februar</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Reichweite</span>
                    <span className="text-red-400 font-mono font-bold">12.847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Impressionen</span>
                    <span className="text-red-400 font-mono font-bold">28.391</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Interaktionen</span>
                    <span className="text-red-400 font-mono font-bold">1.203</span>
                  </div>
                </div>
                <div className="mt-3 bg-red-500/10 rounded-lg p-2">
                  <p className="text-red-300 text-[10px]">Zeigt &ldquo;letzte 30 Tage&rdquo; ab Abrufdatum &ndash; nicht den Kalendermonat!</p>
                </div>
              </div>

              {/* Source 2: Business Suite */}
              <div className="bg-[#2d2d44] rounded-xl p-5 border-2 border-orange-500/40 relative">
                <div className="absolute -top-3 -right-3 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">UNGENAU</div>
                <div className="text-3xl mb-3">💼</div>
                <h4 className="text-white font-semibold mb-1">Meta Business Suite</h4>
                <p className="text-gray-500 text-xs mb-3">PM w&auml;hlt &ldquo;Januar&rdquo; im Dashboard</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Reichweite</span>
                    <span className="text-orange-400 font-mono font-bold">11.562</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Impressionen</span>
                    <span className="text-orange-400 font-mono font-bold">25.104</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Interaktionen</span>
                    <span className="text-orange-400 font-mono font-bold">987</span>
                  </div>
                </div>
                <div className="mt-3 bg-orange-500/10 rounded-lg p-2">
                  <p className="text-orange-300 text-[10px]">Mischt organische + bezahlte Daten, andere Berechnungslogik als API</p>
                </div>
              </div>

              {/* Source 3: Graph API */}
              <div className="bg-[#2d2d44] rounded-xl p-5 border-2 border-green-500/40 relative">
                <div className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">KORREKT</div>
                <div className="text-3xl mb-3">⚡</div>
                <h4 className="text-white font-semibold mb-1">Meta Graph API</h4>
                <p className="text-gray-500 text-xs mb-3">SocialDash: Exakt 01.01. &ndash; 31.01.</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Reichweite</span>
                    <span className="text-green-400 font-mono font-bold">10.934</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Impressionen</span>
                    <span className="text-green-400 font-mono font-bold">23.847</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 text-sm">Interaktionen</span>
                    <span className="text-green-400 font-mono font-bold">892</span>
                  </div>
                </div>
                <div className="mt-3 bg-green-500/10 rounded-lg p-2">
                  <p className="text-green-300 text-[10px]">Exakter Kalendermonat, nur organisch, offizielle API-Werte</p>
                </div>
              </div>
            </div>

            <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
              <p className="text-red-300 text-sm font-medium text-center">
                3 Quellen &rarr; 3 verschiedene Zahlen f&uuml;r denselben Monat &rarr; Kunde fragt: &ldquo;Welche Zahl stimmt?&rdquo;
              </p>
            </div>
          </div>

          {/* Problem 2: Zeitpunkt-Problem */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">2</span>
              Das Zeitpunkt-Problem: Wann werden die Daten abgelesen?
            </h3>

            {/* Timeline Visual */}
            <div className="relative bg-[#2d2d44] rounded-xl p-6 overflow-hidden">
              {/* Timeline Line */}
              <div className="absolute top-1/2 left-8 right-8 h-1 bg-gray-600 rounded-full" />
              
              <div className="relative flex justify-between items-center min-h-[200px]">
                {/* Jan 1 */}
                <div className="relative z-10 text-center w-1/5">
                  <div className="w-4 h-4 bg-gray-500 rounded-full mx-auto mb-2 border-2 border-gray-400" />
                  <p className="text-gray-400 text-xs font-mono">01.01.</p>
                  <p className="text-gray-500 text-[10px] mt-1">Monat startet</p>
                </div>

                {/* Jan 15 - Post published */}
                <div className="relative z-10 text-center w-1/5">
                  <div className="w-4 h-4 bg-blue-500 rounded-full mx-auto mb-2 border-2 border-blue-400" />
                  <p className="text-blue-400 text-xs font-mono">15.01.</p>
                  <p className="text-blue-300 text-[10px] mt-1">Post ver&ouml;ffentlicht</p>
                  <div className="mt-2 bg-blue-500/10 rounded px-2 py-1">
                    <p className="text-blue-300 text-[10px]">Reichweite: 500</p>
                  </div>
                </div>

                {/* Jan 31 - Month ends */}
                <div className="relative z-10 text-center w-1/5">
                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-2 border-2 border-green-400" />
                  <p className="text-green-400 text-xs font-mono">31.01.</p>
                  <p className="text-green-300 text-[10px] mt-1">Monat endet</p>
                  <div className="mt-2 bg-green-500/10 rounded px-2 py-1">
                    <p className="text-green-300 text-[10px]">Reichweite: 2.100</p>
                  </div>
                </div>

                {/* Feb 10 - PM reads data */}
                <div className="relative z-10 text-center w-1/5">
                  <div className="w-6 h-6 bg-red-500 rounded-full mx-auto mb-2 border-2 border-red-400 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">!</span>
                  </div>
                  <p className="text-red-400 text-xs font-mono">10.02.</p>
                  <p className="text-red-300 text-[10px] mt-1">PM liest Daten ab</p>
                  <div className="mt-2 bg-red-500/10 rounded px-2 py-1">
                    <p className="text-red-300 text-[10px]">Reichweite: 3.800</p>
                  </div>
                </div>

                {/* Feb 28 */}
                <div className="relative z-10 text-center w-1/5">
                  <div className="w-4 h-4 bg-gray-500 rounded-full mx-auto mb-2 border-2 border-gray-400" />
                  <p className="text-gray-400 text-xs font-mono">28.02.</p>
                  <p className="text-gray-500 text-[10px] mt-1">Noch sp&auml;ter</p>
                  <div className="mt-2 bg-gray-500/10 rounded px-2 py-1">
                    <p className="text-gray-400 text-[10px]">Reichweite: 5.200</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                <h4 className="text-red-400 font-semibold text-sm mb-2">Das passiert aktuell:</h4>
                <ul className="text-gray-300 text-xs space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span> PM erstellt Januar-Report am 10. Februar</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span> Liest Post-Reichweite aus der App: 3.800 (inkl. Februar-Daten!)</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span> Nimmt Gesamt-Reichweite aus Meta: 10.934 (nur Januar)</li>
                  <li className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span> Summe der Post-Reichweiten &gt; Gesamt-Reichweite &rarr; Macht keinen Sinn!</li>
                </ul>
              </div>
              <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                <h4 className="text-green-400 font-semibold text-sm mb-2">So muss es sein:</h4>
                <ul className="text-gray-300 text-xs space-y-1.5">
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Daten werden per API f&uuml;r exakt 01.01. &ndash; 31.01. abgefragt</li>
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Post-Reichweite = nur Reichweite innerhalb des Monats</li>
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Gesamt-Reichweite = Summe aller Tages-Reichweiten im Monat</li>
                  <li className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span> Egal wann der Report erstellt wird &ndash; Zahlen sind immer gleich</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Problem 3: Vermischung organisch/bezahlt */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">3</span>
              Vermischung: Organisch vs. Bezahlt
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Wrong Way */}
              <div className="bg-[#2d2d44] rounded-xl p-5 border border-red-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-red-400 text-xl">✗</span>
                  <h4 className="text-red-400 font-semibold">Business Suite / App</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-[#1e1e2e] rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Reichweite</span>
                      <span className="text-white font-mono">15.000</span>
                    </div>
                    <div className="mt-2 flex gap-1">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: '60%' }} />
                      <div className="h-2 bg-amber-500 rounded-full" style={{ width: '40%' }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-blue-400 text-[10px]">Organisch: 9.000</span>
                      <span className="text-amber-400 text-[10px]">Bezahlt: 6.000</span>
                    </div>
                  </div>
                  <p className="text-red-300 text-xs">
                    Mischt organische + bezahlte Reichweite in einer Zahl. 
                    Wenn der Kunde fragt &ldquo;Wie viel Reichweite hatten wir organisch?&rdquo; &ndash; keine Antwort m&ouml;glich!
                  </p>
                </div>
              </div>

              {/* Right Way */}
              <div className="bg-[#2d2d44] rounded-xl p-5 border border-green-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-green-400 text-xl">✓</span>
                  <h4 className="text-green-400 font-semibold">SocialDash (Graph API)</h4>
                </div>
                <div className="space-y-3">
                  <div className="bg-[#1e1e2e] rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Organische Reichweite</span>
                      <span className="text-green-400 font-mono font-bold">9.000</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Bezahlte Reichweite</span>
                      <span className="text-amber-400 font-mono font-bold">6.000</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-600">
                      <span className="text-gray-400 text-sm">Gesamt-Reichweite</span>
                      <span className="text-white font-mono font-bold">15.000</span>
                    </div>
                  </div>
                  <p className="text-green-300 text-xs">
                    Klare Trennung: Organisch, Bezahlt und Gesamt separat ausgewiesen. 
                    Jede Frage des Kunden sofort beantwortbar!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Problem 4: Verschiedene Vorlagen */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center text-red-400 text-sm font-bold">4</span>
              10 Jahre, 15 Kunden, unz&auml;hlige Vorlagen
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { pm: 'PM Anna', template: 'Google Slides 2019', source: 'Business Suite', color: 'red' },
                { pm: 'PM Max', template: 'PowerPoint alt', source: 'Handy-App', color: 'orange' },
                { pm: 'PM Lisa', template: 'Canva Template', source: 'Creator Studio', color: 'yellow' },
                { pm: 'PM Tom', template: 'Excel + Screenshots', source: 'Meta Insights', color: 'purple' },
              ].map((item, i) => (
                <div key={i} className="bg-[#2d2d44] rounded-lg p-3 border border-gray-600">
                  <p className="text-white text-xs font-semibold mb-1">{item.pm}</p>
                  <p className="text-gray-400 text-[10px]">{item.template}</p>
                  <p className={`text-${item.color}-400 text-[10px] mt-1`}>Quelle: {item.source}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#2d2d44] rounded-xl p-4 text-center">
              <p className="text-gray-300 text-sm">
                Ergebnis: <span className="text-red-400 font-semibold">Jeder Report sieht anders aus</span>, 
                nutzt <span className="text-red-400 font-semibold">andere Kennzahlen</span> und 
                kommt aus <span className="text-red-400 font-semibold">anderen Quellen</span>.
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Der Kunde bemerkt Inkonsistenzen &rarr; Vertrauensverlust &rarr; Nachfragen &rarr; Mehrarbeit
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Die Lösung */}
      {activeTab === 'solution' && (
        <div className="space-y-6">
          {/* Hero Solution */}
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-2xl p-8 border border-green-500/30">
            <h2 className="text-2xl font-bold text-green-400 mb-3">Die L&ouml;sung: Eine Quelle der Wahrheit</h2>
            <p className="text-gray-300 text-lg leading-relaxed">
              <span className="text-green-400 font-semibold">SocialDash</span> nutzt ausschlie&szlig;lich die 
              <span className="text-green-400 font-semibold"> Meta Graph API</span> als einzige Datenquelle. 
              Alle Daten werden automatisch f&uuml;r den exakten Kalendermonat abgefragt &ndash; 
              unabh&auml;ngig davon, wann der Report erstellt wird.
            </p>
          </div>

          {/* Flow Diagram */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6 text-center">Der neue Workflow</h3>
            
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              {/* Step 1 */}
              <div className="bg-[#2d2d44] rounded-xl p-5 text-center w-full md:w-48 border border-green-500/30">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">⚡</span>
                </div>
                <h4 className="text-green-400 font-semibold text-sm mb-1">Meta Graph API</h4>
                <p className="text-gray-400 text-[10px]">Einzige Datenquelle<br/>Exakter Zeitraum</p>
              </div>

              <div className="text-green-500 text-2xl hidden md:block">&rarr;</div>
              <div className="text-green-500 text-2xl md:hidden">&darr;</div>

              {/* Step 2 */}
              <div className="bg-[#2d2d44] rounded-xl p-5 text-center w-full md:w-48 border border-blue-500/30">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">🗄️</span>
                </div>
                <h4 className="text-blue-400 font-semibold text-sm mb-1">SocialDash DB</h4>
                <p className="text-gray-400 text-[10px]">Daten gespeichert<br/>Historisch verf&uuml;gbar</p>
              </div>

              <div className="text-green-500 text-2xl hidden md:block">&rarr;</div>
              <div className="text-green-500 text-2xl md:hidden">&darr;</div>

              {/* Step 3 */}
              <div className="bg-[#2d2d44] rounded-xl p-5 text-center w-full md:w-48 border border-purple-500/30">
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
                <h4 className="text-purple-400 font-semibold text-sm mb-1">Dashboard</h4>
                <p className="text-gray-400 text-[10px]">Live-Ansicht<br/>Alle Kunden</p>
              </div>

              <div className="text-green-500 text-2xl hidden md:block">&rarr;</div>
              <div className="text-green-500 text-2xl md:hidden">&darr;</div>

              {/* Step 4 */}
              <div className="bg-[#2d2d44] rounded-xl p-5 text-center w-full md:w-48 border border-[#84cc16]/30">
                <div className="w-12 h-12 bg-[#84cc16]/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <h4 className="text-[#84cc16] font-semibold text-sm mb-1">1-Klick Report</h4>
                <p className="text-gray-400 text-[10px]">PPTX generiert<br/>Einheitliches Design</p>
              </div>
            </div>
          </div>

          {/* Rules for PMs */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Goldene Regeln f&uuml;r Projektmanager</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  rule: 'Nur SocialDash als Datenquelle',
                  desc: 'Keine Handy-App, keine Business Suite, kein Creator Studio. Alle Zahlen kommen aus SocialDash.',
                  icon: '1️⃣',
                },
                {
                  rule: 'Reports nur über SocialDash generieren',
                  desc: 'Klick auf Reports → Kunde wählen → Monat wählen → Generieren. Fertig.',
                  icon: '2️⃣',
                },
                {
                  rule: 'Keine manuellen Zahlen-Korrekturen',
                  desc: 'Wenn eine Zahl falsch aussieht → Thomas melden. Nicht selbst "korrigieren".',
                  icon: '3️⃣',
                },
                {
                  rule: 'Zeitraum = Kalendermonat',
                  desc: 'Januar = 01.01. bis 31.01. Nicht "letzte 30 Tage" und nicht "seit letztem Report".',
                  icon: '4️⃣',
                },
                {
                  rule: 'Organisch ≠ Bezahlt ≠ Gesamt',
                  desc: 'Immer klar trennen. Nie organische und bezahlte Reichweite in einer Zahl mischen.',
                  icon: '5️⃣',
                },
                {
                  rule: 'Bei Fragen → Glossar checken',
                  desc: 'Jede Kennzahl ist im Glossar-Tab mit offizieller Meta-Definition erklärt.',
                  icon: '6️⃣',
                },
              ].map((item, i) => (
                <div key={i} className="bg-[#2d2d44] rounded-xl p-4 border border-gray-600">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <h4 className="text-white font-semibold text-sm mb-1">{item.rule}</h4>
                      <p className="text-gray-400 text-xs">{item.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Before/After Comparison */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 text-center">Vorher vs. Nachher</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-500/5 rounded-xl p-5 border border-red-500/20">
                <h4 className="text-red-400 font-bold text-center mb-4">VORHER</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> 4+ verschiedene Datenquellen</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> Jeder PM eigene Vorlage</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> Daten manuell ablesen &amp; eintippen</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> Zeitr&auml;ume unklar / vermischt</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> Organisch + Bezahlt gemischt</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> 2&ndash;4 Stunden pro Report</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-red-400">✗</span> Kundenr&uuml;ckfragen &amp; Korrekturen</div>
                </div>
              </div>

              <div className="bg-green-500/5 rounded-xl p-5 border border-green-500/20">
                <h4 className="text-green-400 font-bold text-center mb-4">NACHHER (SocialDash)</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> 1 Datenquelle: Meta Graph API</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> 1 einheitliche Vorlage (famefact CI)</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> Automatisch generiert per Klick</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> Exakter Kalendermonat</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> Organisch &amp; Bezahlt getrennt</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> 30 Sekunden pro Report</div>
                  <div className="flex items-center gap-2 text-gray-300"><span className="text-green-400">✓</span> Konsistente, nachvollziehbare Daten</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Kennzahlen-Glossar */}
      {activeTab === 'glossar' && (
        <div className="space-y-6">
          {/* Intro */}
          <div className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded-2xl p-6 border border-blue-500/30">
            <h2 className="text-xl font-bold text-blue-400 mb-2">Offizielle Meta-Kennzahlen</h2>
            <p className="text-gray-300 text-sm">
              Alle Definitionen basieren auf der <span className="text-blue-400">Meta Graph API v21.0</span>. 
              Dies sind die exakten Metriken die SocialDash verwendet &ndash; keine Business Suite, keine App-Werte.
            </p>
          </div>

          {/* Facebook Page Metrics */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📘</span> Facebook Page Insights
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Kennzahl</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">API-Metrik</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Definition</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Hinweis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { name: 'Seitenreichweite', api: 'page_impressions_unique', def: 'Anzahl der Personen, die Inhalte von oder über die Seite gesehen haben. Unique pro Person.', note: 'Nur organisch. Bezahlte Reichweite separat über Ads API.' },
                    { name: 'Impressionen', api: 'page_impressions', def: 'Gesamtanzahl der Aufrufe aller Inhalte der Seite. Eine Person kann mehrfach zählen.', note: 'Impressionen ≥ Reichweite (immer).' },
                    { name: 'Post-Reichweite', api: 'post_impressions_unique', def: 'Anzahl der Personen, die einen bestimmten Post gesehen haben.', note: 'Lifetime-Wert: Wächst auch nach dem Berichtsmonat weiter.' },
                    { name: 'Post-Impressionen', api: 'post_impressions', def: 'Gesamtanzahl der Aufrufe eines bestimmten Posts (inkl. Mehrfachaufrufe).', note: 'Organisch + Bezahlt zusammen, wenn nicht gefiltert.' },
                    { name: 'Interaktionen', api: 'post_reactions + comments + shares', def: 'Summe aus Reaktionen (Like, Love, Haha, Wow, Sad, Angry), Kommentaren und Shares.', note: 'Klicks auf "Mehr anzeigen" zählen NICHT.' },
                    { name: 'Engagement Rate', api: 'Berechnet', def: '(Interaktionen ÷ Reichweite) × 100. Zeigt wie aktiv die erreichten Personen interagieren.', note: 'SocialDash berechnet: Interaktionen / Reichweite.' },
                    { name: 'Follower (Netto)', api: 'page_follows − page_unfollows', def: 'Neue Follower minus verlorene Follower im Zeitraum. Zeigt das Netto-Wachstum.', note: 'Nicht zu verwechseln mit "Gefällt mir"-Angaben.' },
                    { name: 'Videoaufrufe', api: 'post_video_views', def: 'Anzahl der Aufrufe eines Videos für mindestens 3 Sekunden.', note: 'Meta zählt ab 3 Sek. als "View".' },
                    { name: 'Link-Klicks', api: 'post_clicks_by_type (link clicks)', def: 'Klicks auf Links im Post (URL, CTA-Button).', note: 'Nur echte Link-Klicks, keine Foto-Klicks.' },
                  ].map((m, i) => (
                    <tr key={i} className="hover:bg-[#2d2d44]/50">
                      <td className="py-3 px-3 text-white font-medium">{m.name}</td>
                      <td className="py-3 px-3"><code className="text-blue-400 text-xs bg-blue-500/10 px-1.5 py-0.5 rounded">{m.api}</code></td>
                      <td className="py-3 px-3 text-gray-300">{m.def}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Instagram Metrics */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📸</span> Instagram Insights
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Kennzahl</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">API-Metrik</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Definition</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Hinweis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { name: 'Reichweite', api: 'reach', def: 'Anzahl der einzigartigen Accounts, die den Post/Story/Reel gesehen haben.', note: 'Unique pro Account, nicht pro Aufruf.' },
                    { name: 'Impressionen', api: 'impressions', def: 'Gesamtanzahl der Aufrufe. Ein Account kann mehrfach zählen.', note: 'Bei Reels: "Plays" statt "Impressions".' },
                    { name: 'Likes', api: 'likes', def: 'Anzahl der Likes auf den Post.', note: 'Nur Likes, keine anderen Reaktionen.' },
                    { name: 'Kommentare', api: 'comments', def: 'Anzahl der Kommentare auf den Post.', note: 'Inkl. Antworten auf Kommentare.' },
                    { name: 'Saves', api: 'saved', def: 'Anzahl der Speicherungen des Posts durch Nutzer.', note: 'Wichtiger Algorithmus-Signal!' },
                    { name: 'Shares', api: 'shares', def: 'Anzahl der Weiterleitungen/Shares des Posts.', note: 'DMs + Story-Shares + Link-Shares.' },
                    { name: 'Interaktionen', api: 'likes + comments + saved + shares', def: 'Summe aus Likes, Kommentaren, Saves und Shares.', note: 'SocialDash addiert alle 4 Werte.' },
                    { name: 'Engagement Rate', api: 'Berechnet', def: '(Interaktionen ÷ Reichweite) × 100.', note: 'Alternativ: Interaktionen / Follower.' },
                    { name: 'Follower (Netto)', api: 'follower_count Differenz', def: 'Follower am Monatsende minus Follower am Monatsanfang.', note: 'Tägliche Snapshots für genaue Berechnung.' },
                    { name: 'Story-Reichweite', api: 'reach (story)', def: 'Einzigartige Accounts die die Story gesehen haben.', note: 'Nur 24h verfügbar, danach Archiv.' },
                    { name: 'Reel-Plays', api: 'plays', def: 'Anzahl der Reel-Wiedergaben (ab 1 Millisekunde).', note: 'Nicht zu verwechseln mit Reichweite!' },
                    { name: 'Profil-Aufrufe', api: 'profile_views', def: 'Anzahl der Besuche auf dem Instagram-Profil.', note: 'Nur für Business/Creator Accounts.' },
                  ].map((m, i) => (
                    <tr key={i} className="hover:bg-[#2d2d44]/50">
                      <td className="py-3 px-3 text-white font-medium">{m.name}</td>
                      <td className="py-3 px-3"><code className="text-pink-400 text-xs bg-pink-500/10 px-1.5 py-0.5 rounded">{m.api}</code></td>
                      <td className="py-3 px-3 text-gray-300">{m.def}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paid Ads Metrics */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📣</span> Paid Ads (Meta Marketing API)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Kennzahl</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">API-Metrik</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Definition</th>
                    <th className="text-left py-3 px-3 text-gray-400 font-medium">Hinweis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {[
                    { name: 'Ausgaben (Spend)', api: 'spend', def: 'Gesamtbetrag in EUR der für die Kampagne ausgegeben wurde.', note: 'Netto-Betrag ohne MwSt.' },
                    { name: 'Impressionen', api: 'impressions', def: 'Anzahl der Einblendungen der Anzeige.', note: 'Jede Einblendung zählt, auch Mehrfach.' },
                    { name: 'Reichweite', api: 'reach', def: 'Anzahl der einzigartigen Personen die die Anzeige gesehen haben.', note: 'Unique pro Person.' },
                    { name: 'Klicks', api: 'clicks', def: 'Alle Klicks auf die Anzeige (Link, Bild, CTA, Profil).', note: 'Nicht nur Link-Klicks!' },
                    { name: 'Link-Klicks', api: 'actions[link_click]', def: 'Nur Klicks auf den Link/CTA der Anzeige.', note: 'Subset von "Klicks".' },
                    { name: 'CTR', api: 'ctr', def: '(Klicks ÷ Impressionen) × 100. Click-Through-Rate.', note: 'Benchmark: 0.5–1.5% (Feed).' },
                    { name: 'CPC', api: 'cpc', def: 'Kosten pro Klick = Spend ÷ Klicks.', note: 'Benchmark: 0.20–1.00 EUR.' },
                    { name: 'CPM', api: 'cpm', def: 'Kosten pro 1.000 Impressionen = (Spend ÷ Impressionen) × 1.000.', note: 'Benchmark: 5–15 EUR.' },
                    { name: 'Frequenz', api: 'frequency', def: 'Durchschnittliche Anzahl wie oft eine Person die Anzeige gesehen hat.', note: 'Impressionen ÷ Reichweite.' },
                    { name: 'Videoaufrufe (3s)', api: 'video_3s_views', def: 'Anzahl der Videoaufrufe für mindestens 3 Sekunden.', note: 'Standard-Metrik für Video-Ads.' },
                    { name: 'ThruPlays', api: 'video_thruplay_actions', def: 'Videoaufrufe bis zum Ende oder mindestens 15 Sekunden.', note: 'Qualitäts-Metrik für Video-Ads.' },
                  ].map((m, i) => (
                    <tr key={i} className="hover:bg-[#2d2d44]/50">
                      <td className="py-3 px-3 text-white font-medium">{m.name}</td>
                      <td className="py-3 px-3"><code className="text-amber-400 text-xs bg-amber-500/10 px-1.5 py-0.5 rounded">{m.api}</code></td>
                      <td className="py-3 px-3 text-gray-300">{m.def}</td>
                      <td className="py-3 px-3 text-gray-500 text-xs">{m.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Common Confusion */}
          <div className="bg-[#1e1e2e] rounded-2xl p-6 border border-gray-700">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-xl">⚠️</span> H&auml;ufige Verwechslungen
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  wrong: 'Reichweite = Impressionen',
                  right: 'Reichweite = Unique Personen, Impressionen = Alle Aufrufe (inkl. Mehrfach)',
                },
                {
                  wrong: 'Follower = Likes der Seite',
                  right: 'Follower = Personen die folgen, Likes = Personen die "Gefällt mir" geklickt haben (veraltet)',
                },
                {
                  wrong: 'Klicks = Link-Klicks',
                  right: 'Klicks = Alle Klicks (Bild, Profil, Link), Link-Klicks = Nur Klicks auf den Link',
                },
                {
                  wrong: 'Engagement Rate immer gleich berechnet',
                  right: 'Es gibt verschiedene Formeln: Interaktionen/Reichweite vs. Interaktionen/Follower. SocialDash nutzt /Reichweite.',
                },
                {
                  wrong: 'Post-Reichweite addieren = Seiten-Reichweite',
                  right: 'FALSCH! Dieselbe Person kann mehrere Posts sehen. Seiten-Reichweite ist dedupliziert.',
                },
                {
                  wrong: 'Business Suite = Graph API',
                  right: 'Business Suite zeigt oft andere Werte (Sampling, andere Zeiträume, gerundete Zahlen).',
                },
              ].map((item, i) => (
                <div key={i} className="bg-[#2d2d44] rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-red-400 text-sm mt-0.5">✗</span>
                    <p className="text-red-300 text-sm line-through">{item.wrong}</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-400 text-sm mt-0.5">✓</span>
                    <p className="text-green-300 text-sm">{item.right}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  return (
    <DashboardLayout>
      <GuideContent />
    </DashboardLayout>
  );
}
