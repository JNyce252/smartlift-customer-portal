// ElevatorHistory — O1 (Service History Timeline).
// See docs/CUSTOMER_PORTAL_FEATURES.md.
//
// Per-elevator full-page timeline showing all events from the unified
// /me/elevator/:id/timeline endpoint. Events are color-coded by type,
// filterable, and exportable to PDF (jsPDF). Compliance-audit oriented.

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Home, LogOut, Download, Filter, Wrench, Shield, AlertCircle, CheckCircle,
  Calendar, Clock, ArrowUpDown, FileText, Sparkles,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

// Visual + label config for each event type. Centralized so PDF + UI match.
const TYPE_CONFIG = {
  install:              { label: 'Installation',          dot: 'bg-purple-500', icon: ArrowUpDown,  textColor: 'text-purple-300' },
  modernization:        { label: 'Modernization',         dot: 'bg-blue-500',   icon: Sparkles,     textColor: 'text-blue-300' },
  inspection_past:      { label: 'Inspection',            dot: 'bg-emerald-500',icon: Shield,       textColor: 'text-emerald-300' },
  inspection_upcoming:  { label: 'Inspection upcoming',   dot: 'bg-amber-500',  icon: Calendar,     textColor: 'text-amber-300' },
  inspection_overdue:   { label: 'Inspection overdue',    dot: 'bg-red-500',    icon: AlertCircle,  textColor: 'text-red-300' },
  maintenance:          { label: 'Maintenance',           dot: 'bg-cyan-500',   icon: Wrench,       textColor: 'text-cyan-300' },
  ticket_created:       { label: 'Service request',       dot: 'bg-orange-500', icon: AlertCircle,  textColor: 'text-orange-300' },
  ticket_completed:     { label: 'Service resolved',      dot: 'bg-green-500',  icon: CheckCircle,  textColor: 'text-green-300' },
  schedule_upcoming:    { label: 'Scheduled',             dot: 'bg-indigo-500', icon: Calendar,     textColor: 'text-indigo-300' },
};

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

const ElevatorHistory = () => {
  const { id } = useParams();
  const { user, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTypes, setActiveTypes] = useState(new Set(Object.keys(TYPE_CONFIG)));

  useEffect(() => {
    let cancelled = false;
    api.getElevatorTimeline(id)
      .then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const filtered = useMemo(() => {
    if (!data?.events) return [];
    return data.events.filter(e => activeTypes.has(e.type));
  }, [data, activeTypes]);

  const toggleType = (t) => {
    const next = new Set(activeTypes);
    if (next.has(t)) next.delete(t); else next.add(t);
    setActiveTypes(next);
  };

  // PDF export — fits a clean compliance-friendly format on letter-size pages.
  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const margin = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;

    const ensureRoom = (h) => {
      if (y + h > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Service History', margin, y);
    y += 22;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const elev = data.elevator;
    const header2 = `${elev?.identifier || `Elevator ${elev?.id}`}` +
      (elev?.manufacturer ? ` — ${elev.manufacturer}${elev.model ? ' ' + elev.model : ''}` : '');
    doc.text(header2, margin, y);
    y += 16;
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} • ${data.event_count} events`, margin, y);
    doc.setTextColor(0);
    y += 22;

    // Events
    for (const e of filtered) {
      ensureRoom(60);
      const cfg = TYPE_CONFIG[e.type] || { label: e.type };
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`${fmtDate(e.date)}  •  ${cfg.label}`, margin, y);
      y += 14;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const titleLines = doc.splitTextToSize(e.title || '', pageWidth - margin * 2);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 13;
      if (e.description) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(80);
        const descLines = doc.splitTextToSize(e.description, pageWidth - margin * 2);
        doc.text(descLines, margin, y);
        y += descLines.length * 12;
        doc.setTextColor(0);
      }
      const meta = e.metadata || {};
      const metaLines = [];
      if (meta.ticket_number)        metaLines.push(`Ticket: ${meta.ticket_number}`);
      if (meta.priority)             metaLines.push(`Priority: ${String(meta.priority).toUpperCase()}`);
      if (meta.status)               metaLines.push(`Status: ${meta.status}`);
      if (meta.technician)           metaLines.push(`Technician: ${meta.technician}`);
      if (meta.assigned_technician)  metaLines.push(`Technician: ${meta.assigned_technician}`);
      if (meta.next_service_date)    metaLines.push(`Next service: ${fmtDate(meta.next_service_date)}`);
      if (meta.scheduled_date)       metaLines.push(`Scheduled: ${fmtDate(meta.scheduled_date)}`);
      if (metaLines.length) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(120);
        const metaText = metaLines.join('  •  ');
        const wrapped = doc.splitTextToSize(metaText, pageWidth - margin * 2);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 11;
        doc.setTextColor(0);
      }
      y += 10;
      // Soft separator
      doc.setDrawColor(220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    const filename = `service-history-${(elev?.identifier || `elevator-${elev?.id}`).toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/customer/elevators" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Home className="w-7 h-7 text-blue-400" />
              <div>
                <h1 className="text-xl font-bold text-white">Service History</h1>
                <p className="text-xs text-gray-400">{user?.name}</p>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <button
                onClick={exportPdf}
                disabled={!data || loading}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" />Export PDF
              </button>
              <button onClick={logout} className="text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
                <LogOut className="w-4 h-4" />Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subject elevator */}
        {data?.elevator && (
          <div className="mb-6 bg-gray-800 border border-gray-700 rounded-xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600/30 border border-blue-500/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <ArrowUpDown className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold">{data.elevator.identifier || `Elevator ${data.elevator.id}`}</h2>
              <p className="text-gray-400 text-sm">
                {[data.elevator.manufacturer, data.elevator.model].filter(Boolean).join(' ') || '—'}
                {data.elevator.status && ` • ${data.elevator.status}`}
                {` • ${data.event_count} events on file`}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Filter chips */}
        {data && data.events.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 items-center">
            <span className="text-gray-400 text-xs flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5" />Filter:
            </span>
            {Object.entries(TYPE_CONFIG).map(([t, cfg]) => {
              const present = data.events.some(e => e.type === t);
              if (!present) return null;
              const active = activeTypes.has(t);
              return (
                <button
                  key={t}
                  onClick={() => toggleType(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                    active
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-transparent border-gray-700 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 align-middle`} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Timeline */}
        {loading ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex items-center gap-3 text-gray-400">
            <Clock className="w-5 h-5 animate-spin" />
            Loading service history…
          </div>
        ) : !data || filtered.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center text-gray-400">
            <FileText className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium">No events to show</p>
            <p className="text-sm mt-1">
              {data?.events?.length ? 'Try widening your filter.' : 'No service history on file yet for this elevator.'}
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[14px] top-1 bottom-1 w-0.5 bg-gray-700" aria-hidden />

            <div className="space-y-4">
              {filtered.map(e => {
                const cfg = TYPE_CONFIG[e.type] || { label: e.type, dot: 'bg-gray-500', icon: Clock, textColor: 'text-gray-300' };
                const Icon = cfg.icon;
                return (
                  <div key={e.id} className="relative pl-12">
                    {/* Dot */}
                    <div className={`absolute left-0 top-2 w-7 h-7 rounded-full ${cfg.dot} flex items-center justify-center ring-4 ring-gray-900`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    {/* Card */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.textColor}`}>{cfg.label}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-400">{fmtDate(e.date)}</span>
                          </div>
                          <h3 className="text-white font-semibold">{e.title}</h3>
                        </div>
                      </div>
                      {e.description && (
                        <p className="text-gray-300 text-sm leading-relaxed mt-1">{e.description}</p>
                      )}
                      {e.metadata && Object.keys(e.metadata).some(k => e.metadata[k]) && (
                        <div className="mt-2 pt-2 border-t border-gray-700/50 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                          {e.metadata.ticket_number   && <span><span className="text-gray-500">Ticket:</span> <span className="text-gray-200 font-mono">{e.metadata.ticket_number}</span></span>}
                          {e.metadata.priority        && <span><span className="text-gray-500">Priority:</span> <span className="text-gray-200">{String(e.metadata.priority).toUpperCase()}</span></span>}
                          {e.metadata.status          && <span><span className="text-gray-500">Status:</span> <span className="text-gray-200">{e.metadata.status}</span></span>}
                          {e.metadata.technician      && <span><span className="text-gray-500">Tech:</span> <span className="text-gray-200">{e.metadata.technician}</span></span>}
                          {e.metadata.assigned_technician && <span><span className="text-gray-500">Tech:</span> <span className="text-gray-200">{e.metadata.assigned_technician}</span></span>}
                          {e.metadata.next_service_date && <span><span className="text-gray-500">Next service:</span> <span className="text-gray-200">{fmtDate(e.metadata.next_service_date)}</span></span>}
                          {e.metadata.scheduled_date  && <span><span className="text-gray-500">Scheduled:</span> <span className="text-gray-200">{fmtDateTime(e.metadata.scheduled_date)}</span></span>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElevatorHistory;
